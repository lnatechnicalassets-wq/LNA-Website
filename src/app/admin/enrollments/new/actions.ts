"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { catalogRecordId } from "@/lib/admin-catalog";
import { isDuplicateEnrollmentContact } from "@/lib/admin-admissions";
import {
  manualAdmissionCopy,
  manualAdmissionSchema,
  manualAnswerField,
  manualStudentFields,
  type ManualAdmissionState,
} from "@/lib/admin-manual-admission";
import {
  parseStaffPayment,
  paymentDuplicateMessage,
  referenceReuseMessage,
  studentConflictMessage,
} from "@/lib/staff-admission-payment";
import { adminPaths } from "@/lib/admin-navigation";
import {
  matchesQuestionVersion,
  parseQuestionVersionField,
  staleQuestionsMessage,
} from "@/lib/enrollment/program-questions";
import { loadProgramQuestionSets } from "@/server/enrollment/program-questions";
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
  student_id: catalogRecordId.nullable(),
  public_ref: z.string(),
  collected_poisha: z.string().regex(/^\d+$/),
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

  const questionConfig = await loadProgramQuestionSets([batch.courses.slug]).catch(() => null);
  if (!questionConfig) return { message: "Application questions could not be loaded. Try again." };
  const version = questionConfig.programQuestionVersions[batch.courses.slug] ?? 0;
  if (!matchesQuestionVersion(version, parseQuestionVersionField(formData.get("questionVersion"))))
    return { message: staleQuestionsMessage };
  const questions = questionConfig.programQuestions[batch.courses.slug] ?? [];
  const fields = [
    ...manualStudentFields.map(({ name }) => name),
    ...questions.map(({ id }) => manualAnswerField(id)),
  ];
  const input = Object.fromEntries(fields.map((name) => [name, formData.get(name) ?? ""]));
  const saved = manualAdmissionSchema(questions).safeParse(input);
  if (!saved.success) {
    return { message: manualAdmissionCopy.missing, fieldErrors: saved.error.flatten().fieldErrors };
  }

  const parsedPayment = parseStaffPayment(formData, batch.feePoisha);
  if (!parsedPayment.ok)
    return { message: manualAdmissionCopy.missing, fieldErrors: parsedPayment.fieldErrors };
  const payment = parsedPayment.payment;

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
  const { data, error } = await admin.rpc("create_confirmed_staff_admission", {
    ...params,
    p_kind: payment.kind,
    p_channel: payment.channel,
    p_adjusted_poisha: payment.adjustedPoisha,
    p_waiver_poisha: payment.waiverPoisha,
    p_payment_ref: payment.reference,
    p_waiver_reason: payment.reason,
    p_reuse_ack: payment.reuseAck,
    p_attested: payment.attested,
    p_notify: payment.notify,
  });
  if (error) {
    if (error.message === "STALE_APPLICATION_QUESTIONS") return { message: staleQuestionsMessage };
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
      case "DUPLICATE_PAYMENT_REFERENCE":
        return { message: paymentDuplicateMessage };
      case "REFERENCE_ACK_REQUIRED":
        return { message: referenceReuseMessage, referenceAckRequired: true };
      case "STUDENT_CONTACT_CONFLICT":
        return { message: studentConflictMessage };
      case "INVALID_PAYMENT":
      case "INVALID_ADMISSION":
        return { message: manualAdmissionCopy.missing };
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

  let email: "accepted" | "queued" | "not_requested" = "not_requested";
  if (result.data.outbox_id) {
    const outboxId = result.data.outbox_id;
    if (process.env.NODE_ENV === "test") {
      const dispatched = await dispatchEmailOutboxById(outboxId).catch(() => null);
      email = dispatched?.sent && dispatched.mode === "live" ? "accepted" : "queued";
    } else {
      after(async () => {
        await dispatchEmailOutboxById(outboxId).catch(() => null);
      });
      email = "queued";
    }
  }
  revalidatePath(adminPaths.admissions);
  revalidatePath(adminPaths.studentDirectory);
  return {
    success: {
      enrollmentId: result.data.enrollment_id,
      studentId: result.data.student_id,
      reference: result.data.public_ref,
      collectedPoisha: result.data.collected_poisha,
      email,
    },
  };
}
