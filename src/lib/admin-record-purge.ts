import { z } from "zod";

export const purgeKind = z.enum(["student", "admission"]);
export const purgeToken = z.string().regex(/^[a-f0-9]{32}$/);

export const purgeImpact = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("eligible"),
    token: purgeToken,
    profile: z.enum(["deleted", "kept", "none"]),
    applications: z.number().int().nonnegative(),
    paymentRecords: z.number().int().nonnegative(),
    emailRecords: z.number().int().nonnegative(),
    courseRecords: z.number().int().nonnegative(),
    contactRecords: z.number().int().nonnegative(),
  }),
  z.object({
    status: z.enum(["not_found", "payment_protected", "contact_conflict", "unavailable"]),
  }),
]);

export type PurgeKind = z.infer<typeof purgeKind>;
export type PurgeImpact = z.infer<typeof purgeImpact>;

export const purgeCopy = {
  loading: "Checking what will be deleted…",
  unavailable:
    "Could not check which records would be deleted. Apply the latest database migration or try again.",
  not_found: "This record is no longer available.",
  payment_protected:
    "A verified or unresolved payment prevents permanent deletion. You can archive the record.",
  contact_conflict:
    "One of the applications is associated with another student. Resolve the contact details before deleting.",
  changed: "The linked records changed. Reopen this dialog to review the updated list.",
  removed: "Permanently deleted",
  profile: "Student profile",
  profileKept: "The linked student profile and its other records will be kept.",
  applications: "Applications",
  payments: "Test payment records",
  emails: "Email outbox records",
  courses: "Previous course records",
  contacts: "Student contact records",
} as const;
