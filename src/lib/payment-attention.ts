import { z } from "zod";

export const paymentAttentionPath = "/admin/enrollments/attention";
export const paymentAttentionPageSize = 25;
export const attentionQuerySchema = z.object({
  reviewed: z.literal("1").optional().catch(undefined),
  page: z
    .string()
    .regex(/^[1-9][0-9]{0,3}$/)
    .transform(Number)
    .catch(1),
});
export const attentionCheckSchema = z.object({
  transaction_status: z.string(),
  status_code: z.string(),
  payment_id: z.string().nullable(),
  invoice: z.string().nullable(),
  trx_id: z.string().nullable(),
  amount_poisha: z.string().regex(/^\d+$/).nullable(),
  currency: z.string(),
  identity_matches: z.boolean(),
});
const attentionItemSchema = z.object({
  attempt_id: z.string().uuid().nullable(),
  enrollment_id: z.string().uuid(),
  public_ref: z.string(),
  full_name: z.string(),
  enrollment_status: z.string(),
  attempt_status: z.string().nullable(),
  kind: z.enum(["manual_review", "gateway_review", "unresolved_gateway", "sandbox_refund"]),
  amount_poisha: z.string().regex(/^\d+$/),
  reference: z.string().nullable(),
  reason: z.string().nullable(),
  has_payment_id: z.boolean(),
  test_record: z.boolean(),
  last_check: attentionCheckSchema.nullable(),
  checked_at: z.string().nullable(),
  evidence_key: z.string().nullable(),
  review_note: z.string().nullable(),
  reviewed_at: z.string().nullable(),
  reviewed: z.boolean(),
});
export const attentionListSchema = z.object({
  items: z.array(attentionItemSchema),
  total: z.number().int().nonnegative(),
});
export type AttentionItem = z.infer<typeof attentionItemSchema>;
export type AttentionActionState = { message?: string; success?: boolean };
export const reviewPaymentSchema = z.object({
  attemptId: z.string().uuid(),
  evidenceKey: z.string().regex(/^[a-f0-9]{32}$/),
  note: z.string().trim().min(1).max(500),
});
export const claimedPaymentSchema = z.object({
  payment_id: z.string().min(4).max(128),
  tran_id: z.string().min(8).max(64),
  amount_poisha: z.string().regex(/^[1-9]\d{0,17}$/),
  sandbox: z.boolean(),
});
export function matchesPaymentEnvironment(
  paymentId: string,
  sandbox: boolean,
  mode: "closed" | "mock" | "live",
  sandboxMode: boolean
) {
  if (mode === "closed") return false;
  if (paymentId.startsWith("MOCKPAY-") !== (mode === "mock")) return false;
  return mode === "mock" ? !sandbox : sandbox === sandboxMode;
}
export const attentionLabels: Record<AttentionItem["kind"], string> = {
  manual_review: "Manual payment review",
  gateway_review: "Gateway exception",
  unresolved_gateway: "Unresolved gateway payment",
  sandbox_refund: "Sandbox refund needs review",
};
