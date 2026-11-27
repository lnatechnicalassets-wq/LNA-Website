"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminPaths } from "@/lib/admin-navigation";
import {
  claimedPaymentSchema,
  matchesPaymentEnvironment,
  paymentAttentionPath,
  reviewPaymentSchema,
  type AttentionActionState,
} from "@/lib/payment-attention";
import { requireStaff } from "@/server/auth/require-staff";
import { dispatchEmailOutboxById } from "@/server/email/resend";
import { getEnrollmentRuntimeConfig } from "@/server/enrollment/config";
import { getPaymentGatewayClient } from "@/server/payments/bkash";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

function refreshAttention() {
  revalidatePath(paymentAttentionPath);
  revalidatePath(adminPaths.admissions);
}

export async function reviewPaymentException(
  _previous: AttentionActionState,
  form: FormData
): Promise<AttentionActionState> {
  const staff = await requireStaff("enrollments:verify-payment");
  const input = reviewPaymentSchema.safeParse({
    attemptId: form.get("attemptId"),
    evidenceKey: form.get("evidenceKey"),
    note: form.get("note"),
  });
  if (!input.success) return { message: "Enter a review note of 1 to 500 characters." };
  const { data, error } = await createSupabaseAdminClient().rpc("mark_staff_payment_reviewed", {
    p_actor_id: staff.userId,
    p_attempt_id: input.data.attemptId,
    p_evidence_key: input.data.evidenceKey,
    p_note: input.data.note,
  });
  if (error) return { message: "The review could not be saved. Refresh and try again." };
  if (data !== "OK") {
    return { message: "The payment evidence changed or cannot be marked reviewed. Refresh first." };
  }
  refreshAttention();
  return { success: true, message: "Review note recorded. Payment evidence was not changed." };
}

export async function recheckPaymentException(
  _previous: AttentionActionState,
  form: FormData
): Promise<AttentionActionState> {
  const staff = await requireStaff("enrollments:verify-payment");
  const attemptId = z.string().uuid().safeParse(form.get("attemptId"));
  if (!attemptId.success) return { message: "Invalid payment attempt." };
  const runtime = getEnrollmentRuntimeConfig();
  if (runtime.checkoutMode === "closed")
    return { message: "Gateway checks are currently disabled." };
  const admin = createSupabaseAdminClient();
  const owner = randomUUID();
  const { data, error } = await admin.rpc("claim_staff_payment_recheck", {
    p_actor_id: staff.userId,
    p_attempt_id: attemptId.data,
    p_owner: owner,
  });
  if (error) return { message: "Payment recheck is unavailable. Check database setup." };
  const claim = claimedPaymentSchema.safeParse(data);
  if (!claim.success) return { message: "Payment is busy, recent, or unavailable for rechecking." };
  try {
    if (
      !matchesPaymentEnvironment(
        claim.data.payment_id,
        claim.data.sandbox,
        runtime.checkoutMode,
        Boolean(runtime.sandboxPaymentEnabled)
      )
    ) {
      return { message: "This payment belongs to a different gateway environment." };
    }
    // This is a status query only. Never initiate, execute, search arbitrary receipts or refund.
    const result = await getPaymentGatewayClient().queryPaymentStatus(claim.data.payment_id, {
      tranId: claim.data.tran_id,
      amountPoisha: BigInt(claim.data.amount_poisha),
    });
    const { data: saved, error: saveError } = await admin.rpc("finish_staff_payment_recheck", {
      p_actor_id: staff.userId,
      p_attempt_id: attemptId.data,
      p_owner: owner,
      p_result: {
        payment_id: result.paymentId,
        invoice: result.merchantInvoiceNumber,
        trx_id: result.trxId,
        amount_poisha: result.amountPoisha?.toString() ?? null,
        currency: result.currency,
        transaction_status: result.transactionStatus,
        status_code: result.statusCode,
      },
    });
    const parsed = z
      .object({
        status: z.string(),
        enrollment_id: z.string().uuid().optional(),
        outbox_id: z.string().uuid().nullish(),
      })
      .safeParse(saved);
    if (saveError || !parsed.success || ["lease_lost", "invalid"].includes(parsed.data.status)) {
      return { message: "The gateway result could not be saved safely. Recheck later." };
    }
    if (parsed.data.status === "validated" && parsed.data.outbox_id) {
      await dispatchEmailOutboxById(parsed.data.outbox_id).catch(() => null);
    }
    refreshAttention();
    if (parsed.data.enrollment_id)
      revalidatePath(`${adminPaths.admissions}/${parsed.data.enrollment_id}`);
    return {
      success: true,
      message:
        parsed.data.status === "validated" && parsed.data.outbox_id
          ? "Payment verified and enrollment confirmed."
          : "Gateway result recorded. Check the latest evidence and admission status.",
    };
  } catch {
    return {
      message:
        "The payment check did not complete. Do not charge again while payment is uncertain.",
    };
  } finally {
    await admin.rpc("release_bkash_reconciliation", {
      p_attempt_id: attemptId.data,
      p_owner: owner,
    });
  }
}
