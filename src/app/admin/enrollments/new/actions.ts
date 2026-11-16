"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { catalogRecordId } from "@/lib/admin-catalog";
import { isDuplicateEnrollmentContact } from "@/lib/admin-admissions";
import {
  manualAdmissionCopy,
  manualAdmissionSchema,
  manualAnswerField,
  manualPaymentSchema,
  manualStudentFields,
  type ManualAdmissionState,
} from "@/lib/admin-manual-admission";
import { adminPaths } from "@/lib/admin-navigation";
import { getEnrollmentConfig } from "@/lib/enrollment/config";
import { AppError } from "@/lib/errors";
import { getManualAdmissionBatch } from "@/server/admin/manual-admission";
import { requireStaff } from "@/server/auth/require-staff";
import { dispatchEmailOutboxById } from "@/server/email/resend";
import { generateSecureEnrollmentReference } from "@/server/enrollment/service";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

const targetSchema = z.object({
  id: catalogRecordId,
  revision: z.string().datetime({ offset: true }),
});
const accepted = z.object({
  ok: z.literal(true),
  enrollment_id: catalogRecordId,
  outbox_id: catalogRecordId.nullable(),
});
const rejected = z.object({
  ok: z.literal(false),
  code: z.string(),
  existing_id: catalogRecordId.optional(),
});
const outcomeSchema = z.discriminatedUnion("ok", [accepted, rejected]);

export async function createManualAdmission(
  _previous: ManualAdmissionState,
  formData: FormData
): Promise<ManualAdmissionState> {
  const staff = await requireStaff("enrollments:create");
  const selected = targetSchema.safeParse({
    id: formData.get("batchId"),
    revision: formData.get("batchRevision"),
  });
  if (!selected.success) return { message: manualAdmissionCopy.batchUnavailable };

  const batch = await getManualAdmissionBatch(selected.data.id).catch((err: unknown) => {
    if (err instanceof AppError && err.code === "ADMIN_CATALOG_UNAVAILABLE") return null;
    throw err;
  });
  if (!batch) return { message: manualAdmissionCopy.batchUnavailable };
  if (!batch.isOpen) return { message: manualAdmissionCopy.batchClosed };
  if (batch.updated_at !== selected.data.revision) return { message: manualAdmissionCopy.stale };

  const questions = getEnrollmentConfig().programQuestions[batch.courses.slug] ?? [];
  const fields = [
    ...manualStudentFields.map(({ name }) => name),
    ...questions.map(({ id }) => manualAnswerField(id)),
  ];
  const input = Object.fromEntries(fields.map((name) => [name, formData.get(name) ?? ""]));
  const saved = manualAdmissionSchema(questions).safeParse(input);
  if (!saved.success) {
    return { message: manualAdmissionCopy.missing, fieldErrors: saved.error.flatten().fieldErrors };
  }

  const payment =
    batch.feePoisha === 0n
      ? null
      : manualPaymentSchema.safeParse({
          paymentMethod: formData.get("paymentMethod"),
          paymentReference: formData.get("paymentReference"),
        });
  if (payment && !payment.success) {
    return {
      message: manualAdmissionCopy.missing,
      fieldErrors: payment.error.flatten().fieldErrors,
    };
  }

  const answers = Object.fromEntries(
    questions.flatMap(({ id }) => {
      const answer = saved.data[manualAnswerField(id)];
      return answer ? [[id, answer]] : [];
    })
  );

  const params = {
    p_actor_id: staff.userId,
    p_batch_id: selected.data.id,
    p_expected_updated_at: selected.data.revision,
    p_public_ref: generateSecureEnrollmentReference(),
    p_full_name: saved.data.fullName,
    p_email: saved.data.email,
    p_phone: saved.data.phone,
    p_answers: answers,
    p_program_questions_snapshot: questions,
  };
  const admin = createSupabaseAdminClient();
  const { data, error } = payment
    ? await admin.rpc("record_staff_manual_enrollment", {
        ...params,
        p_payment_method: payment.data.paymentMethod,
        p_payment_ref: payment.data.paymentReference,
      })
    : await admin.rpc("create_staff_enrollment", params);
  if (error) {
    if (isDuplicateEnrollmentContact(error)) return { message: manualAdmissionCopy.duplicate };
    const code = /^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(error.code) ? error.code : "UNKNOWN";
    console.error("[admin:manual-admission] save failed", { code });
    if (code === "PGRST202") return { message: manualAdmissionCopy.setupRequired };
    if (code === "42501") return { message: manualAdmissionCopy.accessUnavailable };
    return { message: manualAdmissionCopy.failure };
  }
  const result = outcomeSchema.safeParse(data);
  if (!result.success) {
    console.error("[admin:manual-admission] save failed", { code: "INVALID_RPC_RESPONSE" });
    return { message: manualAdmissionCopy.failure };
  }
  if (!result.data.ok) {
    switch (result.data.code) {
      case "DUPLICATE_ENROLLMENT":
        return { message: manualAdmissionCopy.duplicate, existingId: result.data.existing_id };
      case "BATCH_FULL":
        return { message: manualAdmissionCopy.full };
      case "BATCH_CLOSED":
        return { message: manualAdmissionCopy.batchClosed };
      case "BATCH_NOT_FOUND":
        return { message: manualAdmissionCopy.batchUnavailable };
      case "STALE_BATCH":
        return { message: manualAdmissionCopy.stale };
      default:
        return { message: manualAdmissionCopy.failure };
    }
  }

  if (result.data.outbox_id) {
    await dispatchEmailOutboxById(result.data.outbox_id).catch(() => null);
  }
  revalidatePath(adminPaths.admissions);
  redirect(`${adminPaths.admissions}/${result.data.enrollment_id}`);
}
