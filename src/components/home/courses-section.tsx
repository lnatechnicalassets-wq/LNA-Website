"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Course, Batch, Mentor } from "@/lib/content";
import { CourseCard } from "./course-card";
import { CourseDetailsModal } from "./course-details-modal";

export interface CoursesSectionProps {
  courses: Course[];
  batches: Batch[];
  mentors?: Mentor[];
}

export function CoursesSection({ courses, batches, mentors = [] }: CoursesSectionProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | undefined>(undefined);
  const [selectedMentors, setSelectedMentors] = useState<Mentor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Create lookup for batches by courseId
  const batchLookup = new Map<string, Batch>();
  for (const batch of batches) {
    if (!batchLookup.has(batch.courseId) || batch.status === "open_for_enrollment") {
      batchLookup.set(batch.courseId, batch);
    }
  }

  // Group mentors by courseId supporting both mentor.courseId and mentor.courseIds
  const mentorLookup = new Map<string, Mentor[]>();
  for (const mentor of mentors) {
    const ids = new Set<string>();
    if (mentor.courseId) ids.add(mentor.courseId);
    if (mentor.courseIds) mentor.courseIds.forEach((id) => ids.add(id));
    for (const cId of ids) {
      const existing = mentorLookup.get(cId) || [];
      existing.push(mentor);
      mentorLookup.set(cId, existing);
    }
  }

  // Filter published courses that have associated batch information
  const eligibleCourses = courses.filter(
    (course) => course.status === "published" && batchLookup.has(course.id)
  );

  // Total pages for carousel indicators (4 pages)
  const totalPages = 4;

  const updateActiveIndex = useCallback(() => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) {
      setActiveIndex(0);
      return;
    }
    const ratio = scrollLeft / maxScroll;
    const page = Math.min(Math.round(ratio * (totalPages - 1)), totalPages - 1);
    setActiveIndex(page);
  }, [totalPages]);

  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    const onScroll = () => {
      requestAnimationFrame(updateActiveIndex);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [updateActiveIndex]);

  const scrollToPage = (pageIndex: number) => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const maxScroll = container.scrollWidth - container.clientWidth;
    const targetScroll = (maxScroll / (totalPages - 1)) * pageIndex;
    container.scrollTo({ left: targetScroll, behavior: "smooth" });
    setActiveIndex(pageIndex);
  };

  const handlePrev = () => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const cardWidth = container.firstElementChild?.clientWidth || 300;
    container.scrollBy({ left: -(cardWidth + 24), behavior: "smooth" });
  };

  const handleNext = () => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const cardWidth = container.firstElementChild?.clientWidth || 300;
    container.scrollBy({ left: cardWidth + 24, behavior: "smooth" });
  };

  const handleOpenCourseModal = (
    course: Course,
    batch?: Batch,
    courseMentors?: Mentor[]
  ) => {
    setSelectedCourse(course);
    setSelectedBatch(batch);
    setSelectedMentors(courseMentors || []);
    setIsModalOpen(true);
  };

  return (
    <section
      id="courses"
      aria-labelledby="courses-heading"
      className="py-16 sm:py-20 lg:py-24 bg-[#F6FAFA] border-b border-[#E5ECEE] overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10 sm:mb-12">
          {/* Left: Eyebrow + Serif Heading + Subtitle */}
          <div>
            <span className="text-[12px] font-bold uppercase tracking-widest text-[#086477]">
              LEARN WITH LNA
            </span>
            <h2
              id="courses-heading"
              className="mt-1.5 text-3xl sm:text-4xl lg:text-[44px] font-serif font-normal tracking-tight text-[#172E35]"
            >
              Courses &amp; Programs
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#526E77] max-w-xl">
              Practical learning guided by industry professionals.
            </p>
          </div>

          {/* Right: Carousel Controls (Prev, Position 1 / 4, Next) */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous courses"
              className="w-10 h-10 rounded-full border border-[#D5E2E5] bg-white text-[#172E35] flex items-center justify-center hover:border-[#086477] hover:text-[#086477] shadow-2xs hover:shadow-xs transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <span
              className="text-sm sm:text-base font-medium text-[#172E35] min-w-[42px] text-center select-none"
              aria-live="polite"
              aria-atomic="true"
            >
              {activeIndex + 1} / {totalPages}
            </span>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next courses"
              className="w-10 h-10 rounded-full border border-[#D5E2E5] bg-white text-[#172E35] flex items-center justify-center hover:border-[#086477] hover:text-[#086477] shadow-2xs hover:shadow-xs transition-all cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Carousel Track */}
        {eligibleCourses.length > 0 ? (
          <div
            ref={carouselRef}
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {eligibleCourses.map((course, idx) => {
              const batch = batchLookup.get(course.id);
              const courseMentors = mentorLookup.get(course.id) || [];

              return (
                <div
                  key={course.id}
                  className="w-[84%] sm:w-[calc(50%-12px)] lg:w-[calc(25%-18px)] shrink-0 snap-start"
                >
                  <CourseCard
                    course={course}
                    batch={batch}
                    mentors={courseMentors}
                    priority={idx < 4}
                    onSelect={handleOpenCourseModal}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 px-4 rounded-2xl bg-white border border-[#E5ECEE]">
            <p className="text-lg font-semibold text-[#172E35]">
              No cohorts currently open for enrollment.
            </p>
            <p className="mt-2 text-sm text-[#526E77]">
              Please check back soon or reach out directly to LNA Admissions for upcoming cohort
              schedules.
            </p>
          </div>
        )}

        {/* Centered Pagination Indicator Dots (● ○ ○ ○) */}
        <div className="flex items-center justify-center gap-2 mt-8 sm:mt-10">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => scrollToPage(idx)}
              className={`transition-all duration-200 rounded-full cursor-pointer ${
                activeIndex === idx
                  ? "w-2.5 h-2.5 bg-[#086477]"
                  : "w-2 h-2 bg-[#D5E2E5] hover:bg-[#086477]/40"
              }`}
              aria-label={`Go to slide group ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Accessible Course Details Modal */}
      <CourseDetailsModal
        course={selectedCourse}
        batch={selectedBatch}
        mentors={selectedMentors}
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </section>
  );
}

// Retain backward compatibility alias
export const FeaturedCoursesSection = CoursesSection;
