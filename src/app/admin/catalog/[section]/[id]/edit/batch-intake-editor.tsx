import "server-only";

import React from "react";
import { z } from "zod";
import { batchIntakeStages } from "@/lib/batch-intake";
import { BatchIntakeForm } from "@/components/admin/batch-intake-form";
import { createSupabaseAdminClient } from "@/server/supabase/clients";
import { saveBatchIntake } from "./batch-intake-actions";

const intakeSchema = z.object({
  revision: z.string().datetime({ offset: true }),
  stage: z.enum(batchIntakeStages),
  acceptApplications: z.boolean(),
  legacy: z.boolean(),
  coursePublished: z.boolean(),
  publicEligible: z.boolean(),
  remainingSeats: z.number().int().nonnegative().nullable(),
  deadline: z.string().nullable(),
});

export async function BatchIntakeEditor({
  id,
  actorId,
  saved,
}: {
  id: string;
  actorId: string;
  saved?: boolean;
}) {
  const { data, error } = await createSupabaseAdminClient().rpc("get_staff_batch_intake", {
    p_actor_id: actorId,
    p_batch_id: id,
  });
  // Old schema and draft/cancelled batches have no applicable intake editor.
  if (error?.code === "PGRST202" || error?.code === "42883" || (!error && data === null))
    return null;
  const result = intakeSchema.safeParse(data);
  if (error || !result.success)
    return (
      <p role="alert" className="text-sm text-status-danger-text">
        Intake settings could not be loaded.
      </p>
    );
  return (
    <section
      id="batch-intake"
      className="space-y-4 rounded-xl border border-border-subtle bg-surface-card p-4 sm:p-6"
    >
      <h2 className="text-lg font-semibold text-primary-900">Batch lifecycle & applications</h2>
      <p className="text-sm text-text-secondary">
        Manage the academic stage separately from public enrollment. Changing the stage does not
        edit the batch dates.
      </p>
      {saved && (
        <p role="status" className="text-sm text-status-success-text">
          Batch intake settings saved.
        </p>
      )}
      <BatchIntakeForm
        key={result.data.revision}
        initial={result.data}
        save={saveBatchIntake.bind(null, { id, revision: result.data.revision })}
      />
    </section>
  );
}
