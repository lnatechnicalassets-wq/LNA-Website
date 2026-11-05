import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, Clock, MapPin } from "lucide-react";
import type { HeroSlide as HeroSlideType } from "@/lib/content";
import { Button } from "@/components/ui";

export interface HeroSlideProps {
  slide: HeroSlideType;
  isActive: boolean;
  slideIndex: number;
  totalSlides: number;
  controlsElement?: React.ReactNode;
}

/**
 * HeroSlide Component
 * Strictly implements the approved visual direction:
 * - Left column: Balanced editorial column with single horizontal metadata row on desktop and clean responsive wrapping on mobile/tablet.
 * - Right column: Large executive photo framed by an organic S-curve boundary on desktop, cinematic framed card on mobile/tablet.
 * - Refined contour: Soft Teal (#C5E2E5, 2px) delicately framing the photo edge with smooth gradient integration into the lower wave.
 */
export function HeroSlide({
  slide,
  isActive,
  slideIndex,
  totalSlides,
  controlsElement,
}: HeroSlideProps) {
  // Verified metadata from batches.json
  const startDate = slide.startDate;
  const duration = slide.duration || "Weekend Cohorts";
  const venue = slide.venue || "Dhanmondi, Dhaka";
  const badgeLabel = slide.badgeText || "EXECUTIVE PROGRAM";
  const subCategory = slide.courseId ? "OFFLINE • DHANMONDI, DHAKA" : "DHANMONDI CAMPUS, DHAKA";

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`Slide ${slideIndex + 1} of ${totalSlides}: ${slide.title}`}
      aria-hidden={!isActive}
      className={`w-full transition-opacity duration-600 ease-in-out ${
        isActive
          ? "opacity-100 relative z-10 pointer-events-auto"
          : "opacity-0 absolute inset-0 pointer-events-none z-0"
      }`}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-0 lg:min-h-[640px] items-center min-w-0 w-full">
          {/* Left Column: Balanced Editorial Column with Generous Whitespace */}
          <div className="w-full min-w-0 lg:col-span-6 xl:col-span-6 flex flex-col items-start pt-4 pb-6 sm:pt-6 sm:pb-8 lg:py-16 lg:pr-8 xl:pr-12 max-w-xl lg:max-w-[540px] xl:max-w-[560px] z-20 order-2 lg:order-1">
            {/* Top Eyebrow Badge Row */}
            <div className="flex flex-wrap items-center gap-2 mb-3.5 sm:mb-5 min-w-0">
              <span className="inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase bg-[#C5E2E5]/55 text-[#086477] border border-[#A4D1D6]/70 shadow-2xs shrink-0">
                {badgeLabel}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold tracking-wider uppercase text-[#4A636A] truncate">
                — {subCategory}
              </span>
            </div>

            {/* Authoritative Main Headline (fluid & responsive, natural wrapping without mid-word breaks) */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[44px] xl:text-[48px] font-extrabold tracking-tight text-[#172E35] leading-snug sm:leading-[1.15] mb-3.5 sm:mb-5 break-normal">
              {slide.headline}
            </h1>

            {/* Editorial Description */}
            <p className="text-sm sm:text-base lg:text-lg text-[#3D5A62] leading-relaxed font-normal mb-5 sm:mb-7">
              {slide.description}
            </p>

            {/* Program Delivery Invariants Metadata Bar: One balanced horizontal row on desktop, intentional responsive wrapping without awkward separators */}
            <div className="w-full max-w-full flex flex-wrap lg:flex-nowrap items-center gap-2 sm:gap-2.5 lg:gap-3 text-xs sm:text-sm text-[#172E35] font-medium mb-6 sm:mb-8">
              {startDate ? (
                <div className="inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full bg-[#EDF5F5]/80 text-[#172E35] border border-[#C5DDE0]/60 lg:bg-transparent lg:border-0 lg:p-0">
                  <Calendar className="h-4 w-4 text-[#086477]" aria-hidden="true" />
                  <span>Starts: {startDate}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full bg-[#EDF5F5]/80 text-[#172E35] border border-[#C5DDE0]/60 lg:bg-transparent lg:border-0 lg:p-0">
                  <Calendar className="h-4 w-4 text-[#086477]" aria-hidden="true" />
                  <span>Executive Masterclasses</span>
                </div>
              )}

              <span
                className="text-[#C5DDE0] font-light hidden lg:inline select-none"
                aria-hidden="true"
              >
                |
              </span>

              <div className="inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full bg-[#EDF5F5]/80 text-[#172E35] border border-[#C5DDE0]/60 lg:bg-transparent lg:border-0 lg:p-0">
                <Clock className="h-4 w-4 text-[#086477]" aria-hidden="true" />
                <span>{duration}</span>
              </div>

              <span
                className="text-[#C5DDE0] font-light hidden lg:inline select-none"
                aria-hidden="true"
              >
                |
              </span>

              <div className="inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full bg-[#EDF5F5]/80 text-[#172E35] border border-[#C5DDE0]/60 lg:bg-transparent lg:border-0 lg:p-0">
                <MapPin className="h-4 w-4 text-[#086477]" aria-hidden="true" />
                <span>{venue}</span>
              </div>
            </div>

            {/* Exactly ONE Primary CTA Button (per specification) */}
            <div className="mb-5 sm:mb-8">
              <Link href={slide.ctaHref} tabIndex={isActive ? 0 : -1}>
                <Button
                  variant="primary"
                  size="lg"
                  className="group rounded-full px-6 sm:px-7 py-3 sm:py-3.5 bg-[#086477] hover:bg-[#064654] text-white font-semibold text-sm sm:text-base shadow-sm hover:shadow transition-all duration-200 inline-flex items-center gap-2.5"
                >
                  <span>{slide.ctaText}</span>
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Button>
              </Link>
            </div>

            {/* Carousel Indicators & Manual Controls placed directly beneath CTA */}
            {controlsElement}
          </div>

          {/* Right Column (Mobile / Tablet fallback inline placed FIRST for instant visual context) */}
          <div className="lg:hidden w-full min-w-0 pt-4 pb-2 sm:pt-6 sm:pb-3 order-1 lg:order-2">
            <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] md:aspect-[21/9] rounded-2xl sm:rounded-3xl overflow-hidden shadow-md border-2 border-white bg-surface-muted">
              <Image
                src={slide.imagePlaceholder}
                alt={slide.headline}
                fill
                priority={isActive && slideIndex === 0}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 50vw"
                style={{ objectPosition: slide.imageObjectPosition || "center 30%" }}
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Photographic Presentation with Rebalanced Curve & Smooth Integrated Contour Ending */}
      <div
        className="hidden lg:block absolute right-0 top-0 bottom-0 w-[48%] xl:w-[50%] overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        {/* Layer 1: Photographic Image */}
        <div className="absolute inset-0">
          <Image
            src={slide.imagePlaceholder}
            alt={slide.headline}
            fill
            priority={isActive && slideIndex === 0}
            sizes="50vw"
            style={{ objectPosition: slide.imageObjectPosition || "center" }}
            className="object-cover transition-all duration-700"
          />
        </div>

        {/* Layer 2: Organic Sweeping S-Curve SVG Overlay with Smooth Lower Wave Integration */}
        <svg
          viewBox="0 0 360 640"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="absolute left-0 top-0 bottom-0 w-[55%] h-full z-10"
        >
          <defs>
            {/* Smooth gradient fade for lower contour ending into the bottom wave */}
            <linearGradient id="contour-smooth-fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C5E2E5" stopOpacity="0.85" />
              <stop offset="75%" stopColor="#C5E2E5" stopOpacity="0.85" />
              <stop offset="95%" stopColor="#C5E2E5" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Foreground Pearl Cutout Curve framing the photo edge */}
          <path
            d="M0,0 L180,0 C145,100 95,180 110,280 C120,380 150,460 185,530 C215,580 245,615 270,640 L0,640 Z"
            fill="var(--surface-base, #F6FAFA)"
          />

          {/* Refined Main Contour Line: Soft Teal (#C5E2E5, 2px), smoothly blending into the lower wave */}
          <path
            d="M170,0 C135,100 85,180 100,280 C110,380 140,460 175,520 C195,555 225,580 265,595 C295,606 330,612 360,615"
            fill="none"
            stroke="url(#contour-smooth-fade)"
            strokeWidth="2"
            strokeLinecap="round"
            className="transition-opacity duration-700 motion-reduce:transition-none"
          />
        </svg>
      </div>
    </div>
  );
}
