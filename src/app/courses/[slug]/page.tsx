import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCourseRepository, getBatchRepository, getHomeRepository } from "@/lib/content";
import { getCourseMentorRoster } from "@/lib/mentors";
import { CourseDetailView } from "./course-detail-view";

interface CoursePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const courseRepo = getCourseRepository();
  const courses = await courseRepo.getAllCourses();
  return courses.map((c) => ({ slug: c.id }));
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { slug } = await params;
  const courseRepo = getCourseRepository();
  const course = await courseRepo.getCourseById(slug);

  if (!course) {
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
  const homeRepo = getHomeRepository();

  const [course, batches, allMentors] = await Promise.all([
    courseRepo.getCourseById(slug),
    batchRepo.getBatchesByCourseId(slug),
    homeRepo.getMentors(),
  ]);

  if (!course || course.status !== "published") {
    notFound();
  }

  // Active batch / enrollment data
  const activeBatch = batches.find((b) => b.status === "open_for_enrollment") ?? batches[0];

  // Course mentors (resolved via shared canonical roster lookup from course.mentorIds)
  const courseMentors = getCourseMentorRoster(allMentors, course);

  return <CourseDetailView course={course} batch={activeBatch} mentors={courseMentors} />;
}
