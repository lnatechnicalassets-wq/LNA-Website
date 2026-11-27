"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminPaths } from "@/lib/admin-navigation";
import { requireStaff } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

type State = { message?: string; stale?: boolean };
const target = z.object({ id: z.string().uuid(), revision: z.string().datetime({ offset: true }) });

export async function saveCourseMentors(
  input: z.input<typeof target>,
  _previous: State,
  form: FormData
): Promise<State> {
  const staff = await requireStaff("catalog:edit");
  const parsed = target.safeParse(input);
  const ids = z
    .array(z.string().uuid())
    .max(100)
    .refine((v) => new Set(v).size === v.length)
    .safeParse(form.getAll("mentorId"));
  if (!parsed.success || !ids.success) return { message: "Check the mentor selection." };
  const { id, revision } = parsed.data;
  const { data, error } = await createSupabaseAdminClient().rpc("set_staff_course_mentors", {
    p_actor_id: staff.userId,
    p_course_id: id,
    p_expected_updated_at: revision,
    p_mentor_ids: ids.data,
  });
  if (error) return { message: "Mentors could not be saved. Try again." };
  if (data === "STALE" || data === "NOT_FOUND")
    return { stale: true, message: "The course changed. Reload before saving." };
  if (data !== "OK") return { message: "Mentors could not be saved. Check the selection." };
  const path = `${adminPaths.courses}/${id}/edit`;
  revalidatePath(path);
  revalidatePath(adminPaths.courses);
  revalidatePath(adminPaths.batches);
  revalidatePath("/");
  revalidatePath("/courses", "layout");
  redirect(`${path}?mentorsSaved=1#course-mentors`);
}
