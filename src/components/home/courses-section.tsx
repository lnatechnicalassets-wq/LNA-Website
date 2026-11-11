"use client";

import React from "react";
import type { Course, Batch, Mentor } from "@/lib/content";
import { getCourseMentorRoster } from "@/lib/mentors";
import { CourseCard } from "./course-card";

export interface CoursesSectionProps {
  courses: Course[];
  batches: Batch[];
  mentors?: Mentor[];
}

export function CoursesSection({ courses, batches, mentors = [] }: CoursesSectionProps) {
  // Prefer open_for_enrollment batches when multiple batches exist for a course (FR-CRS-004)
  const batchLookup = new Map<string, Batch>();
  for (const batch of batches) {
    if (!batchLookup.has(batch.courseId) || batch.status === "open_for_enrollment") {
      batchLookup.set(batch.courseId, batch);
    }
  }

  // Display flagship homepage courses (MTO Readiness and IRGP) in approved order
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
          .slice(0, 3);

  const openCohortCount = eligibleCourses.filter(
    (course) => batchLookup.get(course.id)?.status === "open_for_enrollment"
  ).length;

  const gridColumnsClass =
    eligibleCourses.length >= 3
      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      : "grid-cols-1 md:grid-cols-2";

  return (
    <section
      id="courses"
      aria-labelledby="courses-heading"
      className="py-14 sm:py-16 lg:py-20 bg-surface-base border-b border-border-subtle"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header aligned cleanly with card grid edges */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 sm:mb-12">
          <div>
            <div className="inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-widest text-primary">
              <span className="w-5 h-0.5 bg-primary rounded-full" aria-hidden="true" />
              <span>LEARN WITH LNA</span>
            </div>
            <h2
              id="courses-heading"
              className="mt-2 text-3xl sm:text-4xl lg:text-[42px] font-serif font-normal tracking-tight text-text-primary"
            >
              Courses &amp; Programs
            </h2>
            <p className="mt-2 text-sm sm:text-base text-text-secondary max-w-xl">
              Practical offline cohorts guided by corporate directors, founders, and industry
              practitioners.
            </p>
          </div>

          {eligibleCourses.length > 0 && openCohortCount > 0 && (
            <div className="shrink-0">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-surface-card border border-border-default text-text-secondary shadow-xs">
                <span
                  className="w-2 h-2 rounded-full bg-status-success-solid shrink-0"
                  aria-hidden="true"
                />
                <span>
                  {openCohortCount} Open {openCohortCount === 1 ? "Cohort" : "Cohorts"} · Offline
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Header-Aligned Editorial Split Grid */}
        {eligibleCourses.length > 0 ? (
          <div className={`grid ${gridColumnsClass} gap-6 lg:gap-8 items-stretch`}>
            {eligibleCourses.map((course, idx) => {
              const batch = batchLookup.get(course.id);
              const courseMentors = getCourseMentorRoster(mentors, course);

              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  batch={batch}
                  mentors={courseMentors}
                  priority={idx < 2}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 px-4 rounded-2xl bg-surface-card border border-border-subtle">
            <p className="text-lg font-semibold text-text-primary">
              No cohorts currently open for enrollment.
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              Please check back soon or reach out directly to LNA Admissions for upcoming cohort
              schedules.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

// Retain backward compatibility alias
export const FeaturedCoursesSection = CoursesSection;
