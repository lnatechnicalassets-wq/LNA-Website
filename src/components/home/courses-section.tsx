import React from "react";
import type { Course, Batch, Mentor } from "@/lib/content";
import { Badge } from "@/components/ui";
import { CourseCard } from "./course-card";

export interface CoursesSectionProps {
  courses: Course[];
  batches: Batch[];
  mentors?: Mentor[];
}

export function CoursesSection({ courses, batches, mentors = [] }: CoursesSectionProps) {
  // Create lookup for batches by courseId
  const batchLookup = new Map<string, Batch>();
  for (const batch of batches) {
    if (!batchLookup.has(batch.courseId) || batch.status === "open_for_enrollment") {
      batchLookup.set(batch.courseId, batch);
    }
  }

  // Group mentors by courseId
  const mentorLookup = new Map<string, Mentor[]>();
  for (const mentor of mentors) {
    if (mentor.courseId) {
      const existing = mentorLookup.get(mentor.courseId) || [];
      existing.push(mentor);
      mentorLookup.set(mentor.courseId, existing);
    }
  }

  // Filter published courses that have associated batch information
  const eligibleCourses = courses.filter(
    (course) => course.status === "published" && batchLookup.has(course.id)
  );

  return (
    <section
      id="courses"
      aria-labelledby="courses-heading"
      className="py-20 sm:py-28 bg-[#F6FAFA] border-b border-[#E5ECEE]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header: Inclusive heading and messaging suitable for all LNA programs */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
          <Badge variant="primary" size="sm" className="mb-3 font-semibold uppercase">
            Academy Curriculum
          </Badge>
          <h2
            id="courses-heading"
            className="text-3xl font-extrabold tracking-tight text-[#172E35] sm:text-4xl lg:text-5xl"
          >
            Explore Our Courses
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#526E77] leading-relaxed">
            Practical, career-defining offline courses taught by industry veterans in Dhanmondi,
            Dhaka. Designed to build actionable skills and leadership across every career stage.
          </p>
        </div>

        {/* Course Catalog Grid (3 Columns on Desktop, Responsive 2-Col Tablet, 1-Col Mobile) */}
        {eligibleCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {eligibleCourses.map((course, idx) => {
              const batch = batchLookup.get(course.id);
              const courseMentors = mentorLookup.get(course.id) || [];

              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  batch={batch}
                  mentors={courseMentors}
                  priority={idx < 3}
                />
              );
            })}
          </div>
        ) : (
          /* Empty state when no published courses qualify */
          <div className="text-center py-16 px-4 rounded-3xl bg-white border border-[#E5ECEE]">
            <p className="text-lg font-semibold text-[#172E35]">
              No cohorts currently open for enrollment.
            </p>
            <p className="mt-2 text-sm text-[#526E77]">
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
