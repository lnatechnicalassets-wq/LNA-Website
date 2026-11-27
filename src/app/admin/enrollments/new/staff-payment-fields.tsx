"use client";
import React, { useState } from "react";
import {
  manualAdmissionCopy as copy,
  type ManualAdmissionBatchOption,
  type ManualAdmissionState,
} from "@/lib/admin-manual-admission";
import {
  collectionChannels,
  defaultStaffFee,
  staffPaymentKinds,
  staffPaymentLabels,
} from "@/lib/staff-admission-payment";
import { bdtStringToPoisha, formatPoishaToBDT } from "@/lib/money";

const inputClass =
  "min-h-11 w-full rounded-lg border border-border-default bg-surface-base px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600";
export function StaffPaymentFields({
  batch,
  result,
}: {
  batch: ManualAdmissionBatchOption;
  result: ManualAdmissionState;
}) {
  const original = defaultStaffFee(batch.feePoisha);
  const [kind, setKind] = useState("");
  const [fee, setFee] = useState(original);
  const [waiver, setWaiver] = useState("");
  const [channel, setChannel] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [attested, setAttested] = useState(false);
  const [reuseAck, setReuseAck] = useState(false);
  const full = kind === "full_fee_waiver";
  const partial = kind === "partial_fee_waiver";
  const rail = partial ? channel : kind;
  let collected: string | null = null;
  try {
    const n = full ? 0n : bdtStringToPoisha(fee) - (partial ? bdtStringToPoisha(waiver) : 0n);
    if (n >= 0n) collected = formatPoishaToBDT(n);
  } catch {
    /* incomplete inputs are handled by validation */
  }
  const error = (name: string) =>
    result.fieldErrors?.[name]?.[0] ? (
      <p className="text-sm text-status-danger-text">{result.fieldErrors[name]?.[0]}</p>
    ) : null;
  return (
    <section
      className="space-y-4 rounded-xl border border-border-subtle bg-surface-card p-4 sm:p-6"
      aria-labelledby="admission-payment-heading"
    >
      <h2 id="admission-payment-heading" className="font-semibold text-primary-900">
        {copy.paymentDetails}
      </h2>
      {!batch.isFree && (
        <>
          <label className="block space-y-1 text-sm font-medium" htmlFor="paymentMethod">
            {copy.paymentMethod}
          </label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            className={inputClass}
            value={kind}
            required
            onChange={(e) => {
              const next = e.target.value;
              setKind(next);
              setFee(original);
              setWaiver("");
              setChannel("");
              setReason("");
              setReference("");
              setAttested(false);
              setReuseAck(false);
              setNotify(!next.endsWith("_waiver"));
            }}
          >
            <option value="">{copy.choosePaymentMethod}</option>
            {staffPaymentKinds.map((method) => (
              <option key={method} value={method}>
                {staffPaymentLabels[method]}
              </option>
            ))}
          </select>
          {error("paymentMethod")}
          {kind && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="adjustedFee" className="block text-sm font-medium">
                    {partial ? "Adjusted fee before waiver (BDT)" : "Individual fee (BDT)"}
                  </label>
                  <input
                    id="adjustedFee"
                    name="adjustedFee"
                    className={inputClass}
                    inputMode="decimal"
                    value={fee}
                    readOnly={full}
                    required
                    onChange={(e) => {
                      setFee(e.target.value);
                      setAttested(false);
                    }}
                  />
                  {error("adjustedFee")}
                </div>
                {partial && (
                  <div className="space-y-1">
                    <label htmlFor="waiverAmount" className="block text-sm font-medium">
                      Waiver amount (BDT)
                    </label>
                    <input
                      id="waiverAmount"
                      name="waiverAmount"
                      inputMode="decimal"
                      className={inputClass}
                      value={waiver}
                      required
                      onChange={(e) => {
                        setWaiver(e.target.value);
                        setAttested(false);
                      }}
                    />
                    {error("waiverAmount")}
                  </div>
                )}
                {partial && (
                  <div className="space-y-1">
                    <label htmlFor="collectionChannel" className="block text-sm font-medium">
                      Remaining fee collected by
                    </label>
                    <select
                      id="collectionChannel"
                      name="collectionChannel"
                      className={inputClass}
                      value={channel}
                      required
                      onChange={(e) => {
                        setChannel(e.target.value);
                        setReference("");
                        setReuseAck(false);
                        setAttested(false);
                      }}
                    >
                      <option value="">Select a method</option>
                      {collectionChannels.map((method) => (
                        <option key={method} value={method}>
                          {staffPaymentLabels[method]}
                        </option>
                      ))}
                    </select>
                    {error("collectionChannel")}
                  </div>
                )}
                <div className="space-y-1">
                  <label htmlFor="paymentReference" className="block text-sm font-medium">
                    {rail === "bkash"
                      ? copy.bkashReference
                      : rail === "bank_transfer"
                        ? copy.bankReference
                        : rail === "cash"
                          ? "Cash receipt reference"
                          : "Waiver approval reference"}
                  </label>
                  <input
                    id="paymentReference"
                    name="paymentReference"
                    className={inputClass}
                    value={reference}
                    maxLength={128}
                    required
                    onChange={(e) => {
                      setReference(e.target.value);
                      setReuseAck(false);
                      setAttested(false);
                    }}
                  />
                  {error("paymentReference")}
                </div>
                {(full || partial) && (
                  <div className="space-y-1 sm:col-span-2">
                    <label htmlFor="waiverReason" className="block text-sm font-medium">
                      Waiver reason
                    </label>
                    <textarea
                      id="waiverReason"
                      name="waiverReason"
                      rows={3}
                      className={inputClass}
                      value={reason}
                      maxLength={500}
                      required
                      onChange={(e) => {
                        setReason(e.target.value);
                        setAttested(false);
                      }}
                    />
                    {error("waiverReason")}
                  </div>
                )}
              </div>
              <div className="rounded-lg bg-surface-muted p-3 text-sm">
                <span className="text-text-secondary">Actual collection: </span>
                <strong>{collected ?? "Check the amount"}</strong>
              </div>
              {(rail === "cash" || rail === "bank_transfer") && result.referenceAckRequired && (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="reuseReference"
                    checked={reuseAck}
                    onChange={(e) => setReuseAck(e.target.checked)}
                    required
                  />{" "}
                  I checked the repeated reference and confirm that this is a separate collection.
                </label>
              )}
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="attested"
                  checked={attested}
                  onChange={(e) => setAttested(e.target.checked)}
                  required
                />{" "}
                {full
                  ? "I checked and approved the full fee waiver."
                  : partial
                    ? "I checked the waiver and received the remaining fee."
                    : "I checked that the full recorded amount has been received."}
              </label>
              {error("attested")}
            </>
          )}
        </>
      )}
      {batch.isFree && (
        <p className="text-sm text-text-secondary">No payment is required for this free batch.</p>
      )}
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="notify"
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
        />{" "}
        Send enrollment confirmation email
      </label>
    </section>
  );
}
