import { z } from "zod";
import { catalogRecordId } from "./admin-catalog";

export const admissionStatus = z.enum([
  "confirmed",
  "pending",
  "application_in_process",
  "review_hold",
  "expired",
  "cancelled",
]);

const admissionView = z.enum(["applications", "students", "archived"]);
export type AdmissionView = z.infer<typeof admissionView>;

const scopeId = catalogRecordId.or(z.literal("").transform(() => undefined)).optional();

export const admissionQuery = z.object({
  view: admissionView.default("applications").catch("applications"),
  courseId: scopeId,
  batchId: scopeId,
  q: z.string().trim().max(80).catch(""),
  status: admissionStatus.or(z.literal("")).catch(""),
  page: z
    .string()
    .regex(/^[1-9][0-9]{0,3}$/)
    .transform(Number)
    .catch(1),
});

export const enrollmentActionCopy = {
  noRecords: "Submitted applications and students added by staff will appear here.",
  actions: "Actions",
  description: "Review applications, confirm payments, and manage enrollments.",
  more: "More actions",
  applicant: "Applicant",
  program: "Program",
  statusLabel: "Status",
  payment: "Payment",
  devFixture: "Dev fixture",
  statusFilter: "Status filter",
  batchDisabled: "Select course first",
  filter: "Filter",
  reset: "Reset",
  searchApplications: "Search applications",
  searchPlaceholder: "Name, email, phone, or application ID",
  archivedEmpty: "No archived records",
  archivedFilteredEmpty: "No archived records match these filters",
  recordActions: (reference: string) => `More actions for ${reference}`,
  viewDetails: (reference: string, name: string) => `View details for ${reference} (${name})`,
  delete: "Delete permanently",
  deleteButton: "Delete",
  deleteUnavailable: "Permanent deletion is unavailable",
  deletePaymentProtected:
    "This application has a verified or unresolved payment. Archiving keeps its payment history.",
  deleteBusy: "This application is being updated. Try again in a moment.",
  deleted: "Application deleted.",
  missing: "This application is no longer available. Refresh Admissions.",
  deleteDescription: "Check the records below before confirming. You can’t undo this action.",
  deleteMismatch: "Enter the application ID to confirm deletion.",
  deleteProtected: "This record is protected and cannot be permanently deleted.",
  deleteSetup: "Permanent deletion is unavailable until the latest database migration is applied.",
  deleteConfirmation: (reference: string) => `Type ${reference} to confirm`,
  recordRange: (start: number, end: number, total: number) => `${start}–${end} of ${total} records`,
  listCaption: "Enrollment records",
  currentRecords: "Current records",
  recordCount: (count: number) => `${count} ${count === 1 ? "record" : "records"}`,
  legacyDuplicatePhone: "Duplicate phone",
  expectedPayment: "Expected payment",
  reference: (method: string) => `${method} reference`,
  archivedViewDescription:
    "Archived records retain payment and enrollment history and can be restored.",
  confirm: "Confirm",
  edit: "Edit",
  view: "View",
  archive: "Archive",
  restore: "Restore",
  cancel: "Cancel",
  save: "Save changes",
  updateContact: "Update the applicant’s contact details.",
  archiveDescription:
    "Hide this record from active admissions. Its payment and seat status stay as recorded. You can restore it from Archived records.",
  restoreDescription: "Restore this record to the admissions list.",
  confirmDescription: "Check the original payment before confirming the enrollment.",
  saved: "Enrollment record updated.",
  failed: "The enrollment record could not be updated.",
  stale: "This record changed. Refresh it before trying again.",
  emailLocked:
    "The email is locked after checkout starts or enrollment is confirmed. You can still edit the name and phone number.",
} as const;

export function isDuplicateEnrollmentContact(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "23505" &&
    /idx_enrollments_active_batch_(email|phone)\b/.test(error.message ?? "")
  );
}
