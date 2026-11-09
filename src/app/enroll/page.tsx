import React, { Suspense } from "react";
import type { Metadata } from "next";
import { getCourseRepository, getBatchRepository } from "@/lib/content";
import { getEnrollmentConfig } from "@/lib/enrollment/config";
import { EnrollmentView } from "./enrollment-view";

export const metadata: Metadata = {
  title: "Program Enrollment — Lead Nation Academy",
  description:
    "Choose a program and an available batch to get started with practical, offline executive training at Lead Nation Academy.",
  openGraph: {
    title: "Program Enrollment — Lead Nation Academy",
    description:
      "Choose a program and an available batch to get started with practical, offline executive training at Lead Nation Academy.",
  },
};

export default async function EnrollPage() {
  const courseRepo = getCourseRepository();
  const batchRepo = getBatchRepository();

  const [courses, batches] = await Promise.all([
    courseRepo.getAllCourses(),
    batchRepo.getAllBatches(),
  ]);

  const config = getEnrollmentConfig();

  return (
    <Suspense
      fallback={
        <div className="w-full bg-[#F6FAFA] min-h-screen py-16 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#086477] border-t-transparent animate-spin" />
        </div>
      }
    >
      <EnrollmentView courses={courses} batches={batches} config={config} />
    </Suspense>
  );
}
