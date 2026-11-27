"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseCourseContentForm, type CourseContentState } from "@/lib/course-content";
import { adminPaths } from "@/lib/admin-navigation";
import { requireStaff } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

const targetSchema = z.object({
  id: z.string().uuid(),
  revision: z.string().datetime({ offset: true }),
});
const resultSchema = z.object({
  ok: z.boolean(),
  code: z.string().optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

export async function saveCourseContent(
  target: z.input<typeof targetSchema>,
  _previous: CourseContentState,
  form: FormData
): Promise<CourseContentState> {
  const staff = await requireStaff("catalog:edit");
  const selected = targetSchema.safeParse(target);
  const content = parseCourseContentForm(form);
  if (!selected.success || !content) return { message: "Check the course content and try again." };

  const { data, error } = await createSupabaseAdminClient().rpc("update_staff_course_content", {
    p_actor_id: staff.userId,
    p_course_id: selected.data.id,
    p_expected_updated_at: selected.data.revision,
    p_values: content,
  });
  const result = resultSchema.safeParse(data);
  if (error || !result.success) return { message: "Course content could not be saved. Try again." };
  if (!result.data.ok) {
    if (result.data.code === "STALE" || result.data.code === "NOT_FOUND") {
      return { message: "The course has changed. Reload this page before saving.", stale: true };
    }
    return { message: "Course content could not be saved. Check your entries." };
  }
  const path = `${adminPaths.courses}/${selected.data.id}/edit`;
  revalidatePath(path);
  revalidatePath(adminPaths.courses);
  revalidatePath("/");
  revalidatePath("/courses");
  if (result.data.slug) revalidatePath(`/courses/${result.data.slug}`);
  redirect(`${path}?contentSaved=1#course-content`);
}
