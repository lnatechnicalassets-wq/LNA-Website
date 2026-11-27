import { bdtStringToPoisha, poishaToTakaString } from "@/lib/money";

export const collectionChannels = ["cash", "bkash", "bank_transfer"] as const;
export const staffPaymentKinds = [
  ...collectionChannels,
  "full_fee_waiver",
  "partial_fee_waiver",
] as const;
export const staffPaymentLabels = {
  cash: "Cash",
  bkash: "bKash Transfer",
  bank_transfer: "Bank Transfer",
  full_fee_waiver: "Full Fee Waiver",
  partial_fee_waiver: "Partial Fee Waiver",
} as const;
type Channel = (typeof collectionChannels)[number];
type Kind = (typeof staffPaymentKinds)[number] | "free";
export type StaffPaymentInput = {
  kind: Kind;
  channel: Channel | null;
  adjustedPoisha: string;
  waiverPoisha: string;
  collectedPoisha: string;
  reference: string | null;
  reason: string | null;
  reuseAck: boolean;
  attested: boolean;
  notify: boolean;
};
export const referenceReuseMessage =
  "This cash or bank reference already exists. Check the receipt before acknowledging and saving again.";
export const studentConflictMessage =
  "An existing student has matching or conflicting contact details. Find the exact student and verify their details before adding another admission.";
export const paymentDuplicateMessage =
  "This bKash transaction ID is already recorded. Do not collect or record this payment again.";
function amount(value: FormDataEntryValue | null): bigint | null {
  if (typeof value !== "string" || !/^\d{1,14}(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const n = bdtStringToPoisha(value);
  return n <= BigInt(Number.MAX_SAFE_INTEGER) ? n : null;
}
export function defaultStaffFee(poisha: string): string {
  return poishaToTakaString(poisha);
}
export function parseStaffPayment(
  form: FormData,
  original: bigint
): { ok: true; payment: StaffPaymentInput } | { ok: false; fieldErrors: Record<string, string[]> } {
  const fail = (field: string, message: string) => ({
    ok: false as const,
    fieldErrors: { [field]: [message] },
  });
  const common = {
    reuseAck: form.get("reuseReference") === "on",
    notify: form.get("notify") === "on",
  };
  if (original === 0n)
    return {
      ok: true,
      payment: {
        ...common,
        kind: "free",
        channel: null,
        adjustedPoisha: "0",
        waiverPoisha: "0",
        collectedPoisha: "0",
        reference: null,
        reason: null,
        attested: false,
      },
    };
  const kind = form.get("paymentMethod") as Kind;
  if (!(staffPaymentKinds as readonly string[]).includes(kind))
    return fail("paymentMethod", "Choose a payment method.");
  const rawRef = form.get("paymentReference");
  const reference = typeof rawRef === "string" ? rawRef.trim().toUpperCase() : "";
  if (!reference || reference.length > 128)
    return fail("paymentReference", "Enter a reference (1 to 128 characters).");
  const waiver = kind === "full_fee_waiver" || kind === "partial_fee_waiver";
  const rawReason = form.get("waiverReason");
  const reason = waiver && typeof rawReason === "string" ? rawReason.trim() : null;
  if (waiver && (!reason || reason.length > 500))
    return fail("waiverReason", "Enter a waiver reason (up to 500 characters).");
  const channel =
    kind === "full_fee_waiver"
      ? null
      : kind === "partial_fee_waiver"
        ? form.get("collectionChannel")
        : kind;
  if (kind !== "full_fee_waiver" && !(collectionChannels as readonly unknown[]).includes(channel))
    return fail("collectionChannel", "Choose how the remaining fee was collected.");
  if (channel === "bkash" && !/^[A-Z0-9]{1,128}$/.test(reference))
    return fail("paymentReference", "Enter the bKash transaction ID.");
  const adjusted = kind === "full_fee_waiver" ? original : amount(form.get("adjustedFee"));
  if (adjusted === null || adjusted <= 0n)
    return fail("adjustedFee", "Enter a positive amount in BDT, with up to two decimal places.");
  const waived =
    kind === "full_fee_waiver"
      ? original
      : kind === "partial_fee_waiver"
        ? amount(form.get("waiverAmount"))
        : 0n;
  if (
    waived === null ||
    (kind === "partial_fee_waiver" && (waived <= 0n || waived >= adjusted || waived >= original))
  )
    return fail(
      "waiverAmount",
      "Enter a positive waiver smaller than the batch fee and adjusted fee."
    );
  if (form.get("attested") !== "on")
    return fail("attested", "Confirm that the money or waiver has been checked before saving.");
  return {
    ok: true,
    payment: {
      ...common,
      kind,
      channel: channel as Channel | null,
      adjustedPoisha: adjusted.toString(),
      waiverPoisha: waived.toString(),
      collectedPoisha: (adjusted - waived).toString(),
      reference,
      reason,
      attested: true,
    },
  };
}
