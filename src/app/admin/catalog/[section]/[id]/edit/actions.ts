"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { catalogSection } from "@/lib/admin-catalog";
import {
  batchEditSchema,
  courseEditSchema,
  editCatalogCopy,
  editFields,
  type CatalogEditState,
} from "@/lib/admin-catalog-edit";
import { adminPaths } from "@/lib/admin-navigation";
import { requireStaff } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

const targetSchema = z.object({
  section: catalogSection,
  id: z.string().uuid(),
  revision: z.string().datetime({ offset: true }),
});

export async function saveCatalogEdit(
  target: z.input<typeof targetSchema>,
  _previous: CatalogEditState,
  formData: FormData
): Promise<CatalogEditState> {
  const staff = await requireStaff("catalog:edit");
  const parsedTarget = targetSchema.safeParse(target);
  if (!parsedTarget.success) return { message: editCatalogCopy.invalid };
  const { section, id, revision } = parsedTarget.data;

  const raw = Object.fromEntries(editFields[section].map(({ name }) => [name, formData.get(name)]));
  const parsed = (section === "courses" ? courseEditSchema : batchEditSchema).safeParse(raw);
  if (!parsed.success) {
    return { message: editCatalogCopy.invalid, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { error } = await createSupabaseAdminClient().rpc("update_admin_catalog_record", {
    p_actor_id: staff.userId,
    p_section: section,
    p_record_id: id,
    p_expected_updated_at: revision,
    p_values: parsed.data,
  });
  if (error) {
    if (error.message === "CATALOG_EDIT_STALE" || error.message === "CATALOG_EDIT_MISSING") {
      return { message: editCatalogCopy.changed, reloadRequired: true };
    }
    if (error.message === "CATALOG_EDIT_ARCHIVED") {
      return { message: editCatalogCopy.archived, reloadRequired: true };
    }
    if (error.message === "CATALOG_EDIT_CAPACITY") {
      return {
        message: editCatalogCopy.invalid,
        fieldErrors: { capacity: [editCatalogCopy.capacity] },
      };
    }
    return { message: editCatalogCopy.unavailable };
  }

  revalidatePath(adminPaths[section]);
  redirect(`${adminPaths[section]}?saved=1`);
}
