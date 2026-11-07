"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Star, Briefcase, Quote } from "lucide-react";
import type { Review } from "@/lib/content";

export const DEFAULT_AUTOPLAY_DURATION_MS = 180000; // 3 minutes per testimonial
const TRANSITION_DURATION_MS = 700;

export interface ReviewsCarouselProps {
  reviews: Review[];
  autoplayDurationMs?: number;
  isModalOpen?: boolean;
  isLightboxOpen?: boolean;
  isInView?: boolean;
}

export function ReviewsCarousel({
  reviews,
  autoplayDurationMs = DEFAULT_AUTOPLAY_DURATION_MS,
  isModalOpen = false,
  isLightboxOpen = false,
  isInView = true,
}: ReviewsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const timerStartTimeRef = useRef<number | null>(null);
  const remainingTimeRef = useRef<number>(autoplayDurationMs);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const total = reviews.length;
  const currentReview = reviews[activeIndex] || reviews[0];

  // Check prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Track tab visibility
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibilityChange = () => {
      setIsDocumentVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Safe manual navigation
  const goToNext = useCallback(() => {
    if (total <= 1) return;
    remainingTimeRef.current = autoplayDurationMs;
    timerStartTimeRef.current = null;
    setIsTransitioning(true);
    setActiveIndex((prev) => (prev + 1) % total);
    setTimeout(() => setIsTransitioning(false), TRANSITION_DURATION_MS);
  }, [total, autoplayDurationMs]);

  const goToPrev = useCallback(() => {
    if (total <= 1) return;
    remainingTimeRef.current = autoplayDurationMs;
    timerStartTimeRef.current = null;
    setIsTransitioning(true);
    setActiveIndex((prev) => (prev - 1 + total) % total);
    setTimeout(() => setIsTransitioning(false), TRANSITION_DURATION_MS);
  }, [total, autoplayDurationMs]);

  const goToIndex = useCallback(
    (index: number) => {
      if (total <= 1 || index === activeIndex || index < 0 || index >= total) return;
      remainingTimeRef.current = autoplayDurationMs;
      timerStartTimeRef.current = null;
      setIsTransitioning(true);
      setActiveIndex(index);
      setTimeout(() => setIsTransitioning(false), TRANSITION_DURATION_MS);
    },
    [activeIndex, total, autoplayDurationMs]
  );

  // Autoplay countdown with remaining-time preservation on pause
  useEffect(() => {
    const isPaused =
      isHovered ||
      isFocused ||
      isModalOpen ||
      isLightboxOpen ||
      !isInView ||
      !isDocumentVisible ||
      prefersReducedMotion ||
      total <= 1;

    if (isPaused) {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      if (timerStartTimeRef.current !== null) {
        const elapsed = Date.now() - timerStartTimeRef.current;
        remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
        timerStartTimeRef.current = null;
      }
      return;
    }

    // Schedule next transition with preserved remaining time
    const waitTime = remainingTimeRef.current > 0 ? remainingTimeRef.current : autoplayDurationMs;
    timerStartTimeRef.current = Date.now();

    timeoutIdRef.current = setTimeout(() => {
      goToNext();
      remainingTimeRef.current = autoplayDurationMs;
    }, waitTime);

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      if (timerStartTimeRef.current !== null) {
        const elapsed = Date.now() - timerStartTimeRef.current;
        remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
        timerStartTimeRef.current = null;
      }
    };
  }, [
    isHovered,
    isFocused,
    isModalOpen,
    isLightboxOpen,
    isInView,
    isDocumentVisible,
    prefersReducedMotion,
    total,
    autoplayDurationMs,
    goToNext,
    activeIndex,
  ]);

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        goToPrev();
      } else {
        goToNext();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  if (!currentReview) return null;

  return (
    <div
      ref={containerRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Learner Testimonials"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative flex flex-col justify-between h-full rounded-[28px] bg-white/95 backdrop-blur-xl border border-white shadow-[0_20px_50px_-12px_rgba(8,100,119,0.18)] p-6 sm:p-7 transition-all duration-300"
    >
      {/* Top Bar: Icon + Eyebrow and Rating Badge */}
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 border border-teal-100/80 text-[#086477]">
            <Quote className="h-4 w-4 fill-[#086477]" />
          </div>
          <span className="text-xs font-bold tracking-wider text-[#086477] uppercase font-sans">
            Learner Voices
          </span>
        </div>

        {/* Rating indicator */}
        {currentReview.rating && (
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200/60 text-xs sm:text-sm font-bold shadow-xs"
            aria-label={`Rating: ${currentReview.rating} out of 5 stars`}
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
            <span>{currentReview.rating.toFixed(1)}/5</span>
          </div>
        )}
      </div>

      {/* Main Body: Balanced Layout on Desktop and Tablet (no excessive void) */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-6 sm:gap-8 items-center max-w-3xl mx-auto w-full my-auto transition-opacity duration-500 ${
          isTransitioning ? "opacity-40" : "opacity-100"
        }`}
      >
        {/* Left Column: Quote and Author Details */}
        <div className="flex-1 min-w-0">
          <blockquote className="text-base sm:text-lg lg:text-[17px] font-serif italic text-[#172E35] leading-relaxed mb-5">
            &ldquo;{currentReview.quote}&rdquo;
          </blockquote>

          <div>
            <h4 className="text-base sm:text-lg font-serif font-bold text-[#172E35]">
              {currentReview.author}
            </h4>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-text-secondary">
              <span className="flex items-center gap-1 font-medium">
                <Briefcase className="w-3.5 h-3.5 text-[#086477]" />
                {currentReview.designation}
                {currentReview.company ? ` • ${currentReview.company}` : ""}
              </span>
              {(currentReview.cohort || currentReview.program) && (
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E0F2F1] text-[#086477]">
                  {currentReview.cohort ? `${currentReview.cohort}` : ""}
                  {currentReview.cohort && currentReview.program ? " • " : ""}
                  {currentReview.program || ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Learner Portrait */}
        {currentReview.portraitSrc && (
          <div className="relative w-28 h-36 sm:w-32 sm:h-44 md:w-36 md:h-48 rounded-2xl overflow-hidden border border-teal-100/90 shadow-md shrink-0 bg-teal-50 mx-auto sm:mx-0">
            <Image
              src={currentReview.portraitSrc}
              alt={currentReview.author}
              fill
              sizes="(max-width: 640px) 112px, (max-width: 1024px) 144px, 144px"
              className="object-cover object-top"
              priority={activeIndex === 0}
            />
          </div>
        )}
      </div>

      {/* Bottom Controls Row: Previous Arrow, Dots Pagination, Next Arrow */}
      <div className="flex items-center justify-between pt-4 sm:pt-6 border-t border-teal-100/50 mt-4">
        {/* Previous Button */}
        <button
          type="button"
          onClick={goToPrev}
          aria-label="Previous testimonial"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-teal-50 hover:bg-teal-100/80 border border-teal-200/60 flex items-center justify-center text-[#086477] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#086477]"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Pagination Dots */}
        <div
          role="tablist"
          aria-label="Testimonial slides"
          className="flex items-center gap-2 mx-auto"
        >
          {reviews.map((rev, idx) => (
            <button
              key={rev.id}
              type="button"
              role="tab"
              aria-selected={idx === activeIndex}
              aria-label={`Go to testimonial ${idx + 1}: ${rev.author}`}
              onClick={() => goToIndex(idx)}
              className={`transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#086477] rounded-full ${
                idx === activeIndex
                  ? "w-6 h-2 bg-[#086477]"
                  : "w-2 h-2 bg-teal-200 hover:bg-teal-300"
              }`}
            />
          ))}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={goToNext}
          aria-label="Next testimonial"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-teal-50 hover:bg-teal-100/80 border border-teal-200/60 flex items-center justify-center text-[#086477] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#086477]"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
