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

export const metadata = {
  title: "Lead Nation Academy | Professional Education in Bangladesh",
  description:
    "Premium offline executive development masterclasses and leadership programs in Dhanmondi, Dhaka. Designed for directors, C-level executives, and enterprise leaders.",
};

export default async function HomePage() {
  const homeRepo = getHomeRepository();
  const courseRepo = getCourseRepository();
  const batchRepo = getBatchRepository();

  // Load homepage data in parallel via clean repository interfaces (Rule R4)
  const [
    heroSlides,
    partners,
    courses,
    batches,
    mentors,
    reviews,
    irgpData,
    internships,
    contactConfig,
  ] = await Promise.all([
    homeRepo.getHeroSlides(),
    homeRepo.getPartners(),
    courseRepo.getAllCourses(),
    batchRepo.getAllBatches(),
    homeRepo.getMentors(),
    homeRepo.getReviews(),
    homeRepo.getIrgpData(),
    homeRepo.getInternships(),
    homeRepo.getContactConfig(),
  ]);

  return (
    <MentorQuickViewProvider>
      <div className="flex flex-col bg-surface-base">
        {/* 1. Hero Section (HeroSlider + Two-Slide Mentor Showcase) */}
        <HeroSection slides={heroSlides} mentors={mentors} courses={courses} />

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
