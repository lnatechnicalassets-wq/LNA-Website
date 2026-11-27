import { describe, expect, it } from "vitest";
import { parseStaffPayment } from "./staff-admission-payment";

function payment(kind: string, entries: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    paymentMethod: kind,
    adjustedFee: "7500.00",
    paymentReference: "A",
    attested: "on",
    notify: "on",
    ...entries,
  }))
    form.set(key, value);
  return form;
}
describe("staff admission payment snapshots", () => {
  it.each(["cash", "bkash", "bank_transfer"])(
    "records %s in integer poisha with a one-character reference",
    (kind) => {
      expect(parseStaffPayment(payment(kind, { adjustedFee: "7123.45" }), 750000n)).toMatchObject({
        ok: true,
        payment: {
          kind,
          channel: kind,
          adjustedPoisha: "712345",
          waiverPoisha: "0",
          collectedPoisha: "712345",
          reference: "A",
        },
      });
    }
  );
  it("locks a full waiver to the original fee and records zero collection", () => {
    expect(
      parseStaffPayment(
        payment("full_fee_waiver", { waiverReason: "Approved", adjustedFee: "1" }),
        750000n
      )
    ).toMatchObject({
      ok: true,
      payment: {
        kind: "full_fee_waiver",
        channel: null,
        adjustedPoisha: "750000",
        waiverPoisha: "750000",
        collectedPoisha: "0",
      },
    });
  });
  it("deducts partial waivers and requires a remaining collection channel", () => {
    const form = payment("partial_fee_waiver", {
      waiverAmount: "1000.01",
      waiverReason: "Approved",
      collectionChannel: "cash",
    });
    expect(parseStaffPayment(form, 750000n)).toMatchObject({
      ok: true,
      payment: { channel: "cash", waiverPoisha: "100001", collectedPoisha: "649999" },
    });
    form.set("waiverAmount", "7500");
    expect(parseStaffPayment(form, 750000n)).toMatchObject({
      ok: false,
      fieldErrors: { waiverAmount: expect.any(Array) },
    });
    form.set("waiverAmount", "1000");
    form.delete("collectionChannel");
    expect(parseStaffPayment(form, 750000n)).toMatchObject({
      ok: false,
      fieldErrors: { collectionChannel: expect.any(Array) },
    });
  });
  it("rejects zero paid fees, missing references, invalid amounts and missing attestation", () => {
    for (const entries of [
      { adjustedFee: "0" },
      { adjustedFee: "3.333" },
      { paymentReference: "  " },
      { attested: "" },
    ])
      expect(
        parseStaffPayment(
          payment(
            "cash",
            Object.fromEntries(
              Object.entries(entries).filter(
                (entry): entry is [string, string] => typeof entry[1] === "string"
              )
            )
          ),
          750000n
        ).ok
      ).toBe(false);
  });
  it("free admissions cannot carry a hidden paid collection", () => {
    expect(parseStaffPayment(payment("cash"), 0n)).toMatchObject({
      ok: true,
      payment: { kind: "free", channel: null, reference: null, collectedPoisha: "0" },
    });
  });
});
