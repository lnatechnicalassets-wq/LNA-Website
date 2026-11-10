import { NextResponse, type NextRequest } from "next/server";
import { normalizeApplicationRef } from "@/lib/enrollment/status";
import { getEnrollmentRuntimeConfig } from "@/server/enrollment/config";
import { lookupEnrollmentStatus, statusLookupRequestSchema } from "@/server/enrollment/service";
import { consumeRateLimit, extractHashedClientIp } from "@/server/ratelimit/limiter";
import { verifySameOriginRequest } from "@/server/security/origin";

export async function POST(request: NextRequest) {
  const noStoreHeaders = { "Cache-Control": "no-store" };

  if (!verifySameOriginRequest(request)) {
    return NextResponse.json(
      {
        ok: false,
        code: "CSRF_ORIGIN_MISMATCH",
        message: "Cross-origin requests are not allowed.",
      },
      { status: 403, headers: noStoreHeaders }
    );
  }

  const runtime = getEnrollmentRuntimeConfig();
  if (!runtime.statusLookupEnabled) {
    return NextResponse.json(
      {
        ok: false,
        code: "STATUS_LOOKUP_DISABLED",
        message: "Application status lookup is currently disabled.",
      },
      { status: 503, headers: noStoreHeaders }
    );
  }

  const hashedIp = extractHashedClientIp(request.headers);
  const ipLimit = await consumeRateLimit("status_ip", hashedIp, {
    maxRequests: 25,
    windowSeconds: 900,
  });
  if (!ipLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        message: "Too many status lookup attempts. Please wait a few minutes and try again.",
      },
      { status: 429, headers: noStoreHeaders }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "INVALID_JSON", message: "Invalid JSON request body." },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const parsed = statusLookupRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid status lookup input.",
      },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const refLimit = await consumeRateLimit(
    "status_ref",
    `${hashedIp}:${normalizeApplicationRef(parsed.data.applicationId)}`,
    {
      maxRequests: 12,
      windowSeconds: 900,
    }
  );
  if (!refLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        message: "Too many attempts for this Application ID. Please wait before trying again.",
      },
      { status: 429, headers: noStoreHeaders }
    );
  }

  try {
    const result = await lookupEnrollmentStatus(parsed.data);
    return NextResponse.json(
      {
        ok: true,
        found: Boolean(result),
        result: result ?? null,
      },
      { status: 200, headers: noStoreHeaders }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        code: "LOOKUP_FAILED",
        message: "Unable to check application status right now. Please try again shortly.",
      },
      { status: 503, headers: noStoreHeaders }
    );
  }
}
