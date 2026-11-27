"use client";

import React, { useActionState, useState } from "react";
import { Button } from "@/components/ui";
import type { AdmissionManagement } from "@/lib/admission-lifecycle";
import { formatPoishaToBDT } from "@/lib/money";
import { manageAdmissionLifecycle } from "./actions";

const fieldClass =
  "min-h-11 w-full rounded-lg border border-border-default bg-surface-base px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600";
export function LifecycleForm({ admission }: { admission: AdmissionManagement }) {
  const [operation, setOperation] = useState<"cancel" | "transfer">("cancel");
  const [destinationId, setDestinationId] = useState("");
  const [reason, setReason] = useState("");
  const [attested, setAttested] = useState(false);
  const [state, action, pending] = useActionState(manageAdmissionLifecycle, {});
  const destination = admission.destinations.find((b) => b.id === destinationId);
  const canTransfer =
    admission.status === "confirmed" && admission.destinations.some((b) => b.remaining !== 0);
  return (
    <form
      action={action}
      className="rounded-xl border border-border-subtle bg-surface-card p-4 sm:p-6"
    >
      <fieldset disabled={pending} aria-busy={pending} className="space-y-4">
        <legend className="font-semibold text-primary-900">Change admission</legend>
        <input type="hidden" name="id" value={admission.id} />
        <input type="hidden" name="revision" value={admission.revision} />
        <label className="block space-y-1 text-sm font-medium">
          <span>Operation</span>
          <select
            name="operation"
            className={fieldClass}
            value={operation}
            onChange={(e) => {
              setOperation(e.target.value === "transfer" ? "transfer" : "cancel");
              setAttested(false);
            }}
          >
            <option value="cancel">Cancel admission</option>
            {canTransfer && <option value="transfer">Transfer to another batch</option>}
          </select>
        </label>
        {operation === "transfer" ? (
          <>
            <label className="block space-y-1 text-sm font-medium">
              <span>Destination batch (same course)</span>
              <select
                required
                className={fieldClass}
                value={destinationId}
                onChange={(e) => {
                  setDestinationId(e.target.value);
                  setAttested(false);
                }}
              >
                <option value="">Choose a batch</option>
                {admission.destinations.map((batch) => (
                  <option key={batch.id} value={batch.id} disabled={batch.remaining === 0}>
                    {batch.name} · {batch.start_date} ·{" "}
                    {batch.remaining === 0 ? "Full" : formatPoishaToBDT(batch.fee_poisha)}
                  </option>
                ))}
              </select>
            </label>
            <input
              type="hidden"
              name="destination"
              value={destination ? `${destination.id}|${destination.revision}` : ""}
            />
            {destination && (
              <div className="space-y-1 rounded-lg bg-surface-muted p-3 text-sm">
                <p>Recorded admission fee: {formatPoishaToBDT(admission.payable_poisha)}</p>
                <p>Destination advertised fee: {formatPoishaToBDT(destination.fee_poisha)}</p>
                <p>
                  The original fee, payment and application reference stay unchanged. No new payment
                  or refund is created.
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="rounded-lg bg-surface-muted p-3 text-sm">
            Cancellation releases the seat. Payment records, student history and verified
            collections remain intact. No refund is issued.
          </p>
        )}
        <label className="block space-y-1 text-sm font-medium">
          <span>Reason (required)</span>
          <textarea
            name="reason"
            required
            maxLength={500}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="attested"
            value="yes"
            checked={attested}
            onChange={(e) => setAttested(e.target.checked)}
            required
            className="mt-1 size-4"
          />
          <span>
            I reviewed this change and understand that it does not issue a refund, collect another
            payment or send a new confirmation email.
          </span>
        </label>
        {state.message && (
          <p role="alert" className="text-sm text-status-danger-text">
            {state.message}
          </p>
        )}
        <Button
          type="submit"
          variant={operation === "cancel" ? "danger" : "primary"}
          isLoading={pending}
          disabled={pending || (operation === "transfer" && !destination)}
        >
          {operation === "cancel" ? "Cancel admission" : "Confirm transfer"}
        </Button>
      </fieldset>
    </form>
  );
}
