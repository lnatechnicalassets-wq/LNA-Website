"use client";

import React, { useActionState, useState } from "react";
import { Button } from "@/components/ui";
import type { CatalogSection } from "@/lib/admin-catalog";

type State = { message?: string };

export function DeleteCatalogForm({
  section,
  title,
  save,
}: {
  section: CatalogSection;
  title: string;
  save: (state: State, form: FormData) => Promise<State>;
}) {
  const [state, action, pending] = useActionState(save, {});
  const [confirmed, setConfirmed] = useState(false);
  const noun = section === "courses" ? "course" : "batch";
  return (
    <form
      id="delete-catalog"
      action={action}
      className="space-y-3 rounded-xl border border-rose-200 bg-surface-card p-4 sm:p-6"
    >
      <h2 className="font-semibold text-status-danger-text">Delete {noun}</h2>
      <p className="text-sm text-text-secondary">
        {section === "courses"
          ? "Archive a published course first and remove its unused batches. Courses with linked records cannot be deleted."
          : "Close applications first. Only unused drafts, upcoming or eligible archived batches can be removed. Started, completed or historically used batches are protected."}{" "}
        Mentor profiles and audit history are retained.
      </p>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="confirm"
          value="yes"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.currentTarget.checked)}
        />
        <span>Permanently delete {title}. I understand this cannot be undone.</span>
      </label>
      {state.message && (
        <p role="alert" className="text-sm text-status-danger-text">
          {state.message}
        </p>
      )}
      <Button variant="danger" type="submit" disabled={!confirmed || pending}>
        {pending ? "Checking and deleting…" : `Delete ${noun}`}
      </Button>
    </form>
  );
}
