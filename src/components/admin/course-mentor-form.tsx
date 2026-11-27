"use client";

import React, { useActionState, useState } from "react";
import { Button } from "@/components/ui";

type Option = { id: string; name: string; archived: boolean; selected: boolean };
type State = { message?: string; stale?: boolean };

export function CourseMentorForm({
  options,
  save,
}: {
  options: Option[];
  save: (previous: State, form: FormData) => Promise<State>;
}) {
  const [state, action, pending] = useActionState(save, {});
  const [selected, setSelected] = useState(() =>
    options.filter((option) => option.selected).map((option) => option.id)
  );
  const [search, setSearch] = useState("");
  const visible = options.filter((option) =>
    option.name.toLowerCase().includes(search.trim().toLowerCase())
  );
  return (
    <form action={action} className="space-y-3">
      {selected.map((id) => (
        <input key={id} type="hidden" name="mentorId" value={id} />
      ))}
      <label className="block space-y-1 text-sm font-medium">
        <span>Search mentors</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          className="min-h-11 w-full rounded-lg border border-border-default px-3"
        />
      </label>
      <p className="text-sm text-text-secondary">{selected.length} selected (maximum 100)</p>
      <div className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
        {visible.map((option) => (
          <label
            key={option.id}
            className="flex min-h-11 items-center gap-3 rounded-lg border border-border-subtle p-2 text-sm"
          >
            <input
              type="checkbox"
              checked={selected.includes(option.id)}
              disabled={
                pending || state.stale || (!selected.includes(option.id) && selected.length >= 100)
              }
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                setSelected((current) =>
                  checked ? [...current, option.id] : current.filter((id) => id !== option.id)
                );
              }}
            />
            <span>
              {option.name}
              {option.archived ? " (archived)" : ""}
            </span>
          </label>
        ))}
      </div>
      {visible.length === 0 && <p className="text-sm text-text-secondary">No matching mentors.</p>}
      {state.message && (
        <p role="alert" className="text-sm text-status-danger-text">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending || state.stale} isLoading={pending}>
        Save course mentors
      </Button>
    </form>
  );
}
