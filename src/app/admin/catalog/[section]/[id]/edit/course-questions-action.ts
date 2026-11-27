"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminPaths } from "@/lib/admin-navigation";
import {
  programQuestionSetSchema,
  questionSetVersionSchema,
} from "@/lib/enrollment/program-questions";
import { requireStaff } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

const targetSchema = z.object({ id: z.string().uuid(), version: questionSetVersionSchema });
export async function saveCourseQuestions(
  target: z.input<typeof targetSchema>,
  _previous: { message?: string },
  form: FormData
): Promise<{ message?: string }> {
  const staff = await requireStaff("catalog:edit");
  const selected = targetSchema.safeParse(target);
  const raw = form.get("questions");
  if (!selected.success || typeof raw !== "string" || raw.length > 150000)
    return { message: "Invalid question set." };
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { message: "Invalid question set." };
  }
  const parsed = programQuestionSetSchema.safeParse(payload);
  if (!parsed.success)
    return {
      message:
        "Check question labels, IDs and options. Select questions need at least two unique non-empty options.",
    };
  const { data, error } = await createSupabaseAdminClient().rpc("set_staff_application_questions", {
    p_actor_id: staff.userId,
    p_course_id: selected.data.id,
    p_expected_version: selected.data.version,
    p_questions: parsed.data,
  });
  if (error || data !== "OK") {
    return {
      message:
        data === "STALE"
          ? "The question set changed. Reload before saving."
          : "Application questions could not be saved.",
    };
  }
  const path = `${adminPaths.courses}/${selected.data.id}/edit`;
  revalidatePath(path);
  revalidatePath("/enroll");
  revalidatePath(adminPaths.addStudent);
  redirect(`${path}?questionsSaved=1#application-questions`);
}
