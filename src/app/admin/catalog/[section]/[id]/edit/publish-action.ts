"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { catalogSection } from "@/lib/admin-catalog";
import { catalogPublishCopy } from "@/lib/admin-catalog-publish";
import { adminPaths } from "@/lib/admin-navigation";
import { requireStaff } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

const targetSchema = z.object({
  section: catalogSection,
  id: z.string().uuid(),
  revision: z.string().datetime({ offset: true }),
});

export async function publishCatalogDraft(
  target: z.input<typeof targetSchema>,
  _previous: { message?: string; reloadRequired?: boolean },
  _formData: FormData
): Promise<{ message?: string; reloadRequired?: boolean }> {
  const staff = await requireStaff("catalog:edit");
  const result = targetSchema.safeParse(target);
  if (!result.success) return { message: catalogPublishCopy.unavailable };
  const { section, id, revision } = result.data;

  const { data, error } = await createSupabaseAdminClient().rpc("publish_admin_catalog_draft", {
    p_actor_id: staff.userId,
    p_section: section,
    p_record_id: id,
    p_expected_updated_at: revision,
  });

  if (error?.message === "CATALOG_PUBLISH_PARENT") {
    return { message: catalogPublishCopy.parent };
  }
  if (error?.message === "CATALOG_PUBLISH_STALE") {
    return { message: catalogPublishCopy.stale, reloadRequired: true };
  }
  const slug = z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .safeParse(data);
  if (error || !slug.success) return { message: catalogPublishCopy.unavailable };

  revalidatePath(adminPaths[section]);
  revalidatePath(`/courses/${slug.data}`);
  revalidatePath("/enroll");
  redirect(`${adminPaths[section]}?published=1`);
}
