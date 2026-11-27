import { after, NextResponse, type NextRequest } from "next/server";
import { recoveryNotice, recoveryRequestSchema } from "@/lib/enrollment/recovery";
import { getEnrollmentRuntimeConfig } from "@/server/enrollment/config";
import { redeemApplicationRecovery, sendApplicationRecovery } from "@/server/enrollment/recovery";
import { consumeRateLimit, extractHashedClientIp } from "@/server/ratelimit/limiter";
import { verifySameOriginRequest } from "@/server/security/origin";

const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
export async function POST(request: NextRequest) {
  if (!verifySameOriginRequest(request)) {
    return NextResponse.json(
      {
        ok: false,
        code: "CSRF_ORIGIN_MISMATCH",
        message: "Cross-origin requests are not allowed.",
      },
      { status: 403, headers }
    );
  }
  const runtime = getEnrollmentRuntimeConfig();
  if (!runtime.statusLookupEnabled || runtime.emailDispatchMode !== "live") {
    return NextResponse.json(
      {
        ok: false,
        code: "STATUS_LOOKUP_DISABLED",
        message: "Application status lookup is currently disabled.",
      },
      { status: 503, headers }
    );
  }
  const limit = await consumeRateLimit(
    "status_recovery_ip",
    extractHashedClientIp(request.headers),
    { maxRequests: 12, windowSeconds: 900 }
  );
  if (!limit.allowed)
    return NextResponse.json(
      { ok: false, code: "RATE_LIMITED", message: "Too many requests. Try again later." },
      { status: 429, headers }
    );
  const parsed = recoveryRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Check your email address or recovery link.",
      },
      { status: 400, headers }
    );
  const input = parsed.data;
  if (input.action === "request") {
    // Identical response for known and unknown addresses; defer all database/provider work.
    after(async () => {
      try {
        await sendApplicationRecovery(input.email, input.reference);
      } catch {
        console.error("[application-recovery] request processing failed");
      }
    });
    return NextResponse.json({ ok: true, message: recoveryNotice }, { status: 202, headers });
  }
  try {
    const applications = await redeemApplicationRecovery(input.token);
    if (!applications?.length)
      return NextResponse.json(
        {
          ok: false,
          code: "RECOVERY_INVALID",
          message: "This link is expired, already used or invalid. Request a new link.",
        },
        { status: 400, headers }
      );
    return NextResponse.json({ ok: true, applications }, { headers });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        code: "LOOKUP_FAILED",
        message: "Unable to check application status right now. Try again later.",
      },
      { status: 503, headers }
    );
  }
}
