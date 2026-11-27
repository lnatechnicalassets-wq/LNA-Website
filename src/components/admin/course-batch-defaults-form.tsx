"use client";

import React, { useActionState, useState } from "react";
import { Button } from "@/components/ui";

type State = { message?: string };
const fieldClass =
  "min-h-11 w-full rounded-lg border border-border-default bg-surface-card px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-primary-600";
const fields = [
  { name: "venue", label: "Default venue" },
  { name: "schedule_description", label: "Default schedule" },
  { name: "capacity", label: "Default capacity (unlimited or positive number)" },
  { name: "fee_poisha", label: "Default list fee (BDT)" },
  { name: "discount_fee_poisha", label: "Default discounted fee (BDT, optional)" },
] as const;
export function CourseBatchDefaultsForm({
  values,
  save,
}: {
  values: Record<string, string>;
  save: (state: State, form: FormData) => Promise<State>;
}) {
  const [state, action, pending] = useActionState(save, {});
  const [draft, setDraft] = useState(values);
  return (
    <form action={action} className="space-y-4">
      {state.message && (
        <p role="alert" className="text-sm text-status-danger-text">
          {state.message}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(({ name, label }) => (
          <label key={name} className="space-y-1 text-sm font-medium">
            <span className="block">{label}</span>
            {name === "schedule_description" ? (
              <textarea
                name={name}
                rows={3}
                value={draft[name] ?? ""}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setDraft((current) => ({ ...current, [name]: value }));
                }}
                className={fieldClass}
                required
              />
            ) : (
              <input
                name={name}
                value={draft[name] ?? ""}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setDraft((current) => ({ ...current, [name]: value }));
                }}
                className={fieldClass}
                required={name !== "discount_fee_poisha"}
              />
            )}
          </label>
        ))}
      </div>
      <Button type="submit" isLoading={pending}>
        Save batch defaults
      </Button>
    </form>
  );
}
