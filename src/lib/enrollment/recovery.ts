import { z } from "zod";
import { normalizeApplicationRef, normalizeEmail } from "./status";

export const recoveryRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("request"),
    email: z.string().trim().email().max(160).transform(normalizeEmail),
    reference: z
      .string()
      .max(32)
      .transform(normalizeApplicationRef)
      .refine((value) => !value || /^LNA-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/.test(value))
      .default(""),
  }),
  z.object({ action: z.literal("redeem"), token: z.string().regex(/^[a-f0-9]{64}$/) }),
]);
export const recoveryResultSchema = z.object({
  applications: z
    .array(
      z.object({
        reference: z.string(),
        course: z.string(),
        batch: z.string(),
        status: z.enum([
          "application_in_process",
          "pending",
          "confirmed",
          "review_hold",
          "expired",
          "cancelled",
        ]),
        paymentStatus: z.enum([
          "not_required",
          "pending_verification",
          "verified",
          "rejected",
          "review_hold",
        ]),
      })
    )
    .max(20),
});
export type RecoveredApplication = z.infer<typeof recoveryResultSchema>["applications"][number];
export const recoveryNotice =
  "If an application matches that email address, we will send a secure link. Check your inbox and spam folder. You can request another link after 10 minutes.";
export const recoveryStatusLabels: Record<RecoveredApplication["status"], string> = {
  application_in_process: "Application in process",
  pending: "Payment pending",
  confirmed: "Enrollment confirmed",
  review_hold: "Under review",
  expired: "Reservation expired",
  cancelled: "Cancelled",
};
export const recoveryPaymentLabels: Record<RecoveredApplication["paymentStatus"], string> = {
  not_required: "No payment required",
  pending_verification: "Awaiting payment verification",
  verified: "Payment verified",
  rejected: "Payment not verified",
  review_hold: "Payment under review",
};
