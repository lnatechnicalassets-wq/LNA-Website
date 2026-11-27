"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { catalogSection } from "@/lib/admin-catalog";
import { adminPaths } from "@/lib/admin-navigation";
import { requireStaff } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

const target = z.object({
  section: catalogSection,
  id: z.string().uuid(),
  revision: z.string().datetime({ offset: true }),
});
type State = { message?: string };

export async function deleteUnusedCatalog(
  input: z.input<typeof target>,
  _previous: State,
  form: FormData
): Promise<State> {
  const staff = await requireStaff("catalog:delete-unused-draft");
  const parsed = target.safeParse(input);
  if (!parsed.success || form.get("confirm") !== "yes")
    return { message: "Confirm the deletion first." };
  const { section, id, revision } = parsed.data;
  const { data, error } = await createSupabaseAdminClient().rpc("delete_unused_catalog_record", {
    p_actor_id: staff.userId,
    p_section: section,
    p_record_id: id,
    p_expected_updated_at: revision,
  });
  if (error) return { message: "Deletion failed. No linked history was removed." };
  if (data !== "OK")
    return {
      message:
        data === "STALE"
          ? "The record changed. Reload and confirm again."
          : data === "NOT_FOUND"
            ? "The record no longer exists."
            : "This record has linked history or an active status. Close or archive it first; records with admission history must be retained.",
    };
  revalidatePath("/");
  revalidatePath("/enroll");
  revalidatePath("/courses/[slug]", "page");
  revalidatePath(adminPaths.courses);
  revalidatePath(adminPaths.batches);
  redirect(`${adminPaths[section]}?deleted=1`);
}
