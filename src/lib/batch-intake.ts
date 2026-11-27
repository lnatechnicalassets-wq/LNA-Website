export const batchIntakeStages = ["upcoming", "in_progress", "completed"] as const;
export type BatchIntakeStage = (typeof batchIntakeStages)[number];

export type IntakeBatch = {
  status: string;
  acceptApplications?: boolean | null;
  archivedAt?: string | null;
  opensAt?: string | null;
  closesAt?: string | null;
};

export function hasExplicitBatchIntake(batch: IntakeBatch): boolean {
  return typeof batch.acceptApplications === "boolean";
}

// A configured batch has a manual switch. A legacy batch keeps its old window
// until staff explicitly save the new controls. Capacity and parent publication
// are checked by the caller/DB transaction, not inferred from the switch.
export function isBatchIntakeAllowed(batch: IntakeBatch, staff: boolean, now: number): boolean {
  if (batch.archivedAt) return false;
  if (hasExplicitBatchIntake(batch)) {
    return (
      ["upcoming", "open_for_enrollment", "in_progress"].includes(batch.status) &&
      (staff || batch.acceptApplications === true)
    );
  }
  return (
    batch.status === "open_for_enrollment" &&
    (!batch.opensAt || Date.parse(batch.opensAt) <= now) &&
    (!batch.closesAt || Date.parse(batch.closesAt) > now)
  );
}
