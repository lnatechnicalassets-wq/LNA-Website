import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { requireStaff } from "@/server/auth/require-staff";
import { parseCurrentServerEnv } from "@/server/env";
import { createLiveBkashClientFromEnv, isBkashSandboxV2 } from "@/server/payments/bkash";
import { verifySameOriginRequest } from "@/server/security/origin";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

export const maxDuration = 60;

const requestBody = z.object({ paymentAttemptId: z.string().uuid() });
const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  try {
    const env = parseCurrentServerEnv();
    if (
      env.BKASH_SANDBOX_REFUNDS_ENABLED !== "true" ||
      env.BKASH_CHECKOUT_MODE !== "live" ||
      !isBkashSandboxV2(env.BKASH_BASE_URL, env.BKASH_API_VERSION)
    ) {
      throw new AppError("Sandbox refunds are unavailable.", "BKASH_REFUND_DISABLED", 404);
    }
    if (!verifySameOriginRequest(request)) {
      throw new AppError("Cross-origin requests are not allowed.", "CSRF_ORIGIN_MISMATCH", 403);
    }
    const staff = await requireStaff("enrollments:verify-payment");
    const input = requestBody.safeParse(await request.json().catch(() => null));
    if (!input.success) {
      throw new AppError("A valid payment attempt ID is required.", "INVALID_PAYMENT_ATTEMPT", 400);
    }

    const gateway = createLiveBkashClientFromEnv();
    const admin = createSupabaseAdminClient();
    const { paymentAttemptId } = input.data;
    const { data: attempt, error } = await admin
      .from("payment_attempts")
      .select("id, payment_id, trx_id, validated_amount_poisha::text, currency")
      .eq("id", paymentAttemptId)
      .eq("gateway", "bkash")
      .eq("bkash_sandbox_v2", true)
      .eq("status", "validated")
      .maybeSingle();
    if (error)
      throw new AppError("Unable to load payment attempt.", "BKASH_REFUND_LOOKUP_FAILED", 503);
    if (
      !attempt?.payment_id ||
      !attempt.trx_id ||
      !attempt.validated_amount_poisha ||
      attempt.currency !== "BDT"
    ) {
      throw new AppError(
        "A confirmed sandbox payment is required.",
        "BKASH_REFUND_NOT_ELIGIBLE",
        409
      );
    }

    const amountPoisha = BigInt(attempt.validated_amount_poisha);
    if (amountPoisha <= 0n) {
      throw new AppError("Invalid refund amount.", "BKASH_REFUND_NOT_ELIGIBLE", 409);
    }
    await gateway.verifyAuthentication();
    const { data: claimed, error: claimError } = await admin
      .from("payment_attempts")
      .update({ sandbox_refund_state: "started" })
      .eq("id", paymentAttemptId)
      .eq("status", "validated")
      .eq("bkash_sandbox_v2", true)
      .is("sandbox_refund_state", null)
      .select("id")
      .maybeSingle();
    if (claimError)
      throw new AppError("Unable to reserve refund.", "BKASH_REFUND_CLAIM_FAILED", 503);
    if (!claimed) {
      throw new AppError(
        "A refund has already been requested for this payment.",
        "BKASH_REFUND_DUPLICATE",
        409
      );
    }

    const audit = (action: string, refundTrxId?: string) =>
      admin.from("audit_events").insert({
        actor_role: staff.role,
        actor_id: staff.userId,
        action,
        target_entity: "payment_attempts",
        target_id: paymentAttemptId,
        after_state: refundTrxId ? { refund_trx_id: refundTrxId } : {},
      });

    let result: Awaited<ReturnType<typeof gateway.refundSandboxPayment>>;
    try {
      result = await gateway.refundSandboxPayment(attempt.payment_id, attempt.trx_id, amountPoisha);
    } catch {
      await admin
        .from("payment_attempts")
        .update({ sandbox_refund_state: "unconfirmed" })
        .eq("id", paymentAttemptId)
        .eq("sandbox_refund_state", "started");
      await audit("bkash_sandbox_refund_unconfirmed");
      throw new AppError(
        "Refund could not be confirmed. Check bKash before retrying.",
        "BKASH_REFUND_UNCONFIRMED",
        502
      );
    }

    const { error: storeError } = await admin
      .from("payment_attempts")
      .update({ sandbox_refund_state: "completed", sandbox_refund_trx_id: result.refundTrxId })
      .eq("id", paymentAttemptId)
      .eq("sandbox_refund_state", "started");
    await audit("bkash_sandbox_refund_completed", result.refundTrxId);
    if (storeError) {
      throw new AppError(
        "bKash confirmed the refund, but the local record could not be updated.",
        "BKASH_REFUND_SAVE_FAILED",
        503
      );
    }
    return NextResponse.json({ ok: true, ...result }, { headers });
  } catch (error) {
    const known = error instanceof AppError ? error : null;
    return NextResponse.json(
      {
        ok: false,
        code: known?.code ?? "BKASH_REFUND_FAILED",
        message: known?.message ?? "Sandbox refund failed.",
      },
      { status: known?.statusCode ?? 500, headers }
    );
  }
}
