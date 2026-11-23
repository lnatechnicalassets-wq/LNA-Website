import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBatchRepository, getCourseRepository } from "@/lib/content";
import { getMentorCompanyLogo, getCourseMentorRoster } from "@/lib/mentors";
import { getPublicMentors } from "@/server/catalog/mentors";
import {
  createSupabaseAdminClient,
  hasConfiguredSupabaseServerEnv,
} from "@/server/supabase/clients";
import { MentorSlideshow, type Slide } from "./readiness-hero";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "MTO Readiness Preview",
  robots: { index: false, follow: false },
};

const previewDeadline = "2026-12-01T00:00:00+06:00";
const dhakaDate = new Intl.DateTimeFormat("sv-SE", {
  dateStyle: "short",
  timeZone: "Asia/Dhaka",
});

interface MentorFraming {
  width: number;
  height: number;
  yOffset: number;
  faceCenterRatio: number;
  nameLine1: string;
  nameLine2: string;
  shortTitle: string;
  logoSrc?: string;
  logoAlt?: string;
}

// Redesign Section 6 Calibrated Presets:
// Formula:
// displayHeight = (0.35 * H) / (chinY - headTopY);
// offsetY = 0.15 * H - (H - displayHeight * (1 - headTopY));
// Result across all mentors:
// Head height: exactly 35.0% of H (224px)
// Top of hair: exactly 15.0% of H (96px from hero top)
// Chin: exactly 50.0% of H (320px from hero top)
// All torsos bleed cleanly off the bottom edge (offsetY > 0)
const mentorPresets: Record<string, MentorFraming> = {
  "/images/mentors/mohammad-salekeen-ibrahim.png": {
    width: 530,
    height: 566,
    yOffset: 8,
    faceCenterRatio: 0.451,
    nameLine1: "Mohammad Salekeen",
    nameLine2: "Ibrahim",
    shortTitle: "Head of Asset, Retail & SME Banking",
    logoSrc: "/images/partners/eastern-bank.svg",
    logoAlt: "Eastern Bank PLC",
  },
  "/images/mentors/syed-himyanuddin-ahmed.png": {
    width: 627,
    height: 627,
    yOffset: 54,
    faceCenterRatio: 0.535,
    nameLine1: "Syed Himyanuddin",
    nameLine2: "Ahmed",
    shortTitle: "Senior Associate Administrator",
  },
  "/images/mentors/anubhab-rahman-v3.png": {
    width: 690,
    height: 695,
    yOffset: 90,
    faceCenterRatio: 0.547,
    nameLine1: "Anubhab",
    nameLine2: "Rahman",
    shortTitle: "Chief Human Resources Officer",
    logoSrc: "/images/partners/nagad.svg",
    logoAlt: "Nagad Ltd.",
  },
  "/images/mentors/md-manik-hossain.png": {
    width: 490,
    height: 659,
    yOffset: 87,
    faceCenterRatio: 0.558,
    nameLine1: "Md. Manik",
    nameLine2: "Hossain",
    shortTitle: "Head of Corporate Affairs",
    logoSrc: "/images/partners/nagad.svg",
    logoAlt: "Nagad Ltd.",
  },
  "/images/mentors/mir-hasib.png": {
    width: 585,
    height: 731,
    yOffset: 151,
    faceCenterRatio: 0.511,
    nameLine1: "Mir Hasib",
    nameLine2: "Mahmud",
    shortTitle: "Senior Director & Strategy Lead",
    logoSrc: "/images/brand/logo.png",
    logoAlt: "Lead Nation Academy",
  },
};

function deriveMentorFields(mentor: { name: string; role: string }) {
  const parts = mentor.name.trim().split(/\s+/);
  const nameLine1 = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0];
  const nameLine2 = parts.length > 1 ? parts[parts.length - 1] : "";
  const shortTitle = mentor.role.replace(/,\s*[^,]*Division$/i, "").trim();
  return { nameLine1, nameLine2, shortTitle };
}

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
      startDate: batch?.startDate,
      seatsLeft: 3,
      capacity: 20,
      confirmedRatio: 0.85,
    };
  }

  const admin = createSupabaseAdminClient();
  const publicBatches = () =>
    admin
      .from("batches")
      .select(
        "id,slug,start_date,enrollment_closes_at,capacity,historical_enrolled_count,courses!inner(slug,status,archived_at)"
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

  if (!batch) {
    const { data: nextBatch } = await publicBatches()
      .in("status", ["upcoming", "open_for_enrollment"])
      .or(`enrollment_closes_at.is.null,enrollment_closes_at.gt.${timestamp}`)
      .order("start_date")
      .limit(1)
      .maybeSingle();
    return { deadline: null, startDate: nextBatch?.start_date };
  }

  return {
    deadline: batch.enrollment_closes_at ?? previewDeadline,
    batchId: batch.slug,
    startDate: batch.start_date,
    capacity: 20,
    seatsLeft: 3,
    confirmedRatio: 0.85,
  };
}

export default async function MtoTestRunPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const now = new Date();
  const [course, mentors, admissions] = await Promise.all([
    getCourseRepository().getCourseById("mto-readiness"),
    getPublicMentors(),
    getAdmissions(now),
  ]);

  const slides: Slide[] = getCourseMentorRoster(mentors, course ?? "mto-readiness").flatMap(
    (mentor) => {
      const { id, name, role, portraitSrc, isPlaceholder, organization } = mentor;
      if (!portraitSrc || isPlaceholder) return [];

      const fallbackLogo = getMentorCompanyLogo(mentor);
      const preset = mentorPresets[portraitSrc];
      const derived = deriveMentorFields({ name, role });

      const finalLogo = preset?.logoSrc
        ? { src: preset.logoSrc, alt: preset.logoAlt || organization }
        : fallbackLogo;

      return [
        {
          id,
          name,
          nameLine1: preset?.nameLine1 ?? derived.nameLine1,
          nameLine2: preset?.nameLine2 ?? derived.nameLine2,
          shortTitle: preset?.shortTitle ?? derived.shortTitle,
          role: preset?.shortTitle ?? derived.shortTitle,
          portraitSrc,
          portraitWidth: preset?.width ?? 530,
          portraitHeight: preset?.height ?? 566,
          portraitYOffset: preset?.yOffset ?? 8,
          faceCenterRatio: preset?.faceCenterRatio ?? 0.5,
          organization,
          logo: finalLogo,
        },
      ];
    }
  );

  return (
    <MentorSlideshow
      title={course?.title ?? "MTO Readiness Program"}
      slides={slides}
      admissions={admissions}
      initialNow={now.getTime()}
    />
  );
}
