import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  BookOpen,
  Users,
  ShieldCheck,
  Award,
} from "lucide-react";
import {
  getCourseRepository,
  getBatchRepository,
  getHomeRepository,
  getMentorAvatar,
} from "@/lib/content";
import { formatPoishaToBDT } from "@/lib/money";

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
    description: course.summary,
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
  const feePoisha = activeBatch?.feePoisha ?? 3000000;
  const discountFeePoisha = activeBatch?.discountFeePoisha;
  const effectiveFeePoisha = discountFeePoisha ?? feePoisha;

  // Course mentors (assigned by courseId)
  const courseMentors = allMentors.filter((m) => m.courseId === course.id);

  // Status computation
  const statusLabel =
    activeBatch?.status === "in_progress"
      ? "Ongoing"
      : activeBatch?.status === "open_for_enrollment"
        ? "Open for Enrollment"
        : "Upcoming Cohort";

  // Duration
  const duration =
    activeBatch?.scheduleDescription && activeBatch.scheduleDescription.includes("(")
      ? activeBatch.scheduleDescription.split("(")[1]?.replace(")", "")
      : `${course.modules.length * 2} weeks`;

  return (
    <main className="min-h-screen bg-[#F6FAFA] text-[#172E35] selection:bg-[#C5E2E5] selection:text-[#086477]">
      {/* Top Navigation Bar */}
      <nav
        aria-label="Breadcrumb Navigation"
        className="border-b border-[#E5ECEE] bg-white sticky top-0 z-30 shadow-2xs"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/#courses"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#086477] hover:text-[#06505F] transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#086477] rounded-sm py-1 px-1.5 -ml-1.5"
            aria-label="Return to course catalogue"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Courses</span>
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-[#526E77]">
            Course Details
          </span>
        </div>
      </nav>

      {/* Main Content Article */}
      <article className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10">
        {/* Course Header Banner */}
        <section className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E5ECEE] shadow-sm">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#086477] bg-[#E8F3F5] px-3 py-1 rounded-full">
              {course.category}
            </span>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#D1FAE5] text-[#065F46]">
              {statusLabel}
            </span>
            <span className="text-xs font-medium text-[#526E77] flex items-center gap-1.5 ml-auto">
              <ShieldCheck className="h-3.5 w-3.5 text-[#086477]" />
              Offline In-Person Masterclass
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#172E35] leading-tight">
            {course.title}
          </h1>

          <p className="mt-3 text-base sm:text-lg text-[#526E77] leading-relaxed max-w-3xl">
            {course.subtitle || course.summary}
          </p>

          {/* Quick Key Facts Strip */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-[#E5ECEE]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#E8F3F5] text-[#086477]">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#526E77] block">
                  Duration & Schedule
                </span>
                <span className="text-sm font-bold text-[#172E35]">{duration}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#E8F3F5] text-[#086477]">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#526E77] block">
                  Campus Venue
                </span>
                <span className="text-sm font-bold text-[#172E35]">Dhanmondi, Dhaka</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#E8F3F5] text-[#086477]">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#526E77] block">
                  Tuition Fee
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-[#172E35]">
                    {formatPoishaToBDT(effectiveFeePoisha).replace("৳", "BDT ")}
                  </span>
                  {discountFeePoisha && (
                    <span className="text-xs text-[#526E77] line-through">
                      {formatPoishaToBDT(feePoisha).replace("৳", "BDT ")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Two-Column Grid: Course Content & Enrollment / Mentors */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (2 Cols): Curriculum & Learning Outcomes */}
          <div className="lg:col-span-2 space-y-8">
            {/* Program Overview */}
            <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5ECEE] shadow-sm">
              <h2 className="text-lg font-bold text-[#172E35] flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-[#086477]" />
                Program Overview
              </h2>
              <p className="text-sm sm:text-base text-[#526E77] leading-relaxed">
                {course.description}
              </p>
            </section>

            {/* Curriculum Modules */}
            <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5ECEE] shadow-sm">
              <h2 className="text-lg font-bold text-[#172E35] flex items-center gap-2 mb-6">
                <Clock className="h-5 w-5 text-[#086477]" />
                Curriculum Structure ({course.modules.length} Modules)
              </h2>

              <div className="space-y-4">
                {course.modules.map((mod, idx) => (
                  <div
                    key={mod.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[#F6FAFA] border border-[#E5ECEE]"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-xs font-bold text-[#086477] uppercase tracking-wider">
                        Module 0{idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-[#526E77] bg-white px-2.5 py-0.5 rounded-md border border-[#E5ECEE]">
                        {mod.duration}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#172E35]">{mod.title}</h3>
                    {mod.topics.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {mod.topics.map((topic, tIdx) => (
                          <li
                            key={tIdx}
                            className="text-xs sm:text-sm text-[#526E77] flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#086477] shrink-0" />
                            <span>{topic}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Learning Outcomes */}
            <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5ECEE] shadow-sm">
              <h2 className="text-lg font-bold text-[#172E35] flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-[#086477]" />
                Key Learning Outcomes
              </h2>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {course.learningOutcomes.map((outcome, idx) => (
                  <li
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#F6FAFA] border border-[#E5ECEE] text-xs sm:text-sm font-medium text-[#172E35] flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="h-4 w-4 text-[#086477] shrink-0 mt-0.5" />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Right Column (1 Col): Faculty & Admission Info */}
          <div className="space-y-8">
            {/* Program Faculty Showcase */}
            <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5ECEE] shadow-sm">
              <h2 className="text-lg font-bold text-[#172E35] flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-[#086477]" />
                Program Faculty
              </h2>

              <div className="space-y-4">
                {courseMentors.map((mentor, idx) => {
                  const avatarSrc = getMentorAvatar(mentor, idx);
                  return (
                    <Link
                      key={mentor.id}
                      href="/#mentors"
                      className="group block p-3.5 rounded-2xl bg-[#F6FAFA] border border-[#E5ECEE] hover:border-[#086477] hover:bg-white transition-all shadow-2xs"
                      aria-label={`View faculty details of ${mentor.name}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-[#E8F3F5] ring-2 ring-[#086477]/20 shrink-0">
                          <Image
                            src={avatarSrc}
                            alt={mentor.name}
                            fill
                            sizes="48px"
                            className="object-cover object-top group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-[#172E35] truncate group-hover:text-[#086477] transition-colors">
                            {mentor.name}
                          </h3>
                          <p className="text-xs text-[#526E77] truncate">{mentor.role}</p>
                          <p className="text-[11px] text-[#526E77]/80 truncate">
                            {mentor.organization}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {courseMentors.length === 0 && (
                  <p className="text-xs text-[#526E77]">Faculty announcements coming soon.</p>
                )}
              </div>
            </section>

            {/* Target Audience & Prerequisites */}
            <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5ECEE] shadow-sm space-y-5">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#526E77] mb-2.5">
                  Who Should Attend
                </h2>
                <ul className="space-y-1.5 text-xs text-[#172E35]">
                  {course.targetAudience.map((aud, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#086477] shrink-0 mt-1.5" />
                      <span>{aud}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {course.prerequisites.length > 0 && (
                <div className="pt-4 border-t border-[#E5ECEE]">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#526E77] mb-2.5">
                    Prerequisites
                  </h2>
                  <ul className="space-y-1.5 text-xs text-[#526E77]">
                    {course.prerequisites.map((pre, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#526E77] shrink-0 mt-1.5" />
                        <span>{pre}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Application / Enrollment Action Card */}
            <div className="bg-gradient-to-br from-[#086477] to-[#04333D] rounded-3xl p-6 sm:p-8 text-white shadow-md">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5E2E5] block mb-2">
                Offline Cohort Registration
              </span>
              <h2 className="text-xl font-extrabold tracking-tight">Reserve Your Seat</h2>
              <p className="text-xs text-[#E5ECEE] mt-2 leading-relaxed">
                Offline masterclasses have strictly capped cohort sizes of 25 participants.
              </p>

              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href="/#courses"
                  className="w-full text-center py-3 px-4 rounded-xl bg-white text-[#086477] font-bold text-xs shadow-xs hover:bg-[#F6FAFA] transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
                >
                  Apply via Website Cohort
                </Link>
                <span className="text-[11px] text-center text-[#C5E2E5]/80">
                  Payments via bKash gateway • Dhanmondi Executive Campus
                </span>
              </div>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
