"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  personTarget,
  studentInput,
  studentDeleteTarget,
  peopleCopy as copy,
  type PeopleAction,
  type StudentDeleteTarget,
} from "@/lib/admin-people";
import { purgeToken, purgeCopy } from "@/lib/admin-record-purge";
import { listPastBatchOptions } from "@/server/admin/people";
import { listBatchCourseOptions } from "@/server/admin/catalog";
import { adminPaths } from "@/lib/admin-navigation";
import { requireStaff, requireSuperAdmin } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

export const saveStudent: PeopleAction = async (target, _previous, form) => {
  const staff = await requireStaff("students:edit");
  const selected = personTarget.safeParse(target);
  if (!selected.success) return { message: copy.failed };
  const data = studentInput.safeParse(Object.fromEntries(form));
  const operation = selected.data.operation;
  if ((operation === "create" || operation === "edit") && !data.success) {
    return {
      message:
        data.error.issues.find(
          (issue) => issue.path.includes("phone") || issue.path.includes("email")
        )?.message ?? copy.invalid,
    };
  }
  const profile = data.data;
  const { data: result, error } = await createSupabaseAdminClient().rpc("manage_staff_student", {
    p_actor: staff.userId,
    p_operation: operation,
    p_id: operation === "create" ? null : selected.data.id,
    p_revision: operation === "create" ? null : selected.data.revision,
    p_name: profile?.fullName ?? null,
    p_email: profile?.email ?? null,
    p_phone: profile?.phone ?? null,
    p_university: profile?.university ?? null,
    p_course: null,
    p_batch: null,
    p_completed: null,
  });
  if (result === "STALE") return { message: copy.stale };
  if (result === "DUPLICATE") return { message: copy.duplicate };
  if (result === "ALREADY_RECORDED") return { message: copy.recorded };
  if (error || result !== "OK") return { message: copy.failed };
  revalidatePath(adminPaths.studentDirectory);
  return { success: true };
};

export const deleteStudent: PeopleAction<StudentDeleteTarget> = async (target, _previous, form) => {
  const staff = await requireSuperAdmin("enrollments:manage");
  const selected = studentDeleteTarget.safeParse(target);
  if (!selected.success) return { message: copy.deleteStudentFailed };

  const confirmation = z.string().trim().max(160).email().safeParse(form.get("confirmation"));
  if (!confirmation.success) return { message: copy.deleteStudentMismatch };

  const impact = purgeToken.safeParse(form.get("impactToken"));
  if (!impact.success) return { message: purgeCopy.changed };
  const { data, error } = await createSupabaseAdminClient().rpc("purge_staff_record", {
    p_actor: staff.userId,
    p_kind: "student",
    p_id: selected.data.id,
    p_revision: selected.data.revision,
    p_confirmation: confirmation.data,
    p_impact_token: impact.data,
  });
  if (error?.code === "PGRST202") return { message: copy.deleteStudentSetup };
  if (error) return { message: copy.deleteStudentFailed };
  switch (data) {
    case "IMPACT_CHANGED":
      return { message: purgeCopy.changed };
    case "STALE":
      return { message: copy.stale };
    case "CONFIRMATION_MISMATCH":
      return { message: copy.deleteStudentMismatch };
    case "PAYMENT_PROTECTED":
      return { message: copy.deleteStudentPaymentProtected };
    case "CONTACT_CONFLICT":
      return { message: copy.deleteStudentConflict };
    case "BUSY":
      return { message: copy.deleteStudentBusy };
    case "OK":
      revalidatePath(adminPaths.studentDirectory);
      revalidatePath(adminPaths.admissions);
      revalidatePath(`${adminPaths.admissions}/[id]`, "page");
      return { success: true };
    default:
      return { message: copy.deleteStudentFailed };
  }
};

const courseHistoryTarget = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("add"),
    id: z.string().uuid(),
    courseId: z.string().uuid(),
    batchId: z.string().uuid().nullable(),
  }),
  z.object({
    operation: z.literal("date"),
    id: z.string().uuid(),
    completionId: z.string().uuid(),
    date: z.string().date().nullable(),
  }),
]);

export async function saveCourseHistory(input: z.infer<typeof courseHistoryTarget>) {
  const staff = await requireStaff("students:edit");
  const parsed = courseHistoryTarget.safeParse(input);
  if (!parsed.success) return { message: copy.invalid };
  const entry = parsed.data;
  const { data, error } = await createSupabaseAdminClient().rpc("manage_staff_course_history", {
    p_actor: staff.userId,
    p_student: entry.id,
    p_course: entry.operation === "add" ? entry.courseId : null,
    p_batch: entry.operation === "add" ? entry.batchId : null,
    p_completion: entry.operation === "date" ? entry.completionId : null,
    p_completed: entry.operation === "date" ? entry.date : null,
  });
  if (data === "ALREADY_RECORDED") return { message: copy.recorded };
  if (data === "INVALID_DATE") return { message: copy.invalidCompletionDate };
  if (error || data !== "OK") return { message: copy.courseSaveFailed };
  revalidatePath(adminPaths.studentDirectory);
  return { success: true };
}

export async function loadHistoryCourses() {
  await requireStaff("students:edit");
  return listBatchCourseOptions({ includeArchived: true });
}

export async function loadHistoryBatches(courseId: string) {
  await requireStaff("students:edit");
  const parsed = z.string().uuid().parse(courseId);
  return listPastBatchOptions(parsed);
}
