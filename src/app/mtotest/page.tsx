import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBatchRepository, getBatchPayablePoisha, getCourseRepository } from "@/lib/content";
import { formatPoishaToBDT } from "@/lib/money";
import { getMentorCompanyLogo, getCourseMentorRoster } from "@/lib/mentors";
import { getPublicMentors } from "@/server/catalog/mentors";
import {
  createSupabaseAdminClient,
  hasConfiguredSupabaseServerEnv,
} from "@/server/supabase/clients";
import { MentorSlideshow } from "./slideshow";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "MTO Readiness Glass Sweep Preview",
  robots: { index: false, follow: false },
};

const previewDeadline = "2026-12-01T00:00:00+06:00";
const dhakaDate = new Intl.DateTimeFormat("sv-SE", {
  dateStyle: "short",
  timeZone: "Asia/Dhaka",
});

async function getAdmissions(now: Date) {
  const today = dhakaDate.format(now);
  const timestamp = now.toISOString();
  if (!hasConfiguredSupabaseServerEnv()) {
    const batches = await getBatchRepository().getBatchesByCourseId("mto-readiness");
    const batch = batches.find(
      ({ status, startDate }) => status === "open_for_enrollment" && startDate >= today
    );
    const isOpen = batch && timestamp < new Date(previewDeadline).toISOString();
    return {
      deadline: isOpen ? previewDeadline : null,
      batchId: isOpen ? batch.id : undefined,
      fee: batch && formatPoishaToBDT(getBatchPayablePoisha(batch)),
    };
  }

  const admin = createSupabaseAdminClient();
  const publicBatches = () =>
    admin
      .from("batches")
      .select(
        "id,slug,enrollment_closes_at,capacity,historical_enrolled_count,fee_poisha,discount_fee_poisha,courses!inner(slug,status,archived_at)"
      )
      .eq("courses.slug", "mto-readiness")
      .eq("courses.status", "published")
      .is("courses.archived_at", null)
      .is("archived_at", null)
      .gte("start_date", today);

  const { data: batch } = await publicBatches()
    .eq("status", "open_for_enrollment")
    .or(`enrollment_opens_at.is.null,enrollment_opens_at.lte.${timestamp}`)
    .or(`enrollment_closes_at.is.null,enrollment_closes_at.gt.${timestamp}`)
    .order("enrollment_closes_at", { nullsFirst: false })
    .order("start_date")
    .limit(1)
    .maybeSingle();

  if (!batch) return { deadline: null };

  const activeSeats = await admin.rpc("count_batch_active_seats", { p_batch_id: batch.id });
  const historicalSeats = batch.historical_enrolled_count ?? 0;
  const hasCapacity = Number.isSafeInteger(batch.capacity) && batch.capacity > 0;
  const seatsLeft =
    hasCapacity &&
    !activeSeats.error &&
    Number.isSafeInteger(activeSeats.data) &&
    activeSeats.data >= 0
      ? Math.max(0, batch.capacity - historicalSeats - activeSeats.data)
      : undefined;
  return {
    deadline: batch.enrollment_closes_at,
    batchId: batch.slug,
    fee: formatPoishaToBDT(batch.discount_fee_poisha ?? batch.fee_poisha),
    seatsLeft,
    limited: seatsLeft !== undefined && seatsLeft > 0 && seatsLeft <= batch.capacity * 0.2,
  };
}

export default async function MtoGlassSweepPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const now = new Date();
  const [course, mentors, admissions] = await Promise.all([
    getCourseRepository().getCourseById("mto-readiness"),
    getPublicMentors(),
    getAdmissions(now),
  ]);
  const slides = getCourseMentorRoster(mentors, course ?? "mto-readiness").flatMap((mentor) => {
    const { id, name, role, portraitSrc, isPlaceholder, organization } = mentor;
    return portraitSrc && !isPlaceholder
      ? [
          {
            id,
            name,
            role,
            portraitSrc,
            organization,
            companyLogoSrc: getMentorCompanyLogo(mentor)?.src,
          },
        ]
      : [];
  });

  return (
    <MentorSlideshow
      title={course?.title ?? "MTO Readiness Program"}
      slides={slides}
      admissions={admissions}
      initialNow={now.getTime()}
    />
  );
}
