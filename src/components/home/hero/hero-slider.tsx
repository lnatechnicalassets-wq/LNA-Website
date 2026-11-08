"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import type { HeroSlide as HeroSlideType, Mentor } from "@/lib/content";
import { useMentorQuickView } from "../mentor-quick-view-context";
import { HeroSlide } from "./hero-slide";

export interface HeroSliderProps {
  slides: HeroSlideType[];
  mentors?: Mentor[];
}

/**
 * HeroSlider Component
 * Fully accessible (WCAG 2.2 AA) executive carousel slider:
 * - Exactly 2 slides: MTO Readiness Program (5 mentors) and IRGP (8 mentors).
 * - 4-second (4,000ms) automatic progression with smooth transition.
 * - Sized purposefully around content with Pearl (#F6FAFA) background.
 * - Left content (~38%) and right mentor composition (~62%).
 * - Soft transition into subdued teal corporate office background on right.
 * - Shallow, restrained bottom wave transition.
 * - Accessible controls and zero horizontal overflow across all viewports.
 */
export function HeroSlider({ slides, mentors = [] }: HeroSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusedWithin, setIsFocusedWithin] = useState(false);
  const [isStoppedManually, setIsStoppedManually] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [isInViewport, setIsInViewport] = useState(true);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Access the shared canonical mentor quick-view context
  const { isQuickViewOpen, openQuickView } = useMentorQuickView();

  // Exactly two slides per requirement
  const heroSlides = slides.slice(0, 2);
  const totalSlides = heroSlides.length;

  // 1. Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mql.matches);

    const handler = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    if (mql.addEventListener) {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
  }, []);

  // 2. Track document visibility (pause when tab hidden)
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      setIsTabHidden(document.visibilityState === "hidden");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // 3. Track viewport visibility via IntersectionObserver
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsInViewport(entry.isIntersecting);
      },
      { threshold: 0.2 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 4. Track IRGP story modal open/close events
  useEffect(() => {
    const handleStoryOpen = () => setIsStoryModalOpen(true);
    const handleStoryClose = () => setIsStoryModalOpen(false);

    window.addEventListener("lna:open-irgp-story", handleStoryOpen);
    window.addEventListener("lna:close-irgp-story", handleStoryClose);

    return () => {
      window.removeEventListener("lna:open-irgp-story", handleStoryOpen);
      window.removeEventListener("lna:close-irgp-story", handleStoryClose);
    };
  }, []);

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  // Determine if autoplay is eligible to tick:
  const isAutoplayActive =
    !isStoppedManually &&
    !isReducedMotion &&
    !isHovered &&
    !isFocusedWithin &&
    !isQuickViewOpen &&
    !isStoryModalOpen &&
    !isTabHidden &&
    isInViewport;

  // 4-second automatic progression
  useEffect(() => {
    if (!isAutoplayActive || totalSlides <= 1) {
      return;
    }

    const interval = setInterval(() => {
      nextSlide();
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoplayActive, totalSlides, nextSlide, activeIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevSlide();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nextSlide();
    }
  };

  // Touch gesture handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;

    if (deltaX > 45) {
      prevSlide();
    } else if (deltaX < -45) {
      nextSlide();
    }
    setTouchStartX(null);
  };

  const toggleAutoplayByKeyboard = () => {
    setIsStoppedManually((prev) => !prev);
  };

  const handleMentorClick = useCallback(
    (mentor: Mentor) => {
      openQuickView(mentor);
    },
    [openQuickView]
  );

  if (!heroSlides || heroSlides.length === 0) {
    return null;
  }

  const activeSlide = heroSlides[activeIndex];
  const isMtoSlide = activeSlide?.programType === "mto" || activeSlide?.id.includes("mto");

  return (
    <div
      ref={containerRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Lead Nation Academy Featured Executive Programs and Admissions"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocusedWithin(true)}
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
          setIsFocusedWithin(false);
        }
      }}
      className="relative w-full overflow-hidden bg-[#F6FAFA] select-none flex flex-col justify-between"
    >
      {/* ============================================================= */}
      {/* 1. SOFT TRANSLUCENT BACKGROUND & WAVES (For Non-MTO Slides)   */}
      {/* ============================================================= */}
      {!isMtoSlide && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
          {/* Desktop: Seamless gradient blend into subdued corporate office on the right */}
          <div
            className="hidden lg:block absolute right-0 top-0 bottom-0 w-[62%] xl:w-[60%] pointer-events-none overflow-hidden z-0"
            style={{
              maskImage:
                "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 24%, black 50%)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 24%, black 50%)",
            }}
          >
            <Image
              src="/images/hero-mto-office-bg.jpg"
              alt=""
              fill
              priority
              sizes="60vw"
              className="object-cover object-center opacity-35 filter blur-[1.5px]"
            />
            {/* Subdued Deep Teal overlay to soften background behind mentor cards */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#086477]/40 to-[#032a32]/70 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#021f24]/75 via-[#032a32]/30 to-transparent pointer-events-none" />
          </div>

          {/* Mobile & Tablet background */}
          <div className="lg:hidden absolute inset-0 pointer-events-none overflow-hidden z-0">
            <Image
              src="/images/hero-mto-office-bg.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center opacity-25 filter blur-[2px]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#F6FAFA] via-[#06424e]/70 to-[#021f24] pointer-events-none" />
          </div>

          {/* Shallow, Restrained Bottom Wave along the bottom */}
          <div
            className="absolute bottom-0 inset-x-0 w-full h-[50px] sm:h-[65px] lg:h-[80px] xl:h-[90px] pointer-events-none overflow-hidden z-10"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 1670 90"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full object-cover"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="bottomTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#086477" />
                  <stop offset="60%" stopColor="#054E5D" />
                  <stop offset="100%" stopColor="#022B32" />
                </linearGradient>
                <linearGradient id="bottomAquaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#C5E2E5" stopOpacity="0.75" />
                  <stop offset="50%" stopColor="#7EC7CE" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#086477" stopOpacity="0.35" />
                </linearGradient>
              </defs>

              {/* Layer 1: Shallow Teal Curve */}
              <path
                d="M 0 70 C 400 75, 900 85, 1300 55 C 1460 42, 1580 30, 1670 20 L 1670 90 L 0 90 Z"
                fill="url(#bottomTealGrad)"
              />

              {/* Layer 2: Shallow Aqua Curve */}
              <path
                d="M 0 55 C 450 60, 950 75, 1380 45 C 1490 38, 1600 32, 1670 28 L 1670 90 L 0 90 Z"
                fill="url(#bottomAquaGrad)"
              />

              {/* Layer 3: Shallow Pearl White Transition Curve */}
              <path
                d="M 0 40 C 420 45, 900 65, 1320 42 C 1450 35, 1570 45, 1670 52 L 1670 90 L 0 90 Z"
                fill="#FFFFFF"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Screen-reader accessible autoplay toggle button */}
      <button
        type="button"
        onClick={toggleAutoplayByKeyboard}
        aria-label={
          isStoppedManually ? "Resume automatic slide rotation" : "Pause automatic slide rotation"
        }
        className="sr-only"
      >
        {isStoppedManually ? "Resume automatic slide rotation" : "Pause automatic slide rotation"}
      </button>

      {/* ============================================================= */}
      {/* 2. THE SLIDES (Dual Executive Showcase)                      */}
      {/* ============================================================= */}
      <div className="relative w-full z-10 my-auto pb-4 sm:pb-6 lg:pb-8">
        {heroSlides.map((slide, index) => (
          <HeroSlide
            key={slide.id}
            slide={slide}
            mentors={mentors}
            isActive={index === activeIndex}
            slideIndex={index}
            totalSlides={totalSlides}
            onMentorClick={handleMentorClick}
          />
        ))}
      </div>

      {/* ============================================================= */}
      {/* 3. MINIMAL CAROUSEL INDICATOR DOTS                           */}
      {/* ============================================================= */}
      <div className="relative z-30 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-4 pt-1 flex flex-col items-center">
        <div
          className="flex items-center gap-2.5"
          role="tablist"
          aria-label="Hero slide indicators"
        >
          {heroSlides.map((slide, index) => {
            const isSelected = index === activeIndex;
            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`Go to slide ${index + 1}: ${slide.title}`}
                onClick={() => goToSlide(index)}
                className="group p-1 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#086477] focus-visible:ring-offset-2 rounded-full cursor-pointer"
              >
                <span
                  className={`block transition-all duration-300 ease-in-out rounded-full ${
                    isSelected
                      ? "w-6 h-2 bg-[#086477] shadow-2xs"
                      : "w-2 h-2 bg-[#A4D1D6] group-hover:bg-[#086477]/70"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
