import "server-only";

import { z } from "zod";
import {
  canBatchAcceptApplications,
  getBatchPayablePoisha,
  type Batch,
  type Course,
  type Mentor,
} from "@/lib/content";
import { getCourseMentorRoster, getMentorCompanyLogo } from "@/lib/mentors";
import { formatPoishaToBDT } from "@/lib/money";
import { getPublicCatalogFromSupabase } from "@/server/enrollment/service";
import { getEnrollmentRuntimeConfig } from "@/server/enrollment/config";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

const courseId = "mto-readiness";
const copy = {
  eyebrow: "Management Trainee Officer Program",
  eyebrowParts: ["MANAGEMENT TRAINEE", "OFFICER PROGRAM"],
  headline: ["MTO", "Readiness"],
  subtitleParts: ["Mentor-led preparation", "for future MTOs"],
  description: "Mentor-led preparation for future MTOs",
  visits: "2 industry visits",
  mentor: "Industry mentor",
  program: "View Program",
  enroll: "Enroll Now",
  closed: "Enrollment unavailable",
  limited: "Limited Seats",
  countdownLabel: "Admissions Close In",
};

const mentorLink = z.object({ slug: z.string() });
const cohortDetails = z.object({
  enrollment_closes_at: z.string().nullable(),
  batch_mentors: z.array(
    z.object({
      display_order: z.number(),
      mentors: z.union([mentorLink, z.array(mentorLink)]).nullable(),
    })
  ),
});

export async function getMtoHeroCourse(
  courses: Course[],
  batches: Batch[],
  mentors: Mentor[],
  providedCatalog?: Awaited<ReturnType<typeof getPublicCatalogFromSupabase>> | null
) {
  const catalog =
    providedCatalog === undefined
      ? await getPublicCatalogFromSupabase().catch(() => null)
      : providedCatalog;
  const authoritative = providedCatalog !== undefined && providedCatalog !== null;
  const liveCourse = catalog?.courses.find(({ id }) => id === courseId);
  const course =
    liveCourse ?? courses.find(({ id, status }) => id === courseId && status === "published");
  if (!course) return null;

  const liveBatches = (catalog?.batches ?? []).filter((batch) => batch.courseId === courseId);
  const bookable = liveBatches.find((batch) => canBatchAcceptApplications(batch));
  const liveBatch =
    bookable ??
    liveBatches.find((batch) => batch.status === "open_for_enrollment") ??
    liveBatches.find((batch) => batch.status === "upcoming") ??
    liveBatches.at(-1);
  const batch = liveBatch ?? batches.find((entry) => entry.courseId === courseId);
  let mentorIds = course.mentorIds;
  let deadline: string | null = null;

  if (liveBatch) {
    const { data, error } = await createSupabaseAdminClient()
      .from("batches")
      .select("enrollment_closes_at,batch_mentors(display_order,mentors(slug))")
      .eq("slug", liveBatch.id)
      .is("archived_at", null)
      .maybeSingle();
    const details = cohortDetails.safeParse(data);
    if (!error && details.success) {
      deadline = details.data.enrollment_closes_at;
      if (details.data.batch_mentors.length > 0) {
        mentorIds = details.data.batch_mentors
          .sort((first, second) => first.display_order - second.display_order)
          .flatMap(({ mentors: linked }) => {
            const mentor = Array.isArray(linked) ? linked[0] : linked;
            return mentor ? [mentor.slug] : [];
          });
      }
    }
  }

  const targetBatch = bookable ?? liveBatch ?? batch;
  const enrollBatchId = targetBatch?.id ?? "batch-mto-2026-01";
  const enrollHref = `/enroll?${new URLSearchParams({ course: courseId, batch: enrollBatchId })}`;

  const effectiveDeadline = authoritative
    ? bookable && deadline && Date.parse(deadline) > Date.now()
      ? deadline
      : null
    : (deadline ??
      (batch?.startDate ? `${batch.startDate}T23:59:59+06:00` : "2026-11-30T23:59:59+06:00"));
  const canEnroll =
    !authoritative ||
    Boolean(
      bookable &&
        (getBatchPayablePoisha(bookable) === 0 || getEnrollmentRuntimeConfig().submissionEnabled)
    );

  return {
    copy,
    programHref: `/courses/${courseId}`,
    enrollHref: canEnroll ? enrollHref : null,
    limited: !authoritative,
    deadline: effectiveDeadline as string | null,
    stats: [
      batch?.scheduleDescription,
      copy.visits,
      batch && formatPoishaToBDT(getBatchPayablePoisha(batch)).replace("৳", "BDT "),
    ].filter((stat): stat is string => Boolean(stat)),
    roster: getCourseMentorRoster(mentors, mentorIds)
      .filter((mentor) => !mentor.isPlaceholder && mentor.published !== false)
      .map((mentor) => ({
        id: mentor.id,
        name: mentor.name,
        role: mentor.role,
        organization: mentor.organization,
        portrait: mentor.id.includes("anubhab")
          ? "/images/mentors/anubhab-rahman-v2.png"
          : mentor.portraitSrc || "/images/mentors/anubhab-rahman-v2.png",
        logo: getMentorCompanyLogo(mentor),
      })),
  };
}

export type MtoHeroCourse = NonNullable<Awaited<ReturnType<typeof getMtoHeroCourse>>>;
