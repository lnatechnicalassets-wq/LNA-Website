"use client";

import React, { startTransition, useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { manualPaymentReviewCopy as copy } from "@/lib/admin-manual-admission";

export type ReviewAction = (
  previous: { message?: string },
  data: FormData
) => Promise<{ message?: string; success?: boolean }>;

const fieldClass =
  "min-h-11 w-full rounded-lg border border-border-default bg-surface-base px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600";

export function ManualPaymentReview({
  paymentMethod,
  action,
  onSuccess,
  cancel,
}: {
  paymentMethod: "bkash" | "bank_transfer";
  action: ReviewAction;
  onSuccess?: () => void;
  cancel?: React.ReactNode;
}) {
  const [state, submitReview, pending] = useActionState(action, {});
  const [decision, setDecision] = useState("approve");
  const [attested, setAttested] = useState(false);
  const [received, setReceived] = useState("");
  const [showError, setShowError] = useState(false);
  const approve = decision === "approve";
  useEffect(() => {
    if (state.success) onSuccess?.();
  }, [state.success, onSuccess]);

  return (
    <form
      action={submitReview}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setShowError(true);
        startTransition(() => submitReview(data));
      }}
    >
      <fieldset disabled={pending} className="space-y-4">
        <p className="text-sm text-text-secondary">
          {paymentMethod === "bkash" ? copy.bkashInstructions : copy.bankInstructions}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="manual-review-decision" className="block text-sm font-medium">
              {copy.decision}
            </label>
            <select
              id="manual-review-decision"
              name="decision"
              className={fieldClass}
              value={decision}
              onChange={(event) => {
                setDecision(event.currentTarget.value);
                setAttested(false);
                setShowError(false);
              }}
            >
              <option value="approve">{copy.approveChoice}</option>
              <option value="reject">{copy.rejectChoice}</option>
            </select>
          </div>
          {approve && (
            <div className="space-y-1">
              <label htmlFor="manual-received-amount" className="block text-sm font-medium">
                {copy.received}
              </label>
              <input
                id="manual-received-amount"
                name="receivedAmount"
                inputMode="decimal"
                className={fieldClass}
                maxLength={18}
                value={received}
                onChange={(event) => setReceived(event.currentTarget.value)}
                required
              />
            </div>
          )}
        </div>
        {!approve && <p className="text-sm text-text-secondary">{copy.rejectEffect}</p>}
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="attestation"
            value="yes"
            checked={attested}
            onChange={(event) => setAttested(event.currentTarget.checked)}
            required
            className="size-6 shrink-0 accent-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          />
          {approve ? copy.attestApproval : copy.attestRejection}
        </label>
        {showError && state.message && (
          <p role="alert" className="text-sm text-status-danger-text">
            {state.message}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            variant={approve ? "primary" : "danger"}
            isLoading={pending}
            className="min-h-11"
          >
            {pending ? copy.approving : approve ? copy.approveButton : copy.rejectButton}
          </Button>
          {cancel}
        </div>
      </fieldset>
    </form>
  );
}
