"use client";

import React, { useActionState, useState } from "react";
import { Badge, Button } from "@/components/ui";
import { batchIntakeStages, type BatchIntakeStage } from "@/lib/batch-intake";

type State = { message?: string; stale?: boolean };
type Intake = {
  stage: BatchIntakeStage;
  acceptApplications: boolean;
  legacy: boolean;
  coursePublished: boolean;
  publicEligible: boolean;
  remainingSeats: number | null;
  deadline: string | null;
};
const labels: Record<BatchIntakeStage, string> = {
  upcoming: "Upcoming",
  in_progress: "Running",
  completed: "Completed",
};

export function BatchIntakeForm({
  initial,
  save,
}: {
  initial: Intake;
  save: (previous: State, form: FormData) => Promise<State>;
}) {
  const [state, action, pending] = useActionState(save, {});
  const [stage, setStage] = useState(initial.stage);
  const [accept, setAccept] = useState(initial.acceptApplications);
  const [confirmed, setConfirmed] = useState(false);
  const opening =
    accept &&
    stage !== "completed" &&
    (initial.legacy || !initial.acceptApplications || initial.stage === "completed");
  const deadlinePassed = initial.deadline !== null && Date.parse(initial.deadline) <= Date.now();
  return (
    <form action={action} className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={initial.publicEligible ? "success" : "outline"}>
          {initial.publicEligible ? "Public enrollment open" : "Public enrollment closed"}
        </Badge>
        <span className="text-sm text-text-secondary">
          {initial.remainingSeats === null
            ? "Unlimited capacity"
            : `${initial.remainingSeats} seats available`}
        </span>
      </div>
      {initial.legacy && (
        <p className="rounded-lg border border-border-subtle p-3 text-sm text-text-secondary">
          This batch uses the previous enrollment window. Saving these controls switches it to
          manual enrollment management.
        </p>
      )}
      <label className="block space-y-1 text-sm font-medium">
        <span>Academic stage</span>
        <select
          name="stage"
          value={stage}
          onChange={(event) => {
            setStage(event.currentTarget.value as BatchIntakeStage);
            setConfirmed(false);
          }}
          className="min-h-11 w-full rounded-lg border border-border-default bg-surface-card px-3"
        >
          {batchIntakeStages.map((value) => (
            <option value={value} key={value}>
              {labels[value]}
            </option>
          ))}
        </select>
      </label>
      <input type="hidden" name="acceptApplications" value={String(accept)} />
      <label className="flex items-start gap-3 rounded-lg border border-border-subtle p-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={accept}
          onChange={(event) => {
            setAccept(event.currentTarget.checked);
            setConfirmed(false);
          }}
        />
        <span>
          <strong>Accept Applications</strong>
          <span className="block text-text-secondary">
            Allow new public applications when the course is published, the batch is eligible and
            seats are available. Staff admissions do not depend on this switch.
          </span>
        </span>
      </label>
      {stage === "completed" && (
        <p className="text-sm text-text-secondary">
          Completed batches cannot accept new admissions, even if the switch is on.
        </p>
      )}
      {accept && stage !== "completed" && !initial.coursePublished && (
        <p role="alert" className="text-sm text-status-danger-text">
          Publish the course first.
        </p>
      )}
      {accept && stage !== "completed" && deadlinePassed && (
        <p className="rounded-lg border border-border-subtle p-3 text-sm text-text-secondary">
          The previous enrollment deadline has passed. The manual switch will take priority over
          that date.
        </p>
      )}
      <input type="hidden" name="confirmOpen" value={String(confirmed)} />
      {opening && (
        <label className="flex items-start gap-3 rounded-lg border border-border-subtle p-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.currentTarget.checked)}
          />
          <span>I confirm that this change may open public applications immediately.</span>
        </label>
      )}
      {state.message && (
        <p role="alert" className="text-sm text-status-danger-text">
          {state.message}
        </p>
      )}
      <Button
        type="submit"
        disabled={
          pending ||
          state.stale ||
          (opening && !confirmed) ||
          (accept && stage !== "completed" && !initial.coursePublished)
        }
        isLoading={pending}
      >
        Save intake settings
      </Button>
    </form>
  );
}
