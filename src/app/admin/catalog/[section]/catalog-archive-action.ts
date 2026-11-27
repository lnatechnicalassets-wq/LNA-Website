"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { catalogArchiveCopy as copy, catalogSection } from "@/lib/admin-catalog";
import { adminPaths } from "@/lib/admin-navigation";
import { requireStaff } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

const targetSchema = z.object({
  id: z.string().uuid(),
  section: catalogSection,
  revision: z.string().datetime({ offset: true }),
  restore: z.boolean(),
});

export async function archiveCatalogRecord(
  target: z.input<typeof targetSchema>,
  _previous: { message?: string; success?: boolean },
  _data: FormData
): Promise<{ message?: string; success?: boolean }> {
  const staff = await requireStaff("catalog:archive");
  const selected = targetSchema.safeParse(target);
  if (!selected.success) return { message: copy.failed };
  const { id, section, revision, restore } = selected.data;
  const { data, error } = await createSupabaseAdminClient().rpc("archive_staff_catalog", {
    p_actor_id: staff.userId,
    p_section: section,
    p_record_id: id,
    p_expected_updated_at: revision,
    p_restore: restore,
  });
  if (error) return { message: copy.failed };
  if (data === "STALE") return { message: copy.stale };
  if (data !== "OK") return { message: copy.failed };
  revalidatePath(adminPaths.courses);
  revalidatePath(adminPaths.batches);
  revalidatePath(`${adminPaths[section]}/${id}/edit`);
  revalidatePath("/");
  revalidatePath("/courses/[slug]", "page");
  revalidatePath("/enroll");
  return { success: true };
}
