"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { enrollmentActionCopy as copy, isDuplicateEnrollmentContact } from "@/lib/admin-admissions";
import { manualAdmissionCopy, manualStudentSchema } from "@/lib/admin-manual-admission";
import { adminEnrollmentsHref, adminPaths } from "@/lib/admin-navigation";
import { purgeToken, purgeCopy } from "@/lib/admin-record-purge";
import { requireStaff, requireSuperAdmin } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

const targetSchema = z.object({
  id: z.string().uuid(),
  revision: z.string().datetime({ offset: true }),
  operation: z.enum(["edit", "archive", "restore", "delete"]),
  returnView: z.enum(["applications", "archived"]).optional(),
});

export async function manageEnrollmentRecord(
  target: z.input<typeof targetSchema>,
  _previous: { message?: string; success?: boolean },
  formData: FormData
): Promise<{ message?: string; success?: boolean }> {
  const selected = targetSchema.safeParse(target);
  const staff =
    selected.success && selected.data.operation === "delete"
      ? await requireSuperAdmin("enrollments:manage")
      : await requireStaff("enrollments:manage");
  if (!selected.success) return { message: copy.failed };

  const { id, revision, operation } = selected.data;
  if (operation === "delete") {
    if (process.env.NODE_ENV === "production")
      return {
        message: "Permanent deletion is disabled. Archive or cancel this admission instead.",
      };
    const confirmation = z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^LNA-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/)
      .safeParse(formData.get("confirmation"));
    if (!confirmation.success) return { message: copy.deleteMismatch };

    const impact = purgeToken.safeParse(formData.get("impactToken"));
    if (!impact.success) return { message: purgeCopy.changed };
    const { data, error } = await createSupabaseAdminClient().rpc("purge_staff_record", {
      p_actor: staff.userId,
      p_kind: "admission",
      p_id: id,
      p_revision: revision,
      p_confirmation: confirmation.data,
      p_impact_token: impact.data,
    });
    if (error?.code === "PGRST202") return { message: copy.deleteSetup };
    if (error) return { message: copy.failed };
    if (data === "STALE") return { message: copy.stale };
    if (data === "IMPACT_CHANGED") return { message: purgeCopy.changed };
    if (data === "CONFIRMATION_MISMATCH") return { message: copy.deleteMismatch };
    if (data === "NOT_FOUND") return { message: copy.missing };
    if (data === "PAYMENT_PROTECTED") return { message: copy.deletePaymentProtected };
    if (data === "BUSY") return { message: copy.deleteBusy };
    if (data === "PROTECTED") return { message: copy.deleteProtected };
    if (data !== "OK") return { message: copy.failed };

    revalidatePath(adminPaths.admissions);
    revalidatePath(`${adminPaths.admissions}/${id}`);
    revalidatePath(adminPaths.studentDirectory);
    if (selected.data.returnView)
      redirect(adminEnrollmentsHref({ view: selected.data.returnView }));
    return { success: true };
  }

  const contact =
    operation === "edit"
      ? manualStudentSchema.safeParse({
          fullName: formData.get("fullName"),
          email: formData.get("email"),
          phone: formData.get("phone"),
        })
      : null;
  if (contact && !contact.success) {
    return { message: contact.error.issues[0]?.message ?? copy.failed };
  }
  if (operation === "edit" && contact?.success) {
    const reason = z.string().trim().min(1).max(500).safeParse(formData.get("reason"));
    if (!reason.success || formData.get("attested") !== "on") {
      return { message: "Enter a reason and confirm you verified the corrected contact details." };
    }
    const { data, error } = await createSupabaseAdminClient().rpc(
      "correct_staff_admission_contact",
      {
        p_actor: staff.userId,
        p_id: id,
        p_revision: revision,
        p_name: contact.data.fullName,
        p_email: contact.data.email,
        p_phone: contact.data.phone,
        p_reason: reason.data,
        p_attested: true,
      }
    );
    if (isDuplicateEnrollmentContact(error) || data === "DUPLICATE")
      return { message: manualAdmissionCopy.duplicate };
    if (data === "STALE") return { message: copy.stale };
    if (data === "STUDENT_CONTACT_FIRST")
      return {
        message:
          "Update the linked student’s contact details in Students first, then correct this admission.",
      };
    if (data === "WORK_IN_PROGRESS")
      return {
        message: "Resolve pending payments and unsent emails before correcting this admission.",
      };
    if (data === "BUSY") return { message: "This record is busy. Refresh and try again." };
    if (error || data !== "OK") return { message: copy.failed };
    revalidatePath(adminPaths.admissions);
    revalidatePath(`${adminPaths.admissions}/${id}`);
    revalidatePath(adminPaths.studentDirectory);
    return { success: true };
  }
  const { data, error } = await createSupabaseAdminClient().rpc("manage_staff_enrollment", {
    p_actor_id: staff.userId,
    p_enrollment_id: id,
    p_expected_updated_at: revision,
    p_operation: operation,
    p_name: null,
    p_email: null,
    p_phone: null,
  });
  if (isDuplicateEnrollmentContact(error)) return { message: manualAdmissionCopy.duplicate };
  if (error) return { message: copy.failed };
  if (data === "STALE") return { message: copy.stale };
  if (data === "EMAIL_LOCKED") return { message: copy.emailLocked };
  if (data !== "OK") return { message: copy.failed };

  revalidatePath(adminPaths.admissions);
  revalidatePath(`${adminPaths.admissions}/${id}`);
  return { success: true };
}
