"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Course, Batch, Mentor } from "@/lib/content";
import { getCourseMentorRoster } from "@/lib/mentors";
import { CourseCard } from "./course-card";

export interface CoursesSectionProps {
  courses: Course[];
  batches: Batch[];
  mentors?: Mentor[];
}

export function CoursesSection({ courses, batches, mentors = [] }: CoursesSectionProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScroll, setCanScroll] = useState(false);

  // Create lookup for batches by courseId
  const batchLookup = new Map<string, Batch>();
  for (const batch of batches) {
    if (!batchLookup.has(batch.courseId) || batch.status === "open_for_enrollment") {
      batchLookup.set(batch.courseId, batch);
    }
  }

  // Display exactly two homepage cards: MTO Readiness and IRGP per approved architecture
  const targetIds = ["mto-readiness", "irgp"];
  const targeted = targetIds
    .map((id) => courses.find((c) => c.id === id))
    .filter(
      (c): c is Course => c !== undefined && c.status === "published" && batchLookup.has(c.id)
    );

  const eligibleCourses =
    targeted.length > 0
      ? targeted
      : courses
          .filter((course) => course.status === "published" && batchLookup.has(course.id))
          .slice(0, 2);

  const totalSteps = Math.max(1, eligibleCourses.length);

  const updateScrollState = useCallback(() => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    const maxScroll = scrollWidth - clientWidth;

    setCanScroll(maxScroll > 10);

    if (maxScroll <= 0) {
      setActiveIndex(0);
      return;
    }

    const ratio = scrollLeft / maxScroll;
    const page = Math.min(Math.round(ratio * (totalSteps - 1)), totalSteps - 1);
    setActiveIndex(page);
  }, [totalSteps]);

  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    updateScrollState();

    const onScroll = () => {
      requestAnimationFrame(updateScrollState);
    };

    window.addEventListener("resize", updateScrollState);
    container.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", updateScrollState);
      container.removeEventListener("scroll", onScroll);
    };
  }, [updateScrollState]);

  const scrollToPage = (pageIndex: number) => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll <= 0) return;
    const targetScroll = (maxScroll / (totalSteps - 1)) * pageIndex;
    container.scrollTo({ left: targetScroll, behavior: "smooth" });
    setActiveIndex(pageIndex);
  };

  const handlePrev = () => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const cardWidth = container.firstElementChild?.clientWidth || 320;
    container.scrollBy({ left: -(cardWidth + 24), behavior: "smooth" });
  };

  const handleNext = () => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const cardWidth = container.firstElementChild?.clientWidth || 320;
    container.scrollBy({ left: cardWidth + 24, behavior: "smooth" });
  };

  return (
    <section
      id="courses"
      aria-labelledby="courses-heading"
      className="py-14 sm:py-16 lg:py-20 bg-[#F6FAFA] border-b border-[#E5ECEE] overflow-hidden"
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
              className="mt-1.5 text-3xl sm:text-4xl lg:text-[42px] font-serif font-normal tracking-tight text-[#172E35]"
            >
              Courses &amp; Programs
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#526E77] max-w-xl">
              Practical learning guided by industry professionals.
            </p>
          </div>

          {/* Right: Carousel Controls (Reflects actual overflow) */}
          {canScroll && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handlePrev}
                disabled={activeIndex === 0}
                aria-label="Previous courses"
                className={`w-10 h-10 rounded-full border border-[#D5E2E5] bg-white text-[#172E35] flex items-center justify-center shadow-2xs transition-all ${
                  activeIndex === 0
                    ? "opacity-50 cursor-default"
                    : "hover:border-[#086477] hover:text-[#086477] hover:shadow-xs cursor-pointer"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <span
                className="text-sm sm:text-base font-medium text-[#172E35] min-w-[38px] text-center select-none"
                aria-live="polite"
                aria-atomic="true"
              >
                {activeIndex + 1} / {totalSteps}
              </span>

              <button
                type="button"
                onClick={handleNext}
                disabled={activeIndex === totalSteps - 1}
                aria-label="Next courses"
                className={`w-10 h-10 rounded-full border border-[#D5E2E5] bg-white text-[#172E35] flex items-center justify-center shadow-2xs transition-all ${
                  activeIndex === totalSteps - 1
                    ? "opacity-50 cursor-default"
                    : "hover:border-[#086477] hover:text-[#086477] hover:shadow-xs cursor-pointer"
                }`}
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Centered Vertical Cards: exactly two cards (MTO & IRGP) in true vertical proportions */}
        {eligibleCourses.length > 0 ? (
          <div
            ref={carouselRef}
            className="flex items-center justify-start sm:justify-center gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:overflow-visible"
          >
            {eligibleCourses.map((course, idx) => {
              const batch = batchLookup.get(course.id);
              const courseMentors = getCourseMentorRoster(mentors, course);

              return (
                <div
                  key={course.id}
                  className="w-[84%] max-w-[330px] sm:w-[320px] shrink-0 snap-center sm:snap-start flex justify-center"
                >
                  <CourseCard
                    course={course}
                    batch={batch}
                    mentors={courseMentors}
                    priority={idx < 2}
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

        {/* Centered Pagination Indicator Dots (shown only when scrollable) */}
        {canScroll && (
          <div className="flex items-center justify-center gap-2 mt-8 sm:mt-10 lg:hidden">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToPage(idx)}
                className={`transition-all duration-200 rounded-full cursor-pointer ${
                  activeIndex === idx
                    ? "w-2.5 h-2.5 bg-[#086477]"
                    : "w-2 h-2 bg-[#D5E2E5] hover:bg-[#086477]/40"
                }`}
                aria-label={`Go to course ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// Retain backward compatibility alias
export const FeaturedCoursesSection = CoursesSection;
