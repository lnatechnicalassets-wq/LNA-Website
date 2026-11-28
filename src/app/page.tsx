import React, { Suspense, use } from "react";
import { getHomeRepository, getCourseRepository, getBatchRepository } from "@/lib/content";
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
import { getPublicCatalogFromSupabase } from "@/server/enrollment/service";
import { hasConfiguredSupabaseServerEnv } from "@/server/supabase/clients";
import { getPublicPartners } from "@/server/catalog/partners";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lead Nation Academy | Professional Education in Bangladesh",
  description:
    "Premium offline executive development masterclasses and leadership programs in Dhaka, Bangladesh. Designed for directors, C-level executives, and enterprise leaders.",
};

function PartnersSectionDeferred({
  partnersPromise,
}: {
  partnersPromise: ReturnType<typeof getPublicPartners>;
}) {
  const partners = use(partnersPromise);
  return <PartnersSection partners={partners} />;
}

export default async function HomePage() {
  const homeRepo = getHomeRepository();
  const courseRepo = getCourseRepository();
  const batchRepo = getBatchRepository();

  const live = hasConfiguredSupabaseServerEnv();
  const partnersPromise = getPublicPartners();

  // Load hero and shared catalog/content data without waiting on below-the-fold partners fetch
  const [
    allCourses,
    allBatches,
    mentors,
    reviews,
    irgpData,
    internships,
    contactConfig,
    archived,
    liveCatalog,
  ] = await Promise.all([
    live ? Promise.resolve([]) : courseRepo.getAllCourses(),
    live ? Promise.resolve([]) : batchRepo.getAllBatches(),
    getPublicMentors(),
    homeRepo.getReviews(),
    homeRepo.getIrgpData(),
    homeRepo.getInternships(),
    homeRepo.getContactConfig(),
    live
      ? Promise.resolve({ courses: new Set<string>(), batches: new Set<string>() })
      : getArchivedCatalogSlugs(),
    live
      ? getPublicCatalogFromSupabase().catch(() => ({ courses: [], batches: [] }))
      : Promise.resolve(null),
  ]);
  const courses = (liveCatalog?.courses ?? allCourses).filter(
    (course) => !archived.courses.has(course.id)
  );
  const batches = (liveCatalog?.batches ?? allBatches).filter(
    (batch) => !archived.courses.has(batch.courseId) && !archived.batches.has(batch.id)
  );

  const program = await getMtoHeroCourse(courses, batches, mentors, liveCatalog);

  return (
    <MentorQuickViewProvider>
      <div className="flex flex-col bg-surface-base">
        {program && <MtoHero program={program} />}

        {/* 2. Partners Section (Corporate Sector Alignments) - streamed independently */}
        <Suspense fallback={null}>
          <PartnersSectionDeferred partnersPromise={partnersPromise} />
        </Suspense>

        {/* 3. Courses Section (Offline Masterclasses & Open Batches) */}
        <CoursesSection courses={courses} batches={batches} mentors={mentors} />

        {/* 4. Mentors Section (Pixel-Faithful Layered Editorial Showcase) */}
        <MentorsSection mentors={mentors} />

        {/* 5. Section 5: Real Learning. Real Impact. (Learner Reviews & IRGP Showcase) */}
        <ReviewsSection reviews={reviews} irgpData={irgpData} />

        {/* 6. Internship Opportunities Section */}
        <InternshipsSection internships={internships} />

        {/* 7. Contact Us (Standalone 3-Zone Interactive Contact & Inquiry) */}
        <ContactSection config={contactConfig} />

        {/* 8. Footer: Rendered automatically by PublicShell wrapper */}
      </div>
    </MentorQuickViewProvider>
  );
}
