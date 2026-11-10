import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import { requireStaff } from "@/server/auth/require-staff";
import { reconcilePendingBkashPayments } from "@/server/enrollment/service";
import { parseCurrentServerEnv } from "@/server/env";
import { resolveSafeAppOrigin, verifySameOriginRequest } from "@/server/security/origin";

export const dynamic = "force-dynamic";

function verifyBearerCronSecret(
  authHeader: string | null,
  expectedSecret: string | undefined
): boolean {
  if (!expectedSecret || !authHeader) {
    return false;
  }

  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (!match?.[1]) {
    return false;
  }

  const providedDigest = crypto.createHash("sha256").update(match[1], "utf8").digest();
  const expectedDigest = crypto.createHash("sha256").update(expectedSecret, "utf8").digest();
  return crypto.timingSafeEqual(providedDigest, expectedDigest);
}

async function handleReconcile(request: NextRequest, method: "GET" | "POST") {
  const noStoreHeaders = { "Cache-Control": "no-store" };

  try {
    const env = parseCurrentServerEnv();
    const isCronAuthorized = verifyBearerCronSecret(
      request.headers.get("authorization"),
      env.CRON_SECRET
    );

    if (!isCronAuthorized) {
      if (method === "POST" && !verifySameOriginRequest(request)) {
        return NextResponse.json(
          {
            ok: false,
            code: "CSRF_ORIGIN_MISMATCH",
            message: "Cross-origin requests are not allowed.",
          },
          { status: 403, headers: noStoreHeaders }
        );
      }

      await requireStaff("enrollments:read");
    }

    let publicRef = request.nextUrl.searchParams.get("ref")?.trim() || undefined;

    if (!publicRef && method === "POST") {
      const contentType = request.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        if (body && typeof body.publicRef === "string" && body.publicRef.trim()) {
          publicRef = body.publicRef.trim();
        }
      }
    }

    const summary = await reconcilePendingBkashPayments({
      ...(publicRef ? { publicRef } : {}),
      origin: resolveSafeAppOrigin(request),
    });

    return NextResponse.json({ ok: true, ...summary }, { status: 200, headers: noStoreHeaders });
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
        code: "RECONCILE_FAILED",
        message: "Unable to reconcile pending payments right now.",
      },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleReconcile(request, "GET");
}

export async function POST(request: NextRequest) {
  return handleReconcile(request, "POST");
}
