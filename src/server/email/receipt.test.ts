import { describe, expect, it } from "vitest";
import { receiptSchema, renderPaymentReceipt, receiptFilename } from "./receipt";
const receipt = {
  receipt_number: "LNA-R-W5A0-0001",
  public_ref: "LNA-W5A0-0001",
  full_name: "A (Student) \\ Test",
  course_title: "MTO Readiness",
  batch_name: "Cohort 1",
  confirmed_at: "2026-11-28T03:00:00Z",
  collected_poisha: "750001",
  payment_method: "cash" as const,
  is_test: false,
};
describe("Payment receipt", () => {
  it("generates deterministic PDF bytes from the original receipt snapshot", () => {
    const pdf = renderPaymentReceipt(receipt);
    const text = pdf.toString("ascii");
    expect(pdf.equals(renderPaymentReceipt(receipt))).toBe(true);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("BDT 7,500.01");
    expect(text).toContain("A \\(Student\\) \\\\ Test");
    expect(receiptFilename(receipt)).toBe("LNA-R-W5A0-0001.pdf");
    const xref = Number(/startxref\n(\d+)/.exec(text)?.[1]);
    expect(text.slice(xref, xref + 4)).toBe("xref");
  });
  it("labels sandbox receipts and rejects zero collection", () => {
    expect(renderPaymentReceipt({ ...receipt, is_test: true }).toString("ascii")).toContain(
      "TEST PAYMENT RECEIPT"
    );
    expect(receiptSchema.safeParse({ ...receipt, collected_poisha: "0" }).success).toBe(false);
  });
});
