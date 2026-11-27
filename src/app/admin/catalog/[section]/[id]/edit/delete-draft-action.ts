"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminPaths } from "@/lib/admin-navigation";
import { requireStaff } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

const target = z.object({ id: z.string().uuid(), revision: z.string().datetime({ offset: true }) });
type State = { message?: string };
export async function deleteUnusedBatchDraft(
  input: z.input<typeof target>,
  _previous: State,
  form: FormData
): Promise<State> {
  const staff = await requireStaff("catalog:delete-unused-draft");
  const parsed = target.safeParse(input);
  if (!parsed.success || form.get("confirm") !== "yes")
    return { message: "Confirm the draft deletion first." };
  const { error, data } = await createSupabaseAdminClient().rpc("delete_unused_batch_draft", {
    p_actor_id: staff.userId,
    p_batch_id: parsed.data.id,
    p_expected_updated_at: parsed.data.revision,
  });
  if (error) return { message: "The draft could not be deleted. No history was removed." };
  if (data !== "OK")
    return {
      message:
        data === "STALE"
          ? "The batch changed. Reload before trying again."
          : "This draft cannot be deleted because it has linked records or operational history. Archive it instead.",
    };
  revalidatePath(adminPaths.batches);
  redirect(`${adminPaths.batches}?draftDeleted=1`);
}
