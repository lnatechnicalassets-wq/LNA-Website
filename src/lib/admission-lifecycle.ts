import { z } from "zod";

const amount = z.string().regex(/^\d+$/);
const snapshot = z.object({
  status: z.string(),
  batch_name: z.string(),
  payable_poisha: amount,
  destination_fee_poisha: amount.optional(),
});
export const admissionManagementSchema = z.object({
  id: z.string().uuid(),
  public_ref: z.string(),
  full_name: z.string(),
  course_title: z.string(),
  batch_name: z.string(),
  revision: z.string().datetime({ offset: true }),
  status: z.string(),
  payment_status: z.string(),
  payable_poisha: amount,
  archived: z.boolean(),
  destinations: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      revision: z.string().datetime({ offset: true }),
      start_date: z.string(),
      fee_poisha: amount,
      remaining: z.number().int().nonnegative().nullable(),
    })
  ),
  history: z.array(
    z.object({
      id: z.string().uuid(),
      action: z.enum(["staff_cancelled_admission", "staff_transferred_admission"]),
      reason: z.string(),
      created_at: z.string(),
      before_state: snapshot,
      after_state: snapshot,
    })
  ),
});
export type AdmissionManagement = z.infer<typeof admissionManagementSchema>;
export const lifecycleInputSchema = z
  .object({
    id: z.string().uuid(),
    revision: z.string().datetime({ offset: true }),
    reason: z.string().trim().min(1).max(500),
    attested: z.literal("yes"),
  })
  .and(
    z.discriminatedUnion("operation", [
      z.object({ operation: z.literal("cancel"), destination: z.literal("") }),
      z.object({
        operation: z.literal("transfer"),
        destination: z
          .string()
          .transform((value) => {
            const [id, revision, extra] = value.split("|");
            return { id, revision, extra };
          })
          .pipe(
            z.object({
              id: z.string().uuid(),
              revision: z.string().datetime({ offset: true }),
              extra: z.undefined(),
            })
          ),
      }),
    ])
  );
export type LifecycleState = { message?: string };
export const lifecycleMessages: Record<string, string> = {
  INVALID: "Check the reason, destination and confirmation.",
  STALE: "The admission changed. Reload this page before continuing.",
  STALE_BATCH: "The destination batch changed. Reload and review its fee and capacity.",
  NOT_FOUND: "This admission is unavailable or archived.",
  NOT_ELIGIBLE: "This admission is no longer eligible for that operation.",
  MANUAL_REVIEW_REQUIRED: "Verify or reject the outstanding manual payment before cancelling.",
  CONFIRMATION_PENDING:
    "Resolve the unsent registration confirmation before changing this admission.",
  PAYMENT_UNRESOLVED:
    "Resolve outstanding payment or refund evidence in Needs Attention before transferring.",
  COMPLETION_PROTECTED:
    "A course completion is recorded for this student. Contact a Super Admin before changing this admission.",
  BATCH_CLOSED: "The selected destination is no longer available.",
  BATCH_FULL: "The selected destination has no available seats.",
  DUPLICATE_ENROLLMENT:
    "An active or unresolved admission already uses this contact in the destination batch.",
  BUSY: "Another operation is updating this admission or batch. Try again.",
};
