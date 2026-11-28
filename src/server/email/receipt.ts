import "server-only";
import { z } from "zod";
import { getOrganizationConfig } from "@/lib/content/organization";
import { renderReceipt } from "./receipt-design.mjs";

const timestamp = z.string().datetime({ offset: true });
const poisha = z.string().regex(/^\d+$/);

export const receiptSchema = z.object({
  receipt_number: z.string().regex(/^LNA-R-[A-Z0-9-]+$/),
  public_ref: z.string(),
  full_name: z.string(),
  course_title: z.string(),
  batch_name: z.string(),
  confirmed_at: timestamp,
  issued_at: timestamp,
  collected_poisha: z.string().regex(/^[1-9]\d*$/),
  base_fee_poisha: poisha.optional(),
  adjustment_poisha: poisha.optional(),
  adjustment_kind: z.enum(["discount", "partial_waiver"]).optional(),
  transaction_id: z.string().min(1).optional(),
  payment_reference: z.string().min(1).optional(),
  payment_method: z.enum(["bkash", "bank_transfer", "cash"]),
  is_test: z.boolean(),
});
export type Receipt = z.infer<typeof receiptSchema>;

export function receiptFilename(receipt: Receipt) {
  return `${receipt.receipt_number}.pdf`;
}

export function renderPaymentReceipt(input: Receipt): Buffer {
  const receipt = receiptSchema.parse(input);
  const organization = getOrganizationConfig();
  const feeBreakdown =
    receipt.base_fee_poisha &&
    receipt.adjustment_poisha &&
    receipt.adjustment_kind &&
    BigInt(receipt.adjustment_poisha) > 0n &&
    BigInt(receipt.base_fee_poisha) - BigInt(receipt.adjustment_poisha) ===
      BigInt(receipt.collected_poisha)
      ? {
          basePoisha: receipt.base_fee_poisha,
          reductionPoisha: receipt.adjustment_poisha,
          label: receipt.adjustment_kind === "partial_waiver" ? "Partial waiver" : "Discount",
        }
      : undefined;

  return Buffer.from(
    renderReceipt({
      receiptNumber: receipt.receipt_number,
      applicationReference: receipt.public_ref,
      studentName: receipt.full_name,
      courseName: receipt.course_title,
      batch: receipt.batch_name,
      confirmedAt: receipt.confirmed_at,
      issuedAt: receipt.issued_at,
      issuerEmail: organization.email,
      issuerDomain: organization.domain,
      paymentMethod: { bkash: "bKash", bank_transfer: "Bank transfer", cash: "Cash" }[
        receipt.payment_method
      ],
      transactionId: receipt.transaction_id,
      paymentReference: receipt.payment_reference,
      collectedPoisha: receipt.collected_poisha,
      feeBreakdown,
      isTest: receipt.is_test,
    })
  );
}
