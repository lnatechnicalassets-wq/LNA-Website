"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { catalogSection, type CatalogSection } from "@/lib/admin-catalog";
import {
  batchCreateSchema,
  courseCreateSchema,
  createCatalogCopy,
  createFields,
  editCatalogCopy,
  type CatalogEditState,
} from "@/lib/admin-catalog-edit";
import { adminPaths } from "@/lib/admin-navigation";
import { requireStaff } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

export async function createCatalogDraft(
  section: CatalogSection,
  _previous: CatalogEditState,
  formData: FormData
): Promise<CatalogEditState> {
  const staff = await requireStaff("catalog:edit");
  if (!catalogSection.safeParse(section).success) return { message: editCatalogCopy.invalid };

  const raw = Object.fromEntries(
    createFields[section].map(({ name }) => [name, formData.get(name)])
  );
  const parsed = (section === "courses" ? courseCreateSchema : batchCreateSchema).safeParse(raw);
  if (!parsed.success) {
    return { message: editCatalogCopy.invalid, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { error } = await createSupabaseAdminClient().rpc("create_admin_catalog_draft", {
    p_actor_id: staff.userId,
    p_section: section,
    p_values: parsed.data,
  });
  if (error) {
    switch (error.message) {
      case "CATALOG_CREATE_COURSE_SLUG":
        return {
          message: editCatalogCopy.invalid,
          fieldErrors: { slug: [createCatalogCopy.duplicateSlug] },
        };
      case "CATALOG_CREATE_BATCH_NUMBER":
        return {
          message: editCatalogCopy.invalid,
          fieldErrors: { batch_number: [createCatalogCopy.duplicateBatch] },
        };
      case "CATALOG_CREATE_COURSE_UNAVAILABLE":
        return {
          message: editCatalogCopy.invalid,
          fieldErrors: { course_id: [createCatalogCopy.unavailableCourse] },
        };
      default:
        return { message: editCatalogCopy.unavailable };
    }
  }

  revalidatePath(adminPaths[section]);
  redirect(`${adminPaths[section]}?created=1`);
}
