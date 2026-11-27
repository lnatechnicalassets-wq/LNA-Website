"use client";

import React, { useActionState } from "react";
import { Button } from "@/components/ui";
import type { AttentionItem } from "@/lib/payment-attention";
import { recheckPaymentException, reviewPaymentException } from "./actions";

export function PaymentAttentionForm({ item }: { item: AttentionItem }) {
  const [check, recheck, checking] = useActionState(recheckPaymentException, {});
  const [review, saveReview, saving] = useActionState(reviewPaymentException, {});
  if (!item.attempt_id) return null;
  const busy = checking || saving;
  return (
    <div className="space-y-3 border-t border-border-subtle pt-3">
      {item.has_payment_id && item.kind !== "sandbox_refund" && (
        <form action={recheck} className="space-y-2">
          <input type="hidden" name="attemptId" value={item.attempt_id} />
          <Button type="submit" variant="outline" disabled={busy}>
            {checking ? "Checking gateway…" : "Recheck bKash status"}
          </Button>
          {check.message && (
            <p role="status" className="text-sm">
              {check.message}
            </p>
          )}
        </form>
      )}
      {item.kind === "gateway_review" && item.evidence_key && !item.reviewed && (
        <form action={saveReview} className="space-y-2">
          <input type="hidden" name="attemptId" value={item.attempt_id} />
          <input type="hidden" name="evidenceKey" value={item.evidence_key} />
          <label htmlFor={`note-${item.attempt_id}`} className="block text-sm font-medium">
            Review note
          </label>
          <textarea
            id={`note-${item.attempt_id}`}
            name="note"
            required
            maxLength={500}
            rows={2}
            className="w-full rounded-lg border border-border-default bg-surface-base p-2 text-sm"
            placeholder="Record the findings and next action. Do not include passwords or wallet credentials."
            disabled={busy}
          />
          <p className="text-xs text-text-secondary">
            Reviewed does not mean paid, refunded or resolved. The evidence stays available.
          </p>
          <Button type="submit" variant="outline" disabled={busy}>
            {saving ? "Saving…" : "Mark reviewed with note"}
          </Button>
          {review.message && (
            <p role="status" className="text-sm">
              {review.message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
