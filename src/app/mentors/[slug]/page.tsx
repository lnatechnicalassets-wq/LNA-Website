import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Building2, Briefcase, GraduationCap } from "lucide-react";
import { getHomeRepository, getCourseRepository, getMentorAvatar } from "@/lib/content";

interface MentorPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const repo = getHomeRepository();
  const mentors = await repo.getMentors();
  return mentors.map((m) => ({ slug: m.id }));
}

export async function generateMetadata({ params }: MentorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const repo = getHomeRepository();
  const mentor = await repo.getMentorById(slug);

  if (!mentor) {
    return {
      title: "Mentor Not Found — Lead Nation Academy",
    };
  }

  return {
    title: `${mentor.name} — Lead Nation Academy Faculty`,
    description: `${mentor.name}, ${mentor.role} at ${mentor.organization}. ${mentor.bio}`,
  };
}

export default async function MentorProfilePage({ params }: MentorPageProps) {
  const { slug } = await params;
  const homeRepo = getHomeRepository();
  const courseRepo = getCourseRepository();

  const mentor = await homeRepo.getMentorById(slug);

  if (!mentor) {
    notFound();
  }

  const avatarSrc = getMentorAvatar(mentor);
  const associatedCourse = mentor.courseId ? await courseRepo.getCourseById(mentor.courseId) : null;

  return (
    <main className="min-h-screen bg-[#F6FAFA] text-[#172E35] selection:bg-[#C5E2E5] selection:text-[#086477]">
      {/* Top Navigation Bar */}
      <nav
        aria-label="Breadcrumb Navigation"
        className="border-b border-[#E5ECEE] bg-white sticky top-0 z-30 shadow-2xs"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/#courses"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#086477] hover:text-[#06505F] transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#086477] rounded-sm py-1 px-1.5 -ml-1.5"
            aria-label="Return to course catalogue"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Courses</span>
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-[#526E77]">
            Faculty Profile
          </span>
        </div>
      </nav>

      {/* Main Profile Article */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E5ECEE] shadow-sm">
          {/* Faculty Header: Portrait, Name, and Roles */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 pb-8 border-b border-[#E5ECEE]">
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden bg-[#E8F3F5] ring-4 ring-[#086477]/15 shadow-md shrink-0">
              <Image
                src={avatarSrc}
                alt={mentor.name}
                fill
                priority
                sizes="(max-width: 640px) 128px, 160px"
                className="object-cover object-top"
              />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F3F5] text-[#086477] mb-3">
                Lead Nation Academy Faculty
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#172E35]">
                {mentor.name}
              </h1>

              <div className="mt-2.5 flex items-center justify-center sm:justify-start gap-2 text-base font-semibold text-[#086477]">
                <Briefcase className="h-4 w-4 shrink-0" />
                <span>{mentor.role}</span>
              </div>

              {mentor.organization && (
                <div className="mt-1.5 flex items-center justify-center sm:justify-start gap-2 text-sm text-[#526E77]">
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span>{mentor.organization}</span>
                </div>
              )}
            </div>
          </div>

          {/* Approved Professional Biography */}
          <section className="py-8 border-b border-[#E5ECEE]">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#526E77] mb-3">
              Professional Biography
            </h2>
            <p className="text-base text-[#172E35] leading-relaxed">{mentor.bio}</p>
          </section>

          {/* Associated Program Information */}
          {associatedCourse && (
            <section className="pt-8">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#526E77] mb-3">
                Instructs in Program
              </h2>
              <div className="rounded-2xl bg-[#F6FAFA] border border-[#E5ECEE] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#526E77] block mb-1">
                    {associatedCourse.category}
                  </span>
                  <h3 className="text-lg font-bold text-[#172E35]">{associatedCourse.title}</h3>
                  <p className="text-xs text-[#526E77] mt-1 max-w-xl">{associatedCourse.summary}</p>
                </div>
                <Link
                  href={`/courses/${associatedCourse.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#086477] text-white text-xs font-semibold shadow-xs hover:bg-[#06505F] transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#086477] shrink-0"
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>View Program Details</span>
                </Link>
              </div>
            </section>
          )}
        </div>
      </article>
    </main>
  );
}
