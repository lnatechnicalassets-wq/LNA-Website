"use client";

import { useActionState } from "react";
import { retryConfirmationEmail } from "./email-retry-actions";

export function EmailRetryForm({ id, enrollmentId }: { id: string; enrollmentId: string }) {
  const [state, action, pending] = useActionState(retryConfirmationEmail, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <button
        type="submit"
        disabled={pending}
        className="min-h-9 rounded-md border border-border-default px-3 text-xs font-medium text-primary-900 disabled:opacity-50"
      >
        {pending ? "Checking…" : "Retry confirmation"}
      </button>
      {state.message && (
        <p role="status" className="text-xs">
          {state.message}
        </p>
      )}
    </form>
  );
}
