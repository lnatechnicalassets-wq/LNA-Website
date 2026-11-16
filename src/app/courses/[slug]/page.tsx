import React, { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { canBatchAcceptApplications, getBatchRepository, getCourseRepository } from "@/lib/content";
import { getCourseMentorRoster } from "@/lib/mentors";
import { getPublicMentors } from "@/server/catalog/mentors";
import { getArchivedCatalogSlugs } from "@/server/catalog/visibility";
import { getEnrollmentRuntimeConfig } from "@/server/enrollment/config";
import { getPublicCatalogFromSupabase } from "@/server/enrollment/service";
import { CourseDetailView } from "./course-detail-view";

export const dynamic = "force-dynamic";

const getCourseDetailCatalog = cache(() =>
  getPublicCatalogFromSupabase().catch(() => ({ courses: [], batches: [] }))
);

interface CoursePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const courseRepo = getCourseRepository();
  const courses = await courseRepo.getAllCourses();
  return courses.filter((c) => c.status === "published").map((c) => ({ slug: c.id }));
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { slug } = await params;
  const courseRepo = getCourseRepository();
  const [liveCatalog, repoCourse, archived] = await Promise.all([
    getCourseDetailCatalog(),
    courseRepo.getCourseById(slug),
    getArchivedCatalogSlugs(),
  ]);
  const course = liveCatalog.courses.find((item) => item.id === slug) ?? repoCourse;

  if (archived.courses.has(slug) || !course || course.status !== "published") {
    return {
      title: "Course Not Found — Lead Nation Academy",
    };
  }

  return {
    title: `${course.title} — Lead Nation Academy`,
    description: course.subtitle || course.summary || course.description,
  };
}

export default async function CourseDetailPage({ params }: CoursePageProps) {
  const { slug } = await params;
  const courseRepo = getCourseRepository();
  const batchRepo = getBatchRepository();

  const [liveCatalog, repoCourse, repoBatches, allMentors, archived] = await Promise.all([
    getCourseDetailCatalog(),
    courseRepo.getCourseById(slug),
    batchRepo.getBatchesByCourseId(slug),
    getPublicMentors(),
    getArchivedCatalogSlugs(),
  ]);
  const runtime = getEnrollmentRuntimeConfig();

  const liveCourse = liveCatalog.courses.find((c) => c.id === slug) ?? null;
  const liveBatches = liveCatalog.batches.filter((b) => b.courseId === slug);
  const usesLiveCatalogForCourse = Boolean(liveCourse || liveBatches.length > 0);
  const course = liveCourse ?? repoCourse;
  const batches = (usesLiveCatalogForCourse ? liveBatches : repoBatches).filter(
    (batch) => !archived.batches.has(batch.id)
  );
  const serverCatalogReadyForCourse = liveCatalog.courses.length === 0 || Boolean(liveCourse);

  if (archived.courses.has(slug) || !course || course.status !== "published") {
    notFound();
    return null;
  }

  // Prefer open batch with remaining seats matching server availability rules
  const activeBatch =
    batches.find((b) => canBatchAcceptApplications(b)) ??
    batches.find((b) => b.status === "open_for_enrollment") ??
    batches[0];

  // Course mentors (resolved via shared canonical roster lookup from course.mentorIds)
  const courseMentors = getCourseMentorRoster(allMentors, course);

  return (
    <CourseDetailView
      course={course}
      batch={activeBatch}
      mentors={courseMentors}
      submissionEnabled={runtime.submissionEnabled && serverCatalogReadyForCourse}
    />
  );
}
