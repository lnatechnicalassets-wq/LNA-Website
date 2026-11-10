import { NextResponse, type NextRequest } from "next/server";
import { getEnrollmentConfig } from "@/lib/enrollment/config";
import { normalizeEmail } from "@/lib/enrollment/status";
import { AppError } from "@/lib/errors";
import { getEnrollmentRuntimeConfig } from "@/server/enrollment/config";
import { startEnrollmentCheckout } from "@/server/enrollment/service";
import { consumeRateLimit, extractHashedClientIp } from "@/server/ratelimit/limiter";
import { resolveSafeAppOrigin, verifySameOriginRequest } from "@/server/security/origin";

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
  if (!runtime.submissionEnabled || runtime.checkoutMode === "closed") {
    return NextResponse.json(
      {
        ok: false,
        code: "CHECKOUT_CLOSED",
        message: "Online enrollment is currently closed.",
      },
      { status: 503, headers: noStoreHeaders }
    );
  }

  const hashedIp = extractHashedClientIp(request.headers);
  const ipLimit = await consumeRateLimit("enroll_ip", hashedIp, {
    maxRequests: 15,
    windowSeconds: 900,
  });
  if (!ipLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        message: "Too many enrollment requests. Please wait a few minutes and try again.",
      },
      { status: 429, headers: noStoreHeaders }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, code: "INVALID_JSON", message: "Invalid JSON request body." },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const rawEmail = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const rawCourseId = typeof body.courseId === "string" ? body.courseId.trim() : "";
  if (rawEmail) {
    const emailLimit = await consumeRateLimit("enroll_email", `${rawEmail}:${rawCourseId}`, {
      maxRequests: 8,
      windowSeconds: 900,
    });
    if (!emailLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          code: "RATE_LIMITED",
          message: "Too many attempts for this email address. Please wait before trying again.",
        },
        { status: 429, headers: noStoreHeaders }
      );
    }
  }

  const config = getEnrollmentConfig();
  const programQuestionsSnapshot = config.programQuestions[rawCourseId] ?? [];

  try {
    const result = await startEnrollmentCheckout(body, {
      origin: resolveSafeAppOrigin(request),
      programQuestionsSnapshot,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 200, headers: noStoreHeaders });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { ok: false, code: err.code, message: err.message },
        { status: err.statusCode, headers: noStoreHeaders }
      );
    }
    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "Unable to process your enrollment right now. Please try again shortly.",
      },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
