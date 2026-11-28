import { describe, expect, it } from "vitest";
import { receiptSchema, renderPaymentReceipt, receiptFilename } from "./receipt";

const receipt = {
  receipt_number: "LNA-R-W5A0-0001",
  public_ref: "LNA-W5A0-0001",
  full_name: "A (Student) \\ Test",
  course_title: "MTO Readiness",
  batch_name: "Cohort 1",
  confirmed_at: "2026-11-28T03:00:00Z",
  issued_at: "2026-11-28T18:30:00Z",
  collected_poisha: "750001",
  payment_method: "bkash" as const,
  transaction_id: "VERIFIED-TRX-01",
  is_test: false,
};

function containsPdfText(pdf: Buffer, value: string) {
  expect(pdf.toString("ascii")).toContain(`<${Buffer.from(value, "ascii").toString("hex")}> Tj`);
}

describe("Payment receipt", () => {
  it("always prints the saved Bangladesh issue date separately from confirmation", () => {
    const pdf = renderPaymentReceipt(receipt);
    const text = pdf.toString("ascii");
    expect(pdf.equals(renderPaymentReceipt(receipt))).toBe(true);
    expect(text.startsWith("%PDF-1.7")).toBe(true);
    for (const field of [
      "Receipt issue date",
      "29 Nov 2026",
      "28 Nov 2026, 09:00",
      "bKash TrxID",
      "VERIFIED-TRX-01",
      "BDT 7,500.01",
      "A (Student) \\ Test",
      "info@lnabd.org  |  lnabd.org",
    ]) {
      containsPdfText(pdf, field);
    }
    expect(receiptFilename(receipt)).toBe("LNA-R-W5A0-0001.pdf");
    const xref = Number(/startxref\n(\d+)/.exec(text)?.[1]);
    expect(text.slice(xref, xref + 4)).toBe("xref");
  });

  it("prints a matching partial waiver and labels a staff payment reference separately", () => {
    const pdf = renderPaymentReceipt({
      ...receipt,
      payment_method: "bank_transfer",
      transaction_id: undefined,
      payment_reference: "BANK-REFERENCE",
      base_fee_poisha: "800001",
      adjustment_poisha: "50000",
      adjustment_kind: "partial_waiver",
    });
    for (const field of [
      "Partial waiver",
      "8,000.01",
      "-500.00",
      "Payment reference",
      "BANK-REFERENCE",
    ]) {
      containsPdfText(pdf, field);
    }
  });

  it("keeps the historical test label and rejects zero collection", () => {
    containsPdfText(renderPaymentReceipt({ ...receipt, is_test: true }), "Test Payment Receipt");
    expect(receiptSchema.safeParse({ ...receipt, collected_poisha: "0" }).success).toBe(false);
  });
});
