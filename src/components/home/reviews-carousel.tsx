"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Star, Briefcase } from "lucide-react";
import type { Review } from "@/lib/content";

export interface ReviewsCarouselProps {
  reviews: Review[];
  isModalOpen?: boolean;
  isInView?: boolean;
}

const AUTOPLAY_HOLD_MS = 4000;
const TRANSITION_DURATION_MS = 750;

export function ReviewsCarousel({
  reviews,
  isModalOpen = false,
  isInView = true,
}: ReviewsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPausedByUser, setIsPausedByUser] = useState(false);
  const [isHoveringControl, setIsHoveringControl] = useState(false);
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastNavTimeRef = useRef<number>(Date.now());
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const total = reviews.length;

  // Safe cyclic indices
  const leftIndex = total > 1 ? (activeIndex - 1 + total) % total : null;
  const rightIndex = total > 1 ? (activeIndex + 1) % total : null;

  // Navigation handlers
  const goToNext = useCallback(() => {
    if (total <= 1) return;
    lastNavTimeRef.current = Date.now();
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const goToPrev = useCallback(() => {
    if (total <= 1) return;
    lastNavTimeRef.current = Date.now();
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToIndex = useCallback(
    (index: number) => {
      if (total <= 1 || index === activeIndex || index < 0 || index >= total) return;
      lastNavTimeRef.current = Date.now();
      setActiveIndex(index);
    },
    [activeIndex, total]
  );

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

  // Autoplay scheduling
  useEffect(() => {
    if (
      total <= 1 ||
      isPausedByUser ||
      isHoveringControl ||
      isKeyboardFocused ||
      isModalOpen ||
      prefersReducedMotion ||
      !isDocumentVisible ||
      !isInView
    ) {
      if (autoplayTimerRef.current) clearTimeout(autoplayTimerRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      return;
    }

    if (autoplayTimerRef.current) clearTimeout(autoplayTimerRef.current);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);

    const elapsedSinceNav = Date.now() - lastNavTimeRef.current;
    const remainingTransition = Math.max(0, TRANSITION_DURATION_MS - elapsedSinceNav);

    transitionTimerRef.current = setTimeout(() => {
      autoplayTimerRef.current = setTimeout(() => {
        goToNext();
      }, AUTOPLAY_HOLD_MS);
    }, remainingTransition);

    return () => {
      if (autoplayTimerRef.current) clearTimeout(autoplayTimerRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, [
    activeIndex,
    total,
    isPausedByUser,
    isHoveringControl,
    isKeyboardFocused,
    isModalOpen,
    prefersReducedMotion,
    isDocumentVisible,
    isInView,
    goToNext,
  ]);

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 45) {
      if (deltaX < 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  };

  // Keyboard navigation & toggle
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goToPrev();
      setStatusMessage(`Navigated to testimonial ${((activeIndex - 1 + total) % total) + 1}`);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goToNext();
      setStatusMessage(`Navigated to testimonial ${((activeIndex + 1) % total) + 1}`);
    } else if (e.key === " " || e.key === "k" || e.key === "p") {
      e.preventDefault();
      setIsPausedByUser((prev) => {
        const nextState = !prev;
        setStatusMessage(
          nextState
            ? "Testimonial autoplay paused"
            : "Testimonial autoplay resumed. Advancing every 4 seconds."
        );
        return nextState;
      });
    }
  };

  if (!reviews || reviews.length === 0) {
    return null;
  }

  const activeReview = reviews[activeIndex];
  const leftReview = leftIndex !== null ? reviews[leftIndex] : null;
  const rightReview = rightIndex !== null ? reviews[rightIndex] : null;

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Learner Reviews Carousel"
      aria-roledescription="carousel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onPointerDown={() => setIsKeyboardFocused(false)}
      onFocus={(e) => {
        if (e.target.matches(":focus-visible")) {
          setIsKeyboardFocused(true);
        }
      }}
      onBlur={() => setIsKeyboardFocused(false)}
      className="relative w-full max-w-[580px] lg:max-w-[600px] xl:max-w-[640px] mx-auto flex flex-col items-center select-none outline-none focus-visible:ring-2 focus-visible:ring-[#086477] focus-visible:ring-offset-4 rounded-3xl"
    >
      {/* Live Region for Screen Readers */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {statusMessage ||
          `Testimonial ${activeIndex + 1} of ${total}: ${activeReview.author}, ${activeReview.designation}`}
      </span>

      {/* 3-Card Carousel Container */}
      <div className="relative w-full min-h-[380px] sm:min-h-[400px] flex items-center justify-center py-4 overflow-visible">
        {/* Supporting Card: Left Preview (Exposing person on left side) */}
        {leftReview && (
          <div
            onClick={goToPrev}
            role="button"
            tabIndex={0}
            aria-label={`Preview previous: ${leftReview.author}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goToPrev();
              }
            }}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 w-[85%] max-w-[480px] h-[310px] sm:h-[340px] rounded-[28px] bg-white/92 backdrop-blur-md border border-white/80 shadow-[0_12px_36px_-10px_rgba(8,100,119,0.12)] -translate-x-10 lg:-translate-x-12 xl:-translate-x-14 scale-[0.92] opacity-85 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer overflow-hidden z-10 hover:opacity-100 items-stretch"
          >
            {/* Left visible exposed half with portrait and quote mark */}
            <div className="w-[48%] h-full relative overflow-hidden bg-teal-50 shrink-0">
              {leftReview.portraitSrc && (
                <Image
                  src={leftReview.portraitSrc}
                  alt={leftReview.author}
                  fill
                  sizes="240px"
                  className="object-cover object-top"
                />
              )}
              {/* Semi-translucent overlay and quote icon */}
              <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/70 backdrop-blur-xs flex items-center justify-center text-teal-700 font-serif text-2xl font-bold shadow-xs">
                “
              </div>
            </div>

            {/* Right half with quote preview */}
            <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between bg-gradient-to-br from-white via-teal-50/20 to-teal-50/50">
              <blockquote className="text-xs sm:text-sm font-serif italic text-text-primary line-clamp-4 leading-relaxed">
                &ldquo;{leftReview.quote}&rdquo;
              </blockquote>
              <div className="pt-2 border-t border-teal-100/60">
                <span className="text-xs sm:text-sm font-bold text-[#172E35] block truncate">
                  {leftReview.author}
                </span>
                <span className="text-[11px] text-text-secondary block truncate">
                  {leftReview.company || leftReview.designation}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Supporting Card: Right Preview (Exposing person on right side) */}
        {rightReview && (
          <div
            onClick={goToNext}
            role="button"
            tabIndex={0}
            aria-label={`Preview next: ${rightReview.author}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goToNext();
              }
            }}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 w-[85%] max-w-[480px] h-[310px] sm:h-[340px] rounded-[28px] bg-white/92 backdrop-blur-md border border-white/80 shadow-[0_12px_36px_-10px_rgba(8,100,119,0.12)] translate-x-10 lg:translate-x-12 xl:translate-x-14 scale-[0.92] opacity-85 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer overflow-hidden z-10 hover:opacity-100 items-stretch"
          >
            {/* Left half with quote preview */}
            <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between bg-gradient-to-bl from-white via-teal-50/20 to-teal-50/50">
              <blockquote className="text-xs sm:text-sm font-serif italic text-text-primary line-clamp-4 leading-relaxed">
                &ldquo;{rightReview.quote}&rdquo;
              </blockquote>
              <div className="pt-2 border-t border-teal-100/60">
                <span className="text-xs sm:text-sm font-bold text-[#172E35] block truncate">
                  {rightReview.author}
                </span>
                <span className="text-[11px] text-text-secondary block truncate">
                  {rightReview.company || rightReview.designation}
                </span>
              </div>
            </div>

            {/* Right visible exposed half with portrait and quote mark */}
            <div className="w-[48%] h-full relative overflow-hidden bg-teal-50 shrink-0">
              {rightReview.portraitSrc && (
                <Image
                  src={rightReview.portraitSrc}
                  alt={rightReview.author}
                  fill
                  sizes="240px"
                  className="object-cover object-top"
                />
              )}
              {/* Semi-translucent overlay and quote icon */}
              <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/70 backdrop-blur-xs flex items-center justify-center text-teal-700 font-serif text-2xl font-bold shadow-xs">
                “
              </div>
            </div>
          </div>
        )}

        {/* Central Active Featured Glass Card */}
        <div
          key={activeReview.id}
          className="relative w-full max-w-[580px] sm:max-w-[620px] rounded-[28px] sm:rounded-[34px] bg-white/95 backdrop-blur-xl border border-white shadow-[0_24px_55px_-12px_rgba(8,100,119,0.18),0_0_0_1px_rgba(255,255,255,0.9)_inset] z-20 overflow-hidden flex flex-col md:flex-row transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        >
          {/* Subtle warm-metallic top rim highlight */}
          <div
            className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-90 z-30 pointer-events-none"
            aria-hidden="true"
          />

          {/* Left Column: Content */}
          <div className="w-full md:w-[58%] p-5 sm:p-7 lg:p-8 flex flex-col justify-between z-10">
            <div>
              {/* Star Rating Display */}
              {activeReview.rating && (
                <div
                  className="flex items-center gap-1.5 mb-3 sm:mb-4"
                  aria-label={`Rating: ${activeReview.rating} out of 5 stars`}
                >
                  {Array.from({ length: activeReview.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-amber-400 text-amber-400"
                      aria-hidden="true"
                    />
                  ))}
                </div>
              )}

              {/* Quotation text */}
              <blockquote className="text-sm sm:text-base lg:text-[18px] font-serif italic text-[#172E35] leading-relaxed mb-4 sm:mb-5">
                &ldquo;{activeReview.quote}&rdquo;
              </blockquote>

              {/* Program Tag Pill */}
              {(activeReview.program || activeReview.cohort) && (
                <div className="mb-4">
                  <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold bg-[#E0F2F1] text-[#086477] border border-teal-100">
                    {activeReview.program || activeReview.cohort}
                  </span>
                </div>
              )}
            </div>

            {/* Learner Identity */}
            <div className="pt-3 border-t border-teal-100/60">
              <span
                data-active-author
                className="text-base sm:text-lg font-bold text-[#172E35] block"
              >
                {activeReview.author}
              </span>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-text-secondary mt-0.5">
                <Briefcase className="w-3.5 h-3.5 text-[#086477] shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {activeReview.designation}
                  {activeReview.company ? ` at ${activeReview.company}` : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Artwork & Learner Portrait */}
          <div className="relative w-full md:w-[44%] h-[210px] sm:h-[240px] md:h-auto min-h-[210px] md:min-h-[380px] overflow-hidden bg-gradient-to-tr from-[#086477] via-[#0A7387] to-[#4FA4B0] flex items-end justify-center rounded-b-[28px] md:rounded-b-none md:rounded-r-[34px]">
            {/* Organic Curved Teal Geometry Backdrop */}
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              aria-hidden="true"
            >
              <svg
                className="absolute -right-6 -bottom-6 w-[120%] h-[120%]"
                viewBox="0 0 300 300"
                fill="none"
                preserveAspectRatio="none"
              >
                <path
                  d="M30 300 C100 200 150 120 300 80 L300 300 Z"
                  fill="url(#cardTealGradient)"
                />
                <path
                  d="M30 300 C100 200 150 120 300 80"
                  stroke="#C5E2E5"
                  strokeWidth="2.5"
                  strokeOpacity="0.85"
                />
                <defs>
                  <linearGradient id="cardTealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#086477" stopOpacity="0.9" />
                    <stop offset="60%" stopColor="#0B748A" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#4FA8B5" stopOpacity="0.95" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Silky smooth left gradient melt into white content surface on desktop */}
            <div
              className="hidden md:block absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent z-20 pointer-events-none"
              aria-hidden="true"
            />

            {/* Translucent Decorative Large Quote Mark at Top Right */}
            <div
              className="absolute top-3 right-4 sm:top-4 sm:right-5 text-4xl sm:text-5xl font-serif text-[#C5E2E5]/60 select-none pointer-events-none font-bold z-20"
              aria-hidden="true"
            >
              “
            </div>

            {/* Learner Portrait Image */}
            {activeReview.portraitSrc ? (
              <div className="relative w-full h-full z-10 flex items-end">
                <Image
                  key={activeReview.portraitSrc}
                  src={activeReview.portraitSrc}
                  alt={activeReview.author}
                  fill
                  priority={activeIndex === 0}
                  sizes="(max-width: 768px) 100vw, 320px"
                  className="object-cover object-top mix-blend-multiply opacity-95 contrast-[1.06]"
                />
                {/* Soft gradient blend into teal curve at the bottom and left edge */}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[#086477]/35 via-transparent to-transparent pointer-events-none"
                  aria-hidden="true"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-teal-100 text-[#086477] font-bold text-2xl flex items-center justify-center my-auto z-10">
                {activeReview.author.charAt(0)}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Carousel Arrow Buttons (Glass circles with soft shadows) */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrev}
              onMouseEnter={() => setIsHoveringControl(true)}
              onMouseLeave={() => setIsHoveringControl(false)}
              aria-label="Previous testimonial"
              className="hidden md:flex absolute -left-4 lg:-left-5 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 hover:bg-[#086477] hover:text-white border border-white/80 shadow-md text-[#086477] transition-all items-center justify-center z-30 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#086477] focus-visible:outline-none"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              onMouseEnter={() => setIsHoveringControl(true)}
              onMouseLeave={() => setIsHoveringControl(false)}
              aria-label="Next testimonial"
              className="hidden md:flex absolute -right-4 lg:-right-5 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 hover:bg-[#086477] hover:text-white border border-white/80 shadow-md text-[#086477] transition-all items-center justify-center z-30 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#086477] focus-visible:outline-none"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Desktop Pagination Indicators */}
      {total > 1 && (
        <div
          className="hidden md:flex items-center gap-2 mt-4 z-20"
          role="tablist"
          aria-label="Testimonial slides"
        >
          {reviews.map((rev, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={rev.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Go to testimonial ${index + 1}: ${rev.author}`}
                onClick={() => goToIndex(index)}
                onMouseEnter={() => setIsHoveringControl(true)}
                onMouseLeave={() => setIsHoveringControl(false)}
                className={`transition-all duration-300 rounded-full focus-visible:ring-2 focus-visible:ring-[#086477] focus-visible:outline-none ${
                  isActive
                    ? "w-6 h-2 bg-[#086477]"
                    : "w-2 h-2 bg-teal-200 hover:bg-teal-300 cursor-pointer"
                }`}
              />
            );
          })}
        </div>
      )}

      {/* Mobile Symmetrical Navigation Cluster (Controls below card: [ < ]  ● ● ●  [ > ]) */}
      {total > 1 && (
        <div className="flex md:hidden items-center justify-center gap-4 mt-4 z-20">
          <button
            type="button"
            onClick={goToPrev}
            onMouseEnter={() => setIsHoveringControl(true)}
            onMouseLeave={() => setIsHoveringControl(false)}
            aria-label="Previous testimonial (mobile)"
            className="w-10 h-10 rounded-full bg-white/95 border border-white/80 shadow-md text-[#086477] hover:bg-[#086477] hover:text-white transition-all flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-[#086477]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div
            className="flex items-center gap-2"
            role="tablist"
            aria-label="Testimonial slides mobile"
          >
            {reviews.map((rev, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={rev.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Go to testimonial ${index + 1} (mobile): ${rev.author}`}
                  onClick={() => goToIndex(index)}
                  onMouseEnter={() => setIsHoveringControl(true)}
                  onMouseLeave={() => setIsHoveringControl(false)}
                  className={`transition-all duration-300 rounded-full focus-visible:ring-2 focus-visible:ring-[#086477] focus-visible:outline-none ${
                    isActive
                      ? "w-5 h-2 bg-[#086477]"
                      : "w-2 h-2 bg-teal-200 hover:bg-teal-300 cursor-pointer"
                  }`}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={goToNext}
            onMouseEnter={() => setIsHoveringControl(true)}
            onMouseLeave={() => setIsHoveringControl(false)}
            aria-label="Next testimonial (mobile)"
            className="w-10 h-10 rounded-full bg-white/95 border border-white/80 shadow-md text-[#086477] hover:bg-[#086477] hover:text-white transition-all flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-[#086477]"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
