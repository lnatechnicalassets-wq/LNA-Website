"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminPaths } from "@/lib/admin-navigation";
import { batchIntakeStages } from "@/lib/batch-intake";
import { requireStaff } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

type State = { message?: string; stale?: boolean };
const target = z.object({ id: z.string().uuid(), revision: z.string().datetime({ offset: true }) });
const controls = z.object({
  stage: z.enum(batchIntakeStages),
  acceptApplications: z.enum(["true", "false"]),
  confirmOpen: z.enum(["true", "false"]),
});

export async function saveBatchIntake(
  input: z.input<typeof target>,
  _previous: State,
  form: FormData
): Promise<State> {
  const staff = await requireStaff("catalog:publish");
  const parsed = target.safeParse(input);
  const values = controls.safeParse({
    stage: form.get("stage"),
    acceptApplications: form.get("acceptApplications"),
    confirmOpen: form.get("confirmOpen"),
  });
  if (!parsed.success || !values.success) return { message: "Check the intake settings." };
  const { id, revision } = parsed.data;
  const { data, error } = await createSupabaseAdminClient().rpc("set_staff_batch_intake", {
    p_actor_id: staff.userId,
    p_batch_id: id,
    p_expected_updated_at: revision,
    p_stage: values.data.stage,
    p_accept_applications: values.data.acceptApplications === "true",
    p_confirm_open: values.data.confirmOpen === "true",
  });
  if (error) return { message: "Intake settings could not be saved. Try again." };
  if (data === "STALE" || data === "NOT_FOUND")
    return { stale: true, message: "The batch changed. Reload before saving." };
  if (data === "CONFIRM_OPEN")
    return { message: "Confirm that you want to enable public applications." };
  if (data === "PARENT_UNPUBLISHED")
    return { message: "Publish the parent course before accepting public applications." };
  if (data !== "OK") return { message: "Intake settings could not be saved." };
  const path = `${adminPaths.batches}/${id}/edit`;
  revalidatePath(path);
  revalidatePath(adminPaths.batches);
  revalidatePath(adminPaths.courses);
  revalidatePath("/");
  revalidatePath("/courses", "layout");
  redirect(`${path}?intakeSaved=1#batch-intake`);
}
