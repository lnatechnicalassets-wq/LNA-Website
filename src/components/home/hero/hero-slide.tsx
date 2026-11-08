"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  GraduationCap,
  Layers,
  TrendingUp,
  Users,
  Play,
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
  onOpenStoryModal?: () => void;
  onMentorClick: (mentor: Mentor) => void;
}

export function HeroSlide({
  slide,
  mentors,
  isActive,
  slideIndex,
  totalSlides,
  onOpenStoryModal,
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

  const eyebrowLabel = slide.eyebrow || (isIrgp ? "COMPLETED PROGRAM" : "FEATURED PROGRAM");

  const handlePrimaryCtaClick = (e: React.MouseEvent) => {
    if (isIrgp && onOpenStoryModal) {
      e.preventDefault();
      onOpenStoryModal();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("lna:open-irgp-story"));
      }
    }
  };

  const renderHighlightIcon = (iconName?: string) => {
    switch (iconName) {
      case "sessions":
      case "areas":
      case "layers":
        return <Layers className="h-5 w-5 text-[#086477]" aria-hidden="true" />;
      case "skills":
      case "analytics":
        return <TrendingUp className="h-5 w-5 text-[#086477]" aria-hidden="true" />;
      case "mentors":
      case "users":
        return <Users className="h-5 w-5 text-[#086477]" aria-hidden="true" />;
      case "career":
      case "briefcase":
        return <Briefcase className="h-5 w-5 text-[#086477]" aria-hidden="true" />;
      default:
        return <Layers className="h-5 w-5 text-[#086477]" aria-hidden="true" />;
    }
  };

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`Slide ${slideIndex + 1} of ${totalSlides}: ${slide.title}`}
      aria-hidden={!isActive}
      className={`w-full transition-opacity duration-500 ease-in-out ${
        isActive
          ? "opacity-100 relative z-10 pointer-events-auto"
          : "opacity-0 absolute inset-0 pointer-events-none z-0"
      }`}
    >
      {/* ============================================================= */}
      {/* MTO FULL BACKGROUND: Pearl-to-teal academy interior           */}
      {/* ============================================================= */}
      {isMto && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <Image
            src="/images/hero-mto-interior-bg.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          {/* Subtle overlay only where needed for high contrast and readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#F6FAFA]/75 via-[#F6FAFA]/35 to-transparent pointer-events-none lg:w-[48%]" />
          <div className="lg:hidden absolute inset-0 bg-[#F6FAFA]/80 pointer-events-none" />
        </div>
      )}

      {/* Main Slide Content Container */}
      <div className="relative z-10 mx-auto max-w-[1650px] px-6 sm:px-10 lg:px-16">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10 xl:gap-14 py-8 sm:py-10 lg:py-12 min-h-[660px] lg:min-h-[700px]">
          {/* ========================================================= */}
          {/* LEFT EDITORIAL COLUMN (~40% of desktop width)             */}
          {/* ========================================================= */}
          <div className="w-full lg:w-[40%] xl:w-[39%] flex flex-col items-start z-10 shrink-0">
            {/* 1. Small Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase bg-[#DDF1F3]/90 text-[#086477] border border-[#BCE1E5] shadow-2xs mb-4 sm:mb-5">
              {isIrgp ? (
                <GraduationCap className="h-3.5 w-3.5 text-[#086477]" aria-hidden="true" />
              ) : (
                <Briefcase className="h-3.5 w-3.5 text-[#086477]" aria-hidden="true" />
              )}
              <span>{eyebrowLabel}</span>
            </div>

            {/* 2. Large Editorial Heading (60–72px) */}
            {isMto ? (
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[60px] xl:text-[68px] 2xl:text-[72px] font-bold font-serif tracking-tight text-[#172E35] leading-[1.04] mb-3 sm:mb-4">
                <span className="block">MTO Readiness</span>
                <span className="block italic font-serif font-medium text-[#086477] mt-1 sm:mt-1.5">
                  Program
                </span>
              </h1>
            ) : (
              <div className="mb-3 sm:mb-4">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[60px] xl:text-[66px] 2xl:text-[70px] font-bold font-serif tracking-tight text-[#172E35] leading-[1.04]">
                  IRGP
                </h1>
                <p className="text-xl sm:text-2xl md:text-[28px] lg:text-[30px] font-serif font-bold text-[#172E35] tracking-tight mt-1">
                  Industry Readiness Graduate Program
                </p>
              </div>
            )}

            {/* 3. Subtitle (20–22px, for MTO) */}
            {isMto && slide.subtitle && (
              <h2 className="text-lg sm:text-xl lg:text-[21px] xl:text-[22px] font-bold text-[#172E35] tracking-tight leading-snug mb-3 sm:mb-4">
                {slide.subtitle}
              </h2>
            )}

            {/* 4. Description (17–18px, ~1.6 line-height) */}
            <p className="text-base lg:text-[17px] xl:text-[18px] text-[#426169] leading-[1.6] font-normal mb-6 sm:mb-7 max-w-[500px]">
              {slide.description}
            </p>

            {/* 5. Compact Statistics Row */}
            {slide.highlights && slide.highlights.length > 0 && (
              <div className="w-full flex items-center justify-between sm:justify-start gap-4 sm:gap-6 xl:gap-8 py-2 mb-6 sm:mb-8">
                {slide.highlights.map((h, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <div className="h-10 w-px bg-teal-200/80 shrink-0" aria-hidden="true" />
                    )}
                    <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-[#E0F3F5] flex items-center justify-center shrink-0 text-[#086477]">
                        {renderHighlightIcon(h.icon)}
                      </div>
                      <div className="flex flex-col shrink-0">
                        <span className="text-sm sm:text-[15px] xl:text-base font-bold text-[#172E35] leading-tight whitespace-nowrap">
                          {h.label}
                        </span>
                        <span className="text-xs sm:text-[13px] text-[#5B7E87] leading-tight whitespace-nowrap mt-0.5">
                          {h.sublabel}
                        </span>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* 6. Primary Button & 7. Compact Start-Date Detail */}
            <div className="flex flex-col items-start gap-3.5 mb-2">
              <Link
                href={slide.ctaHref}
                tabIndex={isActive ? 0 : -1}
                onClick={handlePrimaryCtaClick}
              >
                <Button
                  variant="primary"
                  size="lg"
                  className="group rounded-full px-8 sm:px-9 py-3.5 sm:py-4 bg-[#086477] hover:bg-[#064654] text-white font-semibold text-base shadow-sm hover:shadow-md transition-all duration-200 inline-flex items-center gap-3 cursor-pointer"
                >
                  <span>{slide.ctaText}</span>
                  <ArrowRight
                    className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Button>
              </Link>

              {/* Compact start-date detail beneath the button (Classes begin December 1) */}
              {isMto && (slide.classStartDate || slide.startDate) && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E5F5F6]/90 border border-[#BCE1E5] shadow-2xs">
                  <Calendar className="h-3.5 w-3.5 text-[#086477]" aria-hidden="true" />
                  <span className="text-xs sm:text-[13px] font-semibold text-[#086477]">
                    {slide.classStartLabel || "Classes begin"}{" "}
                    {slide.classStartDate || "December 1"}
                  </span>
                </div>
              )}

              {/* Secondary CTA for non-MTO slides (e.g. IRGP) */}
              {!isMto && slide.secondaryCtaText && (
                <Link href={slide.secondaryCtaHref || "#"} tabIndex={isActive ? 0 : -1}>
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full px-6 py-3.5 bg-white/80 hover:bg-white text-[#086477] border border-[#086477]/30 hover:border-[#086477] font-semibold text-sm transition-all duration-200 inline-flex items-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Play
                      className="h-4 w-4 fill-[#086477] text-[#086477]"
                      aria-hidden="true"
                    />
                    <span>{slide.secondaryCtaText}</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT SHOWCASE COLUMN (~60% of desktop width)            */}
          {/* ========================================================= */}
          <div className="w-full lg:w-[60%] xl:w-[61%] flex flex-col justify-center items-center relative z-10 shrink-0">
            {/* ------------------------------------------------------- */}
            {/* SLIDE 1 (MTO): Upright Cards with Pearl Captions         */}
            {/* ------------------------------------------------------- */}
            {isMto && (
              <div className="w-full flex flex-col items-center justify-center">
                {/* Faculty Header: Eyebrow + Heading */}
                <div className="flex flex-col items-center justify-center text-center mb-5 sm:mb-6">
                  <div className="flex items-center justify-center gap-3 mb-1.5 sm:mb-2">
                    <span className="w-8 sm:w-12 h-px bg-[#086477]/30 lg:bg-[#C5E2E5]/60" aria-hidden="true" />
                    <span className="text-xs sm:text-sm font-bold tracking-[0.2em] text-[#086477] lg:text-[#C5E2E5] uppercase font-sans">
                      {slide.mentorEyebrow || "MTO PROGRAM FACULTY"}
                    </span>
                    <span className="w-8 sm:w-12 h-px bg-[#086477]/30 lg:bg-[#C5E2E5]/60" aria-hidden="true" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl lg:text-[32px] xl:text-[36px] font-serif text-[#172E35] lg:text-white font-medium tracking-wide drop-shadow-sm">
                    {slide.mentorHeading || "Learn From Industry Leaders"}
                  </h3>
                </div>

                {/* 5 Individual Mentor Cards (Fit 1 row on wide desktop, wrap before cramped) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4 xl:gap-3 2xl:gap-3.5 w-full">
                  {displayMentors.slice(0, 5).map((mentor, index) => (
                    <HeroMentorCard
                      key={mentor.id}
                      mentor={mentor}
                      variant="mto"
                      isFeatured={mentor.featured === true || index === 2}
                      onClick={onMentorClick}
                      priority={isActive}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------- */}
            {/* SLIDE 2 (IRGP): 8 Mentors in Balanced 4x2 Grid          */}
            {/* ------------------------------------------------------- */}
            {isIrgp && (
              <div className="w-full flex flex-col items-center justify-center">
                {/* Header: Users icon + Italic Serif Title */}
                <div className="flex items-center gap-2.5 mb-4 sm:mb-5">
                  <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-teal-200 shrink-0">
                    <Users className="h-4.5 w-4.5" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-[26px] font-serif italic text-white font-normal tracking-tight">
                    {slide.mentorHeading || "Meet Our IRGP Mentors"}
                  </h3>
                  <span className="text-teal-300 text-sm hidden sm:inline" aria-hidden="true">
                    ✦
                  </span>
                </div>

                {/* Desktop & Tablet 4x2 Grid */}
                <div className="hidden sm:grid grid-cols-4 gap-3 lg:gap-3.5 xl:gap-4 w-full">
                  {displayMentors.slice(0, 8).map((mentor, index) => (
                    <HeroMentorCard
                      key={mentor.id}
                      mentor={mentor}
                      variant="irgp"
                      onClick={onMentorClick}
                      priority={isActive && index === 0}
                    />
                  ))}
                </div>

                {/* Mobile 2x4 Grid */}
                <div className="sm:hidden grid grid-cols-2 gap-2.5 w-full">
                  {displayMentors.slice(0, 8).map((mentor, index) => (
                    <HeroMentorCard
                      key={mentor.id}
                      mentor={mentor}
                      variant="irgp"
                      onClick={onMentorClick}
                      priority={isActive && index === 0}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
