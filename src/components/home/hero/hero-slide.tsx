"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  Layers,
  TrendingUp,
  Users,
} from "lucide-react";
import type { HeroSlide as HeroSlideType, Mentor } from "@/lib/content";
import { Button } from "@/components/ui";
import { HeroMentorCard } from "./hero-mentor-card";

export interface HeroSlideProps {
  slide: HeroSlideType;
  mentors: Mentor[];
  isActive: boolean;
  slideIndex: number;
  totalSlides: number;
  onMentorClick: (mentor: Mentor) => void;
}

export function HeroSlide({
  slide,
  mentors,
  isActive,
  slideIndex,
  totalSlides,
  onMentorClick,
}: HeroSlideProps) {
  const isMto = slide.programType === "mto" || slide.id.includes("mto");
  const isIrgp = slide.programType === "irgp" || slide.id.includes("irgp");

  // Dynamically resolve mentors from canonical dataset matching program ID (mto / irgp)
  // Backward-compatible with both courseId (singular) and courseIds (array)
  const programId = slide.programType || (isMto ? "mto" : isIrgp ? "irgp" : undefined);
  const programMentors = mentors
    .filter((m) => {
      if (!programId) return false;
      const inCourseIds = Array.isArray(m.courseIds) && m.courseIds.includes(programId);
      const inCourseId = m.courseId === programId;
      return inCourseIds || inCourseId;
    })
    .sort((a, b) => a.order - b.order);

  // Backward compatibility fallback if mentors not yet mapped in test mocks
  const displayMentors =
    programMentors.length > 0
      ? programMentors
      : (slide.mentorIds || [])
          .map((id) => mentors.find((m) => m.id === id))
          .filter((m): m is Mentor => Boolean(m));

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

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`Slide ${slideIndex + 1} of ${totalSlides}: ${slide.title}`}
      aria-hidden={!isActive}
      className={`w-full h-full flex flex-col justify-center transition-opacity duration-500 ease-in-out ${
        isActive
          ? "opacity-100 relative z-10 pointer-events-auto"
          : "opacity-0 absolute inset-0 pointer-events-none z-0"
      }`}
    >
      {/* Main Slide Content Container filling the allocated height */}
      <div className="relative z-10 mx-auto max-w-7xl xl:max-w-[1360px] 2xl:max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-10 w-full h-full flex flex-col justify-center">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8 xl:gap-10 py-3 sm:py-4 lg:py-4 h-full">
          {/* ========================================================= */}
          {/* LEFT EDITORIAL COLUMN (~35% Desktop, Inside Pearl Area)   */}
          {/* ========================================================= */}
          {isMto ? (
            <div className="w-full lg:w-[36%] xl:w-[35%] flex flex-col items-start z-10 shrink-0 relative">
              {/* 1. Eyebrow Badge: FEATURED PROGRAM */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] sm:text-xs font-bold tracking-wider uppercase bg-white/85 text-[#086477] border border-[#086477]/25 shadow-2xs mb-2 sm:mb-2.5 backdrop-blur-xs">
                <Briefcase className="h-3 w-3 text-[#086477]" aria-hidden="true" />
                <span>FEATURED PROGRAM</span>
              </div>

              {/* 2. Large Serif Heading: MTO Readiness Program */}
              <h1 className="text-3xl sm:text-4xl lg:text-[38px] xl:text-[42px] font-serif font-bold tracking-tight text-[#172E35] leading-[1.04] mb-1 sm:mb-1.5">
                <span className="block">MTO</span>
                <span className="block">Readiness</span>
                <span className="block italic font-serif font-normal text-[#086477]">Program</span>
              </h1>

              {/* 3. Deep Teal Accent Bar */}
              <div className="w-10 h-0.5 bg-[#086477] rounded-full my-2 sm:my-2.5" aria-hidden="true" />

              {/* 4. Subtitle */}
              <h2 className="text-[14px] sm:text-[15px] lg:text-base font-bold text-[#172E35] tracking-tight leading-snug mb-1 font-sans">
                Graduate Career &amp; Leadership Accelerator
              </h2>

              {/* 5. Description */}
              <p className="text-xs sm:text-[13px] lg:text-[13.5px] text-[#426169] leading-relaxed max-w-[400px] mb-3 sm:mb-3.5 font-normal">
                Practical preparation for Management Trainee Officer opportunities.
              </p>

              {/* 6. Three Statistics: 16 sessions / 1.5h each, 8 essential skills, 5 industry mentors */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 xl:gap-4 py-1 mb-3.5 sm:mb-4">
                {/* 16 sessions */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#E0F3F5] flex items-center justify-center shrink-0 text-[#086477]">
                    <Layers className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12.5px] sm:text-[13px] font-bold text-[#172E35] leading-tight whitespace-nowrap">
                      16 sessions
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-[#5B7E87] leading-tight whitespace-nowrap">
                      1.5h each
                    </span>
                  </div>
                </div>

                <div className="h-6 w-px bg-teal-200/80 shrink-0" aria-hidden="true" />

                {/* 8 essential skills */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#E0F3F5] flex items-center justify-center shrink-0 text-[#086477]">
                    <TrendingUp className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12.5px] sm:text-[13px] font-bold text-[#172E35] leading-tight whitespace-nowrap">
                      8 essential
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-[#5B7E87] leading-tight whitespace-nowrap">
                      skills
                    </span>
                  </div>
                </div>

                <div className="h-6 w-px bg-teal-200/80 shrink-0" aria-hidden="true" />

                {/* 5 industry mentors */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#E0F3F5] flex items-center justify-center shrink-0 text-[#086477]">
                    <Users className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12.5px] sm:text-[13px] font-bold text-[#172E35] leading-tight whitespace-nowrap">
                      5 industry
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-[#5B7E87] leading-tight whitespace-nowrap">
                      mentors
                    </span>
                  </div>
                </div>
              </div>

              {/* 7. Primary Button & Compact Start Date */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <Link
                  href={slide.ctaHref}
                  tabIndex={isActive ? 0 : -1}
                >
                  <Button
                    variant="primary"
                    size="md"
                    className="group rounded-full px-6 sm:px-7 py-2.5 sm:py-3 bg-[#086477] hover:bg-[#064654] text-white font-semibold text-xs sm:text-[13.5px] shadow-sm hover:shadow-md transition-all duration-200 inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>Explore the Program</span>
                    <ArrowRight
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </Button>
                </Link>

                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 border border-[#BCE1E5] shadow-2xs">
                  <Calendar className="h-3.5 w-3.5 text-[#086477]" aria-hidden="true" />
                  <span className="text-[11px] sm:text-xs font-semibold text-[#086477]">
                    Classes begin December 1
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full lg:w-[36%] xl:w-[35%] flex flex-col items-start z-10 shrink-0 relative">
              {/* 1. Small Eyebrow Badge: COMPLETED PROGRAM · IRGP */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] sm:text-xs font-bold tracking-wider uppercase bg-white/85 text-[#086477] border border-[#086477]/25 shadow-2xs mb-2 sm:mb-2.5 backdrop-blur-xs">
                <span>COMPLETED PROGRAM · IRGP</span>
              </div>

              {/* 2. Large Serif Heading: Industry Readiness Graduate Program */}
              <h1 className="text-3xl sm:text-4xl lg:text-[36px] xl:text-[40px] font-serif font-bold tracking-tight text-[#172E35] leading-[1.04] mb-1 sm:mb-1.5">
                <span className="block">Industry</span>
                <span className="block">Readiness</span>
                <span className="block">Graduate</span>
                <span className="block italic font-serif font-normal text-[#086477]">Program</span>
              </h1>

              {/* 3. Deep Teal Accent Bar */}
              <div className="w-10 h-0.5 bg-[#086477] rounded-full my-2 sm:my-2.5" aria-hidden="true" />

              {/* 4. Supporting Text */}
              <p className="text-xs sm:text-[13px] lg:text-[13.5px] text-[#426169] leading-relaxed max-w-[390px] mb-3 sm:mb-3.5 font-normal">
                Practical learning guided by industry professionals.
              </p>

              {/* 5. Two Statistics: 10 focus areas, 8 industry mentors */}
              <div className="flex items-center gap-3 sm:gap-4 py-1 mb-3.5 sm:mb-4">
                {/* 10 focus areas */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#E0F3F5] flex items-center justify-center shrink-0 text-[#086477]">
                    <Layers className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12.5px] sm:text-[13px] font-bold text-[#172E35] leading-tight">
                      10 focus
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-[#5B7E87] leading-tight">
                      areas
                    </span>
                  </div>
                </div>

                <div className="h-6 w-px bg-teal-200/80 shrink-0" aria-hidden="true" />

                {/* 8 industry mentors */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#E0F3F5] flex items-center justify-center shrink-0 text-[#086477]">
                    <Users className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12.5px] sm:text-[13px] font-bold text-[#172E35] leading-tight">
                      8 industry
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-[#5B7E87] leading-tight">
                      mentors
                    </span>
                  </div>
                </div>
              </div>

              {/* 6. Primary Button & Underlined Secondary Action */}
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={slide.ctaHref}
                  tabIndex={isActive ? 0 : -1}
                >
                  <Button
                    variant="primary"
                    size="md"
                    className="group rounded-full px-6 sm:px-7 py-2.5 sm:py-3 bg-[#086477] hover:bg-[#064654] text-white font-semibold text-xs sm:text-[13.5px] shadow-sm hover:shadow-md transition-all duration-200 inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>Explore the IRGP Story</span>
                    <ArrowRight
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </Button>
                </Link>

                <a
                  href="#reviews"
                  tabIndex={isActive ? 0 : -1}
                  onClick={handleSecondaryCtaClick}
                  className="text-xs sm:text-[13px] font-semibold text-[#086477] hover:text-[#064654] underline underline-offset-4 transition-colors cursor-pointer inline-block"
                >
                  View Learner Experiences
                </a>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* RIGHT SHOWCASE COLUMN (~65% Desktop, Floating over Lounge) */}
          {/* ========================================================= */}
          {isMto ? (
            <div className="w-full lg:w-[64%] xl:w-[65%] flex flex-col justify-center items-center lg:items-end relative z-10 shrink-0">
              {/* Desktop: TWO–ONE–TWO Grid in 3 Rows */}
              <div className="hidden lg:grid grid-cols-4 gap-x-3.5 xl:gap-x-4 gap-y-2 lg:gap-y-2.5 xl:gap-y-3 w-full max-w-[480px] xl:max-w-[530px]">
                {/* Row 1: Arif Rahman & Tanvir Hossain */}
                <div className="col-span-2 col-start-1">
                  <HeroMentorCard
                    mentor={displayMentors[0]}
                    variant="mto"
                    onClick={onMentorClick}
                    priority={isActive}
                  />
                </div>
                <div className="col-span-2 col-start-3">
                  <HeroMentorCard
                    mentor={displayMentors[1]}
                    variant="mto"
                    onClick={onMentorClick}
                    priority={isActive}
                  />
                </div>

                {/* Row 2: Mir Hasib Mahmud (Centered) */}
                <div className="col-span-2 col-start-2">
                  <HeroMentorCard
                    mentor={displayMentors[2]}
                    variant="mto"
                    isFeatured={true}
                    onClick={onMentorClick}
                    priority={isActive}
                  />
                </div>

                {/* Row 3: Fahim Ahmed & Sayem Chowdhury */}
                <div className="col-span-2 col-start-1">
                  <HeroMentorCard
                    mentor={displayMentors[3]}
                    variant="mto"
                    onClick={onMentorClick}
                    priority={isActive}
                  />
                </div>
                <div className="col-span-2 col-start-3">
                  <HeroMentorCard
                    mentor={displayMentors[4]}
                    variant="mto"
                    onClick={onMentorClick}
                    priority={isActive}
                  />
                </div>
              </div>

              {/* Mobile / Tablet: Contained Manually Swipeable Faculty Area */}
              <div
                className="lg:hidden w-full overflow-x-auto touch-pan-x snap-x snap-mandatory flex gap-2.5 pb-2 pt-1 no-scrollbar"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
              >
                {displayMentors.slice(0, 5).map((mentor, index) => (
                  <div key={mentor.id} className="w-[145px] shrink-0 snap-center">
                    <HeroMentorCard
                      mentor={mentor}
                      variant="mto"
                      isFeatured={index === 2}
                      onClick={onMentorClick}
                      priority={isActive && index === 0}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full lg:w-[64%] xl:w-[65%] flex flex-col justify-center items-center lg:items-end relative z-10 shrink-0">
              {/* Desktop: THREE–TWO–THREE Grid in 3 Rows */}
              <div className="hidden lg:grid grid-cols-6 gap-x-2.5 xl:gap-x-3.5 gap-y-2 lg:gap-y-2.5 xl:gap-y-3 w-full max-w-[640px] xl:max-w-[700px]">
                {/* Row 1 (Top: 3 cards) */}
                <div className="col-span-2 col-start-1">
                  <HeroMentorCard mentor={displayMentors[0]} variant="irgp" onClick={onMentorClick} priority={isActive} />
                </div>
                <div className="col-span-2 col-start-3">
                  <HeroMentorCard mentor={displayMentors[1]} variant="irgp" onClick={onMentorClick} priority={isActive} />
                </div>
                <div className="col-span-2 col-start-5">
                  <HeroMentorCard mentor={displayMentors[2]} variant="irgp" onClick={onMentorClick} priority={isActive} />
                </div>

                {/* Row 2 (Middle: 2 cards centered) */}
                <div className="col-span-2 col-start-2">
                  <HeroMentorCard mentor={displayMentors[3]} variant="irgp" onClick={onMentorClick} priority={isActive} />
                </div>
                <div className="col-span-2 col-start-4">
                  <HeroMentorCard mentor={displayMentors[4]} variant="irgp" onClick={onMentorClick} priority={isActive} />
                </div>

                {/* Row 3 (Bottom: 3 cards) */}
                <div className="col-span-2 col-start-1">
                  <HeroMentorCard mentor={displayMentors[5]} variant="irgp" onClick={onMentorClick} priority={isActive} />
                </div>
                <div className="col-span-2 col-start-3">
                  <HeroMentorCard mentor={displayMentors[6]} variant="irgp" onClick={onMentorClick} priority={isActive} />
                </div>
                <div className="col-span-2 col-start-5">
                  <HeroMentorCard mentor={displayMentors[7]} variant="irgp" onClick={onMentorClick} priority={isActive} />
                </div>
              </div>

              {/* Mobile / Tablet: Contained Manually Swipeable Faculty Area */}
              <div
                className="lg:hidden w-full overflow-x-auto touch-pan-x snap-x snap-mandatory flex gap-2.5 pb-2 pt-1 no-scrollbar"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
              >
                {displayMentors.slice(0, 8).map((mentor, index) => (
                  <div key={mentor.id} className="w-[140px] shrink-0 snap-center">
                    <HeroMentorCard
                      mentor={mentor}
                      variant="irgp"
                      onClick={onMentorClick}
                      priority={isActive && index === 0}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
