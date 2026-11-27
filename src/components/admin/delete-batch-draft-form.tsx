"use client";
import React, { useActionState, useState } from "react";
import { Button } from "@/components/ui";
type State = { message?: string };
export function DeleteBatchDraftForm({
  save,
}: {
  save: (state: State, form: FormData) => Promise<State>;
}) {
  const [state, action, pending] = useActionState(save, {});
  const [confirmed, setConfirmed] = useState(false);
  return (
    <form
      action={action}
      className="space-y-3 rounded-xl border border-border-subtle bg-surface-card p-4 sm:p-6"
    >
      <h2 className="font-semibold text-primary-900">Delete unused draft</h2>
      <p className="text-sm text-text-secondary">
        Only an unused draft with no dependent records or operational history can be permanently
        removed. Archive a batch if it has been used.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="confirm"
          value="yes"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.currentTarget.checked)}
        />{" "}
        I understand that this draft cannot be recovered.
      </label>
      {state.message && (
        <p role="alert" className="text-sm text-status-danger-text">
          {state.message}
        </p>
      )}
      <Button variant="danger" type="submit" disabled={!confirmed || pending}>
        Delete draft
      </Button>
    </form>
  );
}
