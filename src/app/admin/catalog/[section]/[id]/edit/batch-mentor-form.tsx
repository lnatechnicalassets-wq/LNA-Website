"use client";

import React, { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { MentorProfileCard } from "@/components/admin/mentor-profile-card";
import { Badge, Button } from "@/components/ui";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { batchMentorCopy } from "@/lib/admin-catalog";
import { peopleCopy as copy, peopleFieldClass, type StaffMentorCard } from "@/lib/admin-people";
import type { getBatchMentorRoster } from "@/server/admin/batch-mentors";

type Roster = Awaited<ReturnType<typeof getBatchMentorRoster>>;
type Result = { message?: string; success?: boolean };
type Change = { mentor: StaffMentorCard; removing: boolean };

export function BatchMentorForm({
  roster,
  courseTitle,
  batchName,
  save,
}: {
  roster: Roster;
  courseTitle: string;
  batchName: string;
  save: (previous: Result, data: FormData) => Promise<Result>;
}) {
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  const [change, setChange] = useState<Change | null>(null);
  const [search, setSearch] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [state, action, pending] = useActionState(save, {});
  const router = useRouter();
  useEffect(() => {
    if (state.success) {
      setChange(null);
      router.refresh();
    }
  }, [state.success, router]);

  const inherited = roster.selectedIds.length === 0;
  const assigned = inherited ? roster.inheritedIds : roster.selectedIds;
  const term = search.trim().toLowerCase();
  const visible = roster.options
    .filter((mentor) => `${mentor.name} ${mentor.organization}`.toLowerCase().includes(term))
    .sort((a, b) => Number(assigned.includes(b.id)) - Number(assigned.includes(a.id)));
  const saving = pending || Boolean(state.success);

  function confirm() {
    if (!change) return;
    const id = change.mentor.id;
    const ids = change.removing ? assigned.filter((current) => current !== id) : [...assigned, id];
    const data = new FormData();
    ids.forEach((mentorId) => data.append("mentorId", mentorId));
    setAttempted(true);
    startTransition(() => action(data));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">{batchMentorCopy.inherit}</p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="cohort-mentor-search">
          {copy.batchSearch}
        </label>
        <input
          type="search"
          id="cohort-mentor-search"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder={copy.batchSearch}
          className={`${peopleFieldClass} w-full sm:max-w-xs`}
        />
      </div>
      {visible.length ? (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {visible.map((mentor) => {
            const selected = assigned.includes(mentor.id);
            const canRemove = assigned.length > 1 || !roster.inheritedIds.includes(mentor.id);
            return (
              <li key={mentor.id} className="min-w-0">
                <MentorProfileCard mentor={mentor}>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {selected && (
                      <Badge variant={inherited ? "primary" : "success"}>
                        {inherited ? copy.inherited : copy.assigned}
                      </Badge>
                    )}
                    {(!selected || canRemove) && (
                      <Button
                        type="button"
                        variant={selected ? "outline" : "primary"}
                        size="icon"
                        className="size-11"
                        disabled={saving}
                        aria-label={`${selected ? copy.removeMentor : copy.addToBatch} ${mentor.name}`}
                        onClick={(event) => {
                          lastTrigger.current = event.currentTarget;
                          setAttempted(false);
                          setChange({ mentor, removing: selected });
                        }}
                      >
                        {selected ? (
                          <Minus className="size-4" aria-hidden="true" />
                        ) : (
                          <Plus className="size-5" aria-hidden="true" />
                        )}
                      </Button>
                    )}
                  </div>
                </MentorProfileCard>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-text-secondary">{copy.noMentors}</p>
      )}
      <Dialog
        open={Boolean(change)}
        onOpenChange={(open) => {
          if (!open && !pending) setChange(null);
        }}
      >
        <DialogContent
          className="max-h-[88vh] overflow-y-auto"
          onCloseAutoFocus={(event) => {
            if (lastTrigger.current?.isConnected) {
              event.preventDefault();
              lastTrigger.current.focus();
            }
          }}
        >
          <DialogTitle>{change?.removing ? copy.removeMentor : copy.addToBatch}</DialogTitle>
          <DialogDescription>
            {change &&
              (change.removing
                ? copy.removePrompt(change.mentor.name, courseTitle, batchName)
                : copy.addPrompt(change.mentor.name, courseTitle, batchName))}
          </DialogDescription>
          {change && <MentorProfileCard mentor={change.mentor} />}
          {attempted && state.message && (
            <p role="alert" className="text-sm text-status-danger-text">
              {state.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="min-h-11" disabled={pending}>
                {copy.cancel}
              </Button>
            </DialogClose>
            <Button type="button" className="min-h-11" onClick={confirm} isLoading={saving}>
              {copy.confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
