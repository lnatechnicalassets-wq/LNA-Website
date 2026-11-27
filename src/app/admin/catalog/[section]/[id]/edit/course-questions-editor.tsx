import "server-only";
import React from "react";
import { z } from "zod";
import { getEnrollmentConfig } from "@/lib/enrollment/config";
import {
  programQuestionSetSchema,
  questionSetVersionSchema,
} from "@/lib/enrollment/program-questions";
import { createSupabaseAdminClient } from "@/server/supabase/clients";
import { CourseQuestionsForm } from "@/components/admin/course-questions-form";
import { saveCourseQuestions } from "./course-questions-action";

const recordSchema = z.object({
  slug: z.string(),
  questions: programQuestionSetSchema.nullable(),
  version: questionSetVersionSchema,
});
export async function CourseQuestionsEditor({
  id,
  actorId,
  saved,
}: {
  id: string;
  actorId: string;
  saved?: boolean;
}) {
  const { data, error } = await createSupabaseAdminClient().rpc("get_staff_application_questions", {
    p_actor_id: actorId,
    p_course_id: id,
  });
  if (error?.code === "PGRST202" || error?.code === "42883") return null;
  const record = recordSchema.safeParse(data);
  if (error || !record.success)
    return (
      <p role="alert" className="text-sm text-status-danger-text">
        Application questions could not be loaded.
      </p>
    );
  const legacy = getEnrollmentConfig().programQuestions;
  const initial =
    record.data.questions ??
    (Object.hasOwn(legacy, record.data.slug) ? legacy[record.data.slug] : []);
  return (
    <section
      id="application-questions"
      className="space-y-4 rounded-xl border border-border-subtle bg-surface-card p-4 sm:p-6"
    >
      <h2 className="text-lg font-semibold text-primary-900">Application questions</h2>
      <p className="text-sm text-text-secondary">
        These questions apply to public applications and staff admissions for every batch of this
        course. Changes affect new applications only. Existing answers are preserved.
      </p>
      <p className="text-sm text-text-secondary">
        {record.data.version
          ? `Version ${record.data.version}`
          : "Default questions (not yet customized)"}
      </p>
      {saved && (
        <p role="status" className="text-sm text-status-success-text">
          Application questions saved.
        </p>
      )}
      <CourseQuestionsForm
        key={record.data.version}
        initial={initial}
        save={saveCourseQuestions.bind(null, { id, version: record.data.version })}
      />
    </section>
  );
}
