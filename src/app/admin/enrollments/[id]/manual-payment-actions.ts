"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isDuplicateEnrollmentContact } from "@/lib/admin-admissions";
import { catalogRecordId } from "@/lib/admin-catalog";
import { manualAdmissionCopy, manualPaymentReviewCopy as copy } from "@/lib/admin-manual-admission";
import { adminPaths } from "@/lib/admin-navigation";
import { bdtStringToPoisha } from "@/lib/money";
import { requireStaff } from "@/server/auth/require-staff";
import { dispatchEmailOutboxById } from "@/server/email/resend";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

const targetSchema = z.object({
  id: catalogRecordId,
  revision: z.string().datetime({ offset: true }),
  stayOnPage: z.boolean().optional(),
});
const decisionSchema = z.enum(["approve", "reject"]);
const amountSchema = z
  .string()
  .trim()
  .regex(/^(?:\d{1,12}|\d{1,3}(?:,\d{3}){1,3})(?:\.\d{1,2})?$/)
  .transform((value) => bdtStringToPoisha(value.replaceAll(",", "")).toString());
const outcomeSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), outbox_id: catalogRecordId.nullable() }),
  z.object({ ok: z.literal(false), code: z.string() }),
]);

const reviewErrors: Partial<Record<string, string>> = {
  AMOUNT_MISMATCH: copy.amountMismatch,
  DUPLICATE_PAYMENT_REFERENCE: copy.duplicateReference,
  BATCH_FULL: manualAdmissionCopy.full,
  BATCH_CLOSED: copy.closed,
  REVIEW_UNAVAILABLE: copy.unavailable,
  STALE_REVIEW: copy.stale,
};

export async function reviewManualPayment(
  target: { id: string; revision: string; stayOnPage?: boolean },
  _previous: { message?: string },
  formData: FormData
): Promise<{ message?: string; success?: boolean }> {
  const staff = await requireStaff("enrollments:verify-payment");
  const selected = targetSchema.safeParse(target);
  const decision = decisionSchema.safeParse(formData.get("decision"));
  if (!selected.success) return { message: copy.unavailable };
  if (!decision.success || formData.get("attestation") !== "yes") {
    return { message: copy.invalidReview };
  }

  const received =
    decision.data === "approve" ? amountSchema.safeParse(formData.get("receivedAmount")) : null;
  if (received && !received.success) return { message: copy.invalidAmount };

  const { data, error } = await createSupabaseAdminClient().rpc("review_staff_manual_payment", {
    p_actor_id: staff.userId,
    p_enrollment_id: selected.data.id,
    p_expected_updated_at: selected.data.revision,
    p_decision: decision.data,
    p_verified_poisha: received?.data ?? null,
  });

  if (isDuplicateEnrollmentContact(error)) return { message: manualAdmissionCopy.duplicate };
  if (error) {
    const code = /^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(error.code) ? error.code : "UNKNOWN";
    console.error("[admin:manual-payment-review] save failed", { code });
    return { message: code === "PGRST202" ? manualAdmissionCopy.setupRequired : copy.failure };
  }
  const result = outcomeSchema.safeParse(data);
  if (!result.success) return { message: copy.failure };
  if (!result.data.ok) {
    return { message: reviewErrors[result.data.code] ?? copy.failure };
  }

  if (result.data.outbox_id) {
    const outboxId = result.data.outbox_id;
    if (process.env.NODE_ENV === "test") await dispatchEmailOutboxById(outboxId).catch(() => null);
    else
      after(async () => {
        await dispatchEmailOutboxById(outboxId).catch(() => null);
      });
  }
  const path = `${adminPaths.admissions}/${selected.data.id}`;
  revalidatePath(adminPaths.admissions);
  revalidatePath(path);
  if (selected.data.stayOnPage) return { success: true };
  redirect(path);
}
