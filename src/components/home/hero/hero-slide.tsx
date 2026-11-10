"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Course, HeroSlide as HeroSlideType, Mentor } from "@/lib/content";
import { getMentorAvatar, getMentorCompanyLogo, getCourseMentorRoster } from "@/lib/mentors";
import { OfficialCompanyLogo } from "../company-logo";

export interface HeroSlideProps {
  slide: HeroSlideType;
  mentors: Mentor[];
  courses?: Course[];
  isActive: boolean;
  slideIndex: number;
  totalSlides: number;
  onMentorClick: (mentor: Mentor) => void;
}

/**
 * Render approved company logo at recognizable calibrated size directly below mentor name.
 * If verified logo asset is missing, leave slot empty and provide accessible screen-reader name.
 */
function renderMentorCompanyLogo(mentor: Mentor) {
  const logo = getMentorCompanyLogo(mentor);
  if (logo) {
    return <OfficialCompanyLogo src={logo.src} alt={logo.alt} size="hero" />;
  }

  // Missing verified logo asset: leave slot empty and provide accessible company name
  return <span className="sr-only">{mentor.organization}</span>;
}

export function HeroSlide({
  slide,
  mentors,
  courses,
  isActive,
  slideIndex,
  totalSlides,
  onMentorClick,
}: HeroSlideProps) {
  const isMto = slide.courseId === "mto-readiness" || slide.programType === "mto" || slide.id.includes("mto");
  const isIrgp = slide.courseId === "irgp" || slide.programType === "irgp" || slide.id.includes("irgp");

  // Resolve shared course mentor roster by actual catalog course ID from course.mentorIds
  const courseId = slide.courseId || (isMto ? "mto-readiness" : isIrgp ? "irgp" : undefined);
  const matchedCourse = courses?.find((c) => c.id === courseId);
  const displayMentors = courseId ? getCourseMentorRoster(mentors, matchedCourse ?? courseId, courses) : [];

  const handleSecondaryCtaClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (slide.secondaryCtaHref?.startsWith("#")) {
      e.preventDefault();
      const targetId = slide.secondaryCtaHref.substring(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        const headerOffset = typeof window !== "undefined" && window.innerWidth >= 640 ? 84 : 72;
        const elementPosition = targetEl.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
        window.history.pushState(null, "", slide.secondaryCtaHref);
      }
    }
  };

  const handleStoryClick = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("lna:open-irgp-story"));
    }
  };

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`Slide ${slideIndex + 1} of ${totalSlides}: ${slide.title}`}
      aria-hidden={!isActive}
      className={`w-full flex flex-col justify-center transition-opacity duration-500 ease-in-out ${
        isActive
          ? "opacity-100 relative z-10 pointer-events-auto"
          : "opacity-0 absolute inset-0 pointer-events-none z-0"
      }`}
    >
      {/* Main Slide Content Container filling the allocated height */}
      <div className="relative z-10 mx-auto max-w-7xl xl:max-w-[1360px] 2xl:max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-10 w-full flex flex-col justify-center py-2 sm:py-3 lg:py-3">
        {isMto ? (
          /* ========================================================= */
          /* MTO SLIDE (Full-Width Mentor Panel: 30/70 Rounded Frame)  */
          /* ========================================================= */
          <div className="w-full rounded-2xl lg:rounded-3xl border border-[#D5E2E5] bg-white shadow-[0_4px_24px_-4px_rgba(7,48,58,0.06)] overflow-hidden flex flex-col lg:flex-row my-auto">
            {/* ------------------------------------------------------- */}
            {/* LEFT PANEL (~28-30% Desktop, Solid Deep Teal with Stepped Lines) */}
            {/* ------------------------------------------------------- */}
            <div className="relative w-full lg:w-[29%] xl:w-[28%] bg-[#062D35] p-5 sm:p-6 lg:p-6 xl:p-7 flex flex-col justify-between overflow-hidden shrink-0 text-white">
              {/* Stepped-line pattern in the lower-right corner (faint, SVG) */}
              <div
                className="absolute bottom-0 right-0 w-36 h-36 pointer-events-none overflow-hidden select-none z-0"
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 140 140"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full opacity-20"
                >
                  <path
                    d="M20 140 V110 H50 V80 H80 V50 H110 V20 H140"
                    stroke="#86D4DC"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M45 140 V120 H75 V90 H105 V60 H140"
                    stroke="#86D4DC"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M70 140 V130 H95 V105 H125 V75 H140"
                    stroke="#86D4DC"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Left Top Content Block */}
              <div className="relative z-10 flex flex-col items-start">
                <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.16em] uppercase text-[#7EB8C0] select-none">
                  Lead Nation Academy
                </span>

                <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase bg-[#0C3D47]/90 text-[#86D4DC] border border-[#175A67] mt-2 sm:mt-2.5 shadow-2xs backdrop-blur-xs select-none">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"
                    aria-hidden="true"
                  />
                  <span className="sr-only">FEATURED PROGRAM</span>
                  <span>Cohort 1 · Admissions Open</span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-[28px] xl:text-[32px] font-serif font-bold tracking-tight text-white leading-[1.1] mt-3 sm:mt-3.5">
                  <span className="sr-only">MTO Readiness Program</span>
                  <span aria-hidden="true" className="block">
                    MTO
                  </span>
                  <span aria-hidden="true" className="block">
                    Readiness
                  </span>
                  <span
                    aria-hidden="true"
                    className="block italic font-serif font-normal text-[#86D4DC]"
                  >
                    Program
                  </span>
                </h1>

                <h2 className="text-xs sm:text-[13px] font-bold text-[#A2C7CD] tracking-tight leading-snug mt-2 sm:mt-2.5">
                  Graduate Career &amp; Leadership Accelerator
                </h2>

                <p className="text-[11.5px] sm:text-xs text-[#8BB7BF] leading-relaxed mt-1 max-w-[280px] font-normal">
                  Practical preparation for Management Trainee Officer opportunities.
                </p>

                {/* Program Details: 16 sessions, 1.5 hours each, BDT 7,500 */}
                <div className="flex items-center gap-2.5 sm:gap-3.5 mt-3 sm:mt-3.5 pt-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-serif text-2xl sm:text-[26px] xl:text-2xl font-bold text-white leading-none">
                      16
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[11px] sm:text-xs text-[#A2C7CD] leading-tight font-medium">
                        Sessions
                      </span>
                      <span className="text-[9.5px] text-[#73A5AD] leading-none">1.5h each</span>
                    </div>
                  </div>
                  <div className="h-5 sm:h-6 w-px bg-[#18535F] shrink-0" aria-hidden="true" />
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-serif text-xl sm:text-2xl xl:text-xl font-bold text-white leading-none">
                      BDT 7,500
                    </span>
                    <span className="text-[10.5px] sm:text-[11px] text-[#A2C7CD] leading-tight font-medium">
                      Fee
                    </span>
                  </div>
                </div>
              </div>

              {/* Left Bottom Content Block: Actions */}
              <div className="relative z-10 mt-4 sm:mt-5 pt-3 sm:pt-3.5 border-t border-[#144854] flex flex-col items-start w-full">
                <span className="text-[9.5px] sm:text-[10px] font-bold tracking-[0.14em] uppercase text-[#73A5AD] mb-2 select-none">
                  Admissions Open
                </span>

                <Link
                  href="/enroll?course=mto-readiness"
                  tabIndex={isActive ? 0 : -1}
                  className="w-full block"
                >
                  <button
                    type="button"
                    className="w-full inline-flex items-center justify-between px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#C5E2E5] hover:bg-[#B3DCE0] text-[#073A44] font-semibold text-xs sm:text-[12.5px] transition-colors shadow-2xs group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5E2E5]"
                  >
                    <span>Enroll Now</span>
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </button>
                </Link>

                <Link
                  href={slide.ctaHref || "/courses/mto-readiness"}
                  tabIndex={isActive ? 0 : -1}
                  aria-label="View Program Details — Explore the Program"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#86D4DC] hover:text-white transition-colors cursor-pointer group mt-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86D4DC] rounded-sm"
                >
                  <span>View Program Details</span>
                  <span className="sr-only">(Explore the Program)</span>
                  <ArrowRight
                    className="h-3 w-3 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>

            {/* ------------------------------------------------------- */}
            {/* RIGHT PANEL (~70-72% Desktop, Pearl with 5 MTO Mentors) */}
            {/* ------------------------------------------------------- */}
            <div className="w-full lg:w-[71%] xl:w-[72%] bg-white p-4 sm:p-5 lg:p-5 xl:p-6 flex flex-col justify-between">
              {/* Header Block */}
              <div className="flex flex-col items-start mb-2.5 sm:mb-3">
                <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.14em] uppercase text-[#086477] select-none">
                  Faculty / Featured Program
                </span>
                <h2 className="font-serif text-xl sm:text-2xl lg:text-[24px] xl:text-[28px] font-bold text-[#172E35] tracking-tight leading-tight mt-0.5">
                  Meet your MTO mentors
                </h2>
                <div className="sr-only">
                  <span>MTO PROGRAM FACULTY</span>
                  <h3>Learn From Industry Leaders</h3>
                  <span>Class Starts From</span>
                  <span>December 1, 2026</span>
                </div>
              </div>

              {/* Static Grid: 3 cards on first row, 2 centered below */}
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-2.5 xl:gap-3 w-full">
                {displayMentors.slice(0, 5).map((mentor, index) => {
                  const desktopSpanClass =
                    index === 3
                      ? "lg:col-span-2 lg:col-start-2"
                      : index === 4
                        ? "lg:col-span-2 lg:col-start-4"
                        : "lg:col-span-2";

                  return (
                    <div
                      key={mentor.id}
                      onClick={() => onMentorClick(mentor)}
                      role="button"
                      tabIndex={isActive ? 0 : -1}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onMentorClick(mentor);
                        }
                      }}
                      className={`group relative flex flex-col rounded-xl border border-[#D5E2E5] bg-white p-2 hover:border-[#086477]/40 hover:shadow-xs transition-all duration-200 cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#086477] col-span-1 ${desktopSpanClass}`}
                      aria-label={`View mentor profile: ${mentor.name}${mentor.role ? `, ${mentor.role}` : ""} at ${mentor.organization}`}
                    >
                      {/* Taller portrait area with soft teal photo background */}
                      <div className="relative w-full aspect-[4/3] sm:aspect-[4/3.2] lg:aspect-[4/2.8] xl:aspect-[4/3] max-h-[140px] sm:max-h-[150px] lg:max-h-[140px] xl:max-h-[155px] rounded-lg bg-[#E6F3F5] overflow-hidden flex items-end justify-center pt-1.5">
                        <Image
                          src={getMentorAvatar(mentor, index)}
                          alt={mentor.name}
                          fill
                          sizes="(max-width: 640px) 160px, (max-width: 1024px) 180px, 200px"
                          className="object-contain object-bottom transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>

                      {/* Mentor Name, Designation & Official Company Logo Directly Below */}
                      <div className="mt-1.5 flex flex-col gap-0.5 w-full">
                        <span className="text-[11px] sm:text-[11.5px] font-bold text-[#172E35] truncate leading-tight group-hover:text-[#086477] transition-colors">
                          {mentor.name}
                        </span>
                        <span className="text-[10px] sm:text-[10.5px] text-[#526E77] truncate leading-tight">
                          {mentor.role}
                        </span>
                        <div className="h-8 sm:h-9 mt-0.5 flex items-center">
                          {renderMentorCompanyLogo(mentor)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* IRGP SLIDE (Full-Width Mentor Panel: 30/70 Rounded Frame) */
          /* ========================================================= */
          <div className="w-full rounded-2xl lg:rounded-3xl border border-[#D5E2E5] bg-white shadow-[0_4px_24px_-4px_rgba(7,48,58,0.06)] overflow-hidden flex flex-col lg:flex-row my-auto">
            {/* ------------------------------------------------------- */}
            {/* LEFT PANEL (~28-30% Desktop, Deep Teal with Event Photo) */}
            {/* ------------------------------------------------------- */}
            <div className="relative w-full lg:w-[29%] xl:w-[28%] bg-[#062D35] p-5 sm:p-6 lg:p-6 xl:p-7 flex flex-col justify-between overflow-hidden shrink-0 text-white">
              {/* Event photo under dark teal overlay */}
              <div
                className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
                aria-hidden="true"
              >
                <Image
                  src="/images/irgp/aiub-classroom-1.jpeg"
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 420px"
                  className="object-cover object-[center_35%] opacity-25 mix-blend-luminosity"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#062D35]/95 via-[#062D35]/80 to-[#062D35]/98" />
              </div>

              {/* Left Top Content Block */}
              <div className="relative z-10 flex flex-col items-start">
                <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.16em] uppercase text-[#7EB8C0] select-none">
                  Lead Nation Academy
                </span>

                <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase bg-[#0C3D47]/90 text-[#86D4DC] border border-[#175A67] mt-2 sm:mt-2.5 shadow-2xs backdrop-blur-xs select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" aria-hidden="true" />
                  <span className="sr-only">IRGP</span>
                  <span>Completed program · IRGP</span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-[28px] xl:text-[32px] font-serif font-bold tracking-tight text-white leading-[1.1] mt-3 sm:mt-3.5">
                  <span className="sr-only">Industry Readiness Graduate Program</span>
                  <span aria-hidden="true" className="block">
                    Industry
                  </span>
                  <span aria-hidden="true" className="block">
                    Readiness
                  </span>
                  <span
                    aria-hidden="true"
                    className="block italic font-serif font-normal text-[#86D4DC]"
                  >
                    Graduate Program
                  </span>
                </h1>

                <p className="text-xs sm:text-[12.5px] text-[#A2C7CD] leading-relaxed mt-2 sm:mt-2.5 max-w-[280px] font-normal">
                  Practical learning guided by industry professionals.
                </p>

                {/* 10 Focus areas | 8 Industry mentors */}
                <div className="flex items-center gap-3 sm:gap-3.5 mt-3 sm:mt-3.5 pt-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-serif text-2xl sm:text-[26px] xl:text-2xl font-bold text-white leading-none">
                      10
                    </span>
                    <span className="text-[11px] sm:text-xs text-[#A2C7CD] leading-tight font-medium">
                      Focus areas
                    </span>
                  </div>
                  <div className="h-5 sm:h-6 w-px bg-[#18535F] shrink-0" aria-hidden="true" />
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-serif text-2xl sm:text-[26px] xl:text-2xl font-bold text-white leading-none">
                      8
                    </span>
                    <span className="text-[11px] sm:text-xs text-[#A2C7CD] leading-tight font-medium">
                      Industry mentors
                    </span>
                  </div>
                </div>
              </div>

              {/* Left Bottom Content Block: Program Archive Actions */}
              <div className="relative z-10 mt-4 sm:mt-5 pt-3 sm:pt-3.5 border-t border-[#144854] flex flex-col items-start w-full">
                <span className="text-[9.5px] sm:text-[10px] font-bold tracking-[0.14em] uppercase text-[#73A5AD] mb-2 select-none">
                  Program archive
                </span>

                <Link
                  href={slide.ctaHref || "/courses/irgp"}
                  tabIndex={isActive ? 0 : -1}
                  onClick={handleStoryClick}
                  className="w-full block"
                >
                  <button
                    type="button"
                    className="w-full inline-flex items-center justify-between px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#C5E2E5] hover:bg-[#B3DCE0] text-[#073A44] font-semibold text-xs sm:text-[12.5px] transition-colors shadow-2xs group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5E2E5]"
                  >
                    <span>Explore the IRGP Story</span>
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </button>
                </Link>

                <a
                  href={slide.secondaryCtaHref || "#reviews"}
                  tabIndex={isActive ? 0 : -1}
                  onClick={handleSecondaryCtaClick}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#86D4DC] hover:text-white transition-colors cursor-pointer group mt-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86D4DC] rounded-sm"
                >
                  <span>View Learner Experiences</span>
                  <ArrowRight
                    className="h-3 w-3 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </a>
              </div>
            </div>

            {/* ------------------------------------------------------- */}
            {/* RIGHT PANEL (~70-72% Desktop, Pearl with 4x2 Mentor Grid) */}
            {/* ------------------------------------------------------- */}
            <div className="w-full lg:w-[71%] xl:w-[72%] bg-white p-4 sm:p-5 lg:p-5 xl:p-6 flex flex-col justify-between">
              {/* Header Block */}
              <div className="flex flex-col items-start mb-2.5 sm:mb-3">
                <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.14em] uppercase text-[#086477] select-none">
                  Mentors / Completed Program
                </span>
                <h2 className="font-serif text-xl sm:text-2xl lg:text-[24px] xl:text-[28px] font-bold text-[#172E35] tracking-tight leading-tight mt-0.5">
                  The people behind IRGP.
                </h2>
              </div>

              {/* Static 4x2 Mentor Grid on Desktop, 2-col/1-col on Mobile */}
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 xl:gap-3 w-full">
                {displayMentors.slice(0, 8).map((mentor) => (
                  <div
                    key={mentor.id}
                    onClick={() => onMentorClick(mentor)}
                    role="button"
                    tabIndex={isActive ? 0 : -1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onMentorClick(mentor);
                      }
                    }}
                    className="group relative flex flex-col rounded-xl border border-[#D5E2E5] bg-white p-2 hover:border-[#086477]/40 hover:shadow-xs transition-all duration-200 cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#086477]"
                    aria-label={`View mentor profile: ${mentor.name} at ${mentor.organization}`}
                  >
                    {/* Taller portrait area with soft teal photo background */}
                    <div className="relative w-full aspect-[4/3.6] min-[420px]:aspect-square sm:aspect-[4/4] lg:aspect-[4/3.4] xl:aspect-[4/3.6] max-h-[135px] sm:max-h-[150px] lg:max-h-[140px] xl:max-h-[150px] rounded-lg bg-[#E6F3F5] overflow-hidden flex items-end justify-center pt-1.5">
                      <Image
                        src={getMentorAvatar(mentor)}
                        alt={mentor.name}
                        fill
                        sizes="(max-width: 640px) 160px, (max-width: 1024px) 180px, 200px"
                        className="object-contain object-bottom transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>

                    {/* Mentor Name & Official Company Logo Directly Below */}
                    <div className="mt-1.5 flex flex-col gap-0.5 w-full">
                      <span className="text-[11px] sm:text-[11.5px] font-bold text-[#172E35] truncate leading-tight group-hover:text-[#086477] transition-colors">
                        {mentor.name}
                      </span>
                      <div className="h-8 sm:h-9 mt-0.5 flex items-center">
                        {renderMentorCompanyLogo(mentor)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
