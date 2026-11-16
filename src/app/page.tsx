import React from "react";
import { getHomeRepository, getCourseRepository, getBatchRepository } from "@/lib/content";
import {
  HeroSection,
  PartnersSection,
  CoursesSection,
  MentorsSection,
  ReviewsSection,
  InternshipsSection,
  ContactSection,
  MentorQuickViewProvider,
} from "@/components/home";
import { getPublicMentors } from "@/server/catalog/mentors";
import { getArchivedCatalogSlugs } from "@/server/catalog/visibility";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lead Nation Academy | Professional Education in Bangladesh",
  description:
    "Premium offline executive development masterclasses and leadership programs in Dhaka, Bangladesh. Designed for directors, C-level executives, and enterprise leaders.",
};

export default async function HomePage() {
  const homeRepo = getHomeRepository();
  const courseRepo = getCourseRepository();
  const batchRepo = getBatchRepository();

  // Load homepage data in parallel via clean repository interfaces (Rule R4)
  const [
    heroSlides,
    partners,
    allCourses,
    allBatches,
    mentors,
    reviews,
    irgpData,
    internships,
    contactConfig,
    archived,
  ] = await Promise.all([
    homeRepo.getHeroSlides(),
    homeRepo.getPartners(),
    courseRepo.getAllCourses(),
    batchRepo.getAllBatches(),
    getPublicMentors(),
    homeRepo.getReviews(),
    homeRepo.getIrgpData(),
    homeRepo.getInternships(),
    homeRepo.getContactConfig(),
    getArchivedCatalogSlugs(),
  ]);
  const courses = allCourses.filter((course) => !archived.courses.has(course.id));
  const batches = allBatches.filter(
    (batch) => !archived.courses.has(batch.courseId) && !archived.batches.has(batch.id)
  );

  return (
    <MentorQuickViewProvider>
      <div className="flex flex-col bg-surface-base">
        {/* 1. Hero Section (HeroSlider + Two-Slide Mentor Showcase) */}
        <HeroSection
          slides={heroSlides.filter(
            (slide) => !slide.courseId || !archived.courses.has(slide.courseId)
          )}
          mentors={mentors}
          courses={courses}
        />

        {/* 2. Partners Section (Corporate Sector Alignments) */}
        <PartnersSection partners={partners} />

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
