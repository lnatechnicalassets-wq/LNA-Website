"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { batchMentorCopy as copy } from "@/lib/admin-catalog";
import { adminPaths } from "@/lib/admin-navigation";
import { requireStaff } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

const targetSchema = z.object({
  id: z.string().uuid(),
  revision: z.string().datetime({ offset: true }),
});

export async function saveBatchMentors(
  target: z.input<typeof targetSchema>,
  previous: { message?: string; success?: boolean },
  data: FormData
) {
  const staff = await requireStaff("catalog:edit");
  const selected = targetSchema.safeParse(target);
  const mentors = z.array(z.string().uuid()).max(100).safeParse(data.getAll("mentorId"));
  if (!selected.success || !mentors.success) return { message: copy.failed };
  const { error, data: result } = await createSupabaseAdminClient().rpc("set_staff_batch_mentors", {
    p_actor_id: staff.userId,
    p_batch_id: selected.data.id,
    p_expected_updated_at: selected.data.revision,
    p_mentor_ids: mentors.data,
  });
  if (error) return { message: copy.failed };
  if (result === "STALE") return { message: copy.stale };
  if (result !== "OK") return { message: copy.failed };
  revalidatePath(adminPaths.batches);
  revalidatePath(`${adminPaths.batches}/${selected.data.id}/edit`);
  return { success: true };
}
