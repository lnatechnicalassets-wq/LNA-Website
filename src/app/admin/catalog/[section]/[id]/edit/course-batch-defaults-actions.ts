"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseCourseBatchDefaults } from "@/lib/course-batch-defaults";
import { adminPaths } from "@/lib/admin-navigation";
import { requireStaff } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

type State = { message?: string };
const target = z.object({ id: z.string().uuid(), revision: z.string().datetime({ offset: true }) });
export async function saveCourseBatchDefaults(
  input: z.input<typeof target>,
  _previous: State,
  form: FormData
): Promise<State> {
  const staff = await requireStaff("catalog:edit");
  const parsed = target.safeParse(input);
  const defaults = parseCourseBatchDefaults(form);
  if (!parsed.success || !defaults)
    return { message: "Check the venue, schedule, capacity and fee fields." };
  const { id, revision } = parsed.data;
  const { error, data } = await createSupabaseAdminClient().rpc("set_staff_course_batch_defaults", {
    p_actor_id: staff.userId,
    p_course_id: id,
    p_expected_updated_at: revision,
    p_defaults: defaults,
  });
  if (error) return { message: "Batch defaults could not be saved." };
  if (data !== "OK")
    return {
      message:
        data === "STALE"
          ? "The course changed. Reload before saving."
          : "Batch defaults could not be saved.",
    };
  const path = `${adminPaths.courses}/${id}/edit`;
  revalidatePath(path);
  redirect(`${path}?defaultsSaved=1#batch-defaults`);
}
