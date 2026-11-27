import "server-only";
import { z } from "zod";
import { getEnrollmentConfig } from "@/lib/enrollment/config";
import {
  programQuestionSetSchema,
  questionSetVersionSchema,
} from "@/lib/enrollment/program-questions";
import type { ProgramQuestion } from "@/lib/enrollment/types";
import { AppError } from "@/lib/errors";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

const storedRow = z
  .object({
    slug: z.string(),
    application_questions: programQuestionSetSchema.nullable(),
    application_questions_version: questionSetVersionSchema,
  })
  .refine(
    (row) => (row.application_questions === null) === (row.application_questions_version === 0)
  );

export async function loadProgramQuestionSets(courseSlugs: string[]) {
  const slugs = [...new Set(courseSlugs)].filter((slug) => /^[a-z0-9-]+$/.test(slug));
  const legacy = getEnrollmentConfig().programQuestions;
  const programQuestions: Record<string, ProgramQuestion[]> = Object.fromEntries(
    slugs.map((slug) => [slug, Object.hasOwn(legacy, slug) ? legacy[slug] : []])
  );
  const programQuestionVersions: Record<string, number> = Object.fromEntries(
    slugs.map((slug) => [slug, 0])
  );
  if (!slugs.length) return { programQuestions, programQuestionVersions };
  const { data, error } = await createSupabaseAdminClient()
    .from("courses")
    .select("slug,application_questions,application_questions_version")
    .in("slug", slugs)
    .is("archived_at", null);
  // Before M21 the columns do not exist. Never substitute legacy data for an
  // unrelated database failure, including malformed configured question sets.
  if (error && ["42703", "PGRST204"].includes(error.code)) {
    return { programQuestions, programQuestionVersions };
  }
  const parsed = z.array(storedRow).safeParse(data);
  if (error || !parsed.success) {
    throw new AppError(
      "Application questions could not be loaded. Please try again.",
      "QUESTIONS_UNAVAILABLE",
      503
    );
  }
  for (const row of parsed.data) {
    if (row.application_questions !== null && Object.hasOwn(programQuestions, row.slug)) {
      programQuestions[row.slug] = row.application_questions;
      programQuestionVersions[row.slug] = row.application_questions_version;
    }
  }
  return { programQuestions, programQuestionVersions };
}
