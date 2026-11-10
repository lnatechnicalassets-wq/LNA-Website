import { NextResponse, type NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import { getEnrollmentRuntimeConfig } from "@/server/enrollment/config";
import { retryEnrollmentCheckout } from "@/server/enrollment/service";
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
      { ok: false, code: "CHECKOUT_CLOSED", message: "Online enrollment is currently closed." },
      { status: 503, headers: noStoreHeaders }
    );
  }

  const hashedIp = extractHashedClientIp(request.headers);
  const ipLimit = await consumeRateLimit("enroll_retry_ip", hashedIp, {
    maxRequests: 15,
    windowSeconds: 900,
  });
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMITED", message: "Too many payment retry attempts." },
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

  try {
    const result = await retryEnrollmentCheckout(body, {
      origin: resolveSafeAppOrigin(request),
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
      { ok: false, code: "INTERNAL_ERROR", message: "Unable to restart bKash checkout right now." },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
