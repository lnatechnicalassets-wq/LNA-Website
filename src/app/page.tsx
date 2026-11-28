import React, { Suspense, use } from "react";
import { getHomeRepository, getCourseRepository, getBatchRepository } from "@/lib/content";
import type { Batch, Course, Mentor } from "@/lib/content";
import { HomepageSectionScroll } from "@/components/home/homepage-section-scroll";
import {
  PartnersSection,
  CoursesSection,
  MentorsSection,
  ReviewsSection,
  InternshipsSection,
  ContactSection,
  MentorQuickViewProvider,
} from "@/components/home";
import { MtoHero } from "@/components/home/hero/mto-hero";
import { getMtoHeroCourse } from "@/server/catalog/mto-hero";
import { getPublicMentors } from "@/server/catalog/mentors";
import { getArchivedCatalogSlugs } from "@/server/catalog/visibility";
import { loadHomepageCatalog } from "@/server/enrollment/service";
import { hasConfiguredSupabaseServerEnv } from "@/server/supabase/clients";
import { getPublicPartners } from "@/server/catalog/partners";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lead Nation Academy | Professional Education in Bangladesh",
  description:
    "Premium offline executive development masterclasses and leadership programs in Dhaka, Bangladesh. Designed for directors, C-level executives, and enterprise leaders.",
};

type Catalog = { courses: Course[]; batches: Batch[] };

async function loadHomepageFixtureCatalog(): Promise<Catalog> {
  const [courses, batches, archived] = await Promise.all([
    getCourseRepository().getAllCourses(),
    getBatchRepository().getAllBatches(),
    getArchivedCatalogSlugs(),
  ]);

  return {
    courses: courses.filter((course) => !archived.courses.has(course.id)),
    batches: batches.filter(
      (batch) => !archived.courses.has(batch.courseId) && !archived.batches.has(batch.id)
    ),
  };
}

function ConfirmedHero({ program }: { program: ReturnType<typeof getMtoHeroCourse> }) {
  const resolved = use(program);
  return resolved && <MtoHero program={resolved} />;
}

function HomepagePartners({ partners }: { partners: ReturnType<typeof getPublicPartners> }) {
  return <PartnersSection partners={use(partners)} />;
}

function HomepageCourses({ data }: { data: Promise<readonly [Catalog, Mentor[]]> }) {
  const [{ courses, batches }, mentors] = use(data);
  return (
    <>
      <CoursesSection courses={courses} batches={batches} mentors={mentors} />
      <HomepageSectionScroll id="courses" />
    </>
  );
}

function HomepageMentors({ mentors }: { mentors: Promise<Mentor[]> }) {
  return (
    <>
      <MentorsSection mentors={use(mentors)} />
      <HomepageSectionScroll id="mentors" />
    </>
  );
}

function HomepageHero({
  presentation,
  confirmed,
}: {
  presentation: ReturnType<typeof getMtoHeroCourse>;
  confirmed: ReturnType<typeof getMtoHeroCourse> | null;
}) {
  const program = use(presentation);
  if (!program) return null;
  if (!confirmed) return <MtoHero program={program} />;

  return (
    <Suspense
      fallback={
        <MtoHero program={{ ...program, enrollHref: null, deadline: null }} availabilityPending />
      }
    >
      <ConfirmedHero program={confirmed} />
    </Suspense>
  );
}

function HomepageStories({ data }: { data: ReturnType<typeof loadHomepageStories> }) {
  const { reviews, irgpData, internships, contactConfig } = use(data);
  return (
    <>
      <ReviewsSection reviews={reviews} irgpData={irgpData} />
      <InternshipsSection internships={internships} />
      <HomepageSectionScroll id="internships" />
      <ContactSection config={contactConfig} />
      <HomepageSectionScroll id="contact" />
    </>
  );
}

async function loadHomepageStories() {
  const home = getHomeRepository();
  const [reviews, irgpData, internships, contactConfig] = await Promise.all([
    home.getReviews(),
    home.getIrgpData(),
    home.getInternships(),
    home.getContactConfig(),
  ]);
  return { reviews, irgpData, internships, contactConfig };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ section?: string | string[] }>;
} = {}) {
  const prioritizeMentors = (await searchParams)?.section === "mentors";
  const live = hasConfiguredSupabaseServerEnv() ? loadHomepageCatalog() : null;
  const mentors = getPublicMentors();

  const catalog = live?.availability ?? loadHomepageFixtureCatalog();
  const presentation = live
    ? Promise.all([live.presentation, mentors]).then(([data, roster]) =>
        getMtoHeroCourse(data.courses, data.batches, roster, data)
      )
    : Promise.all([catalog, mentors]).then(([data, roster]) =>
        getMtoHeroCourse(data.courses, data.batches, roster, null)
      );
  const confirmed = live
    ? Promise.all([live.availability, mentors]).then(([data, roster]) =>
        getMtoHeroCourse(data.courses, data.batches, roster, data)
      )
    : null;

  // Let the requested content reach the browser before starting secondary sections.
  await (prioritizeMentors ? mentors : presentation);

  const partners = getPublicPartners();
  const courseSection = Promise.all([catalog, mentors] as const);
  const mentorSection = prioritizeMentors ? mentors : catalog.then(() => mentors);
  const stories = loadHomepageStories();

  return (
    <MentorQuickViewProvider>
      <div className="flex flex-col bg-surface-base">
        <Suspense fallback={null}>
          <HomepageHero presentation={presentation} confirmed={confirmed} />
        </Suspense>
        <Suspense fallback={null}>
          <HomepagePartners partners={partners} />
        </Suspense>
        <Suspense fallback={null}>
          <HomepageCourses data={courseSection} />
        </Suspense>
        <Suspense fallback={null}>
          <HomepageMentors mentors={mentorSection} />
        </Suspense>
        <Suspense fallback={null}>
          <HomepageStories data={stories} />
        </Suspense>
      </div>
    </MentorQuickViewProvider>
  );
}
