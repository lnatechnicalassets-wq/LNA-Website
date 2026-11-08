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
 * - Sized purposefully with a fixed hero height across both slides to prevent layout shifts.
 * - Shared authentic teal lounge background filling the hero.
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

  // Slide transition handlers
  const nextSlide = useCallback(
    (isManual = false) => {
      if (isManual) {
        setIsStoppedManually(true);
      }
      setActiveIndex((prev) => (prev + 1) % totalSlides);
    },
    [totalSlides]
  );

  const prevSlide = useCallback(
    (isManual = false) => {
      if (isManual) {
        setIsStoppedManually(true);
      }
      setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    },
    [totalSlides]
  );

  const goToSlide = useCallback((index: number, isManual = false) => {
    if (isManual) {
      setIsStoppedManually(true);
    }
    setActiveIndex(index);
  }, []);

  // Auto-progression: 4 seconds timer
  useEffect(() => {
    if (
      isHovered ||
      isFocusedWithin ||
      isStoppedManually ||
      isReducedMotion ||
      isTabHidden ||
      !isInViewport ||
      isStoryModalOpen ||
      isQuickViewOpen ||
      totalSlides <= 1
    ) {
      return;
    }

    const timer = setInterval(() => {
      nextSlide();
    }, 4000);

    return () => clearInterval(timer);
  }, [
    isHovered,
    isFocusedWithin,
    isStoppedManually,
    isReducedMotion,
    isTabHidden,
    isInViewport,
    isStoryModalOpen,
    isQuickViewOpen,
    totalSlides,
    nextSlide,
  ]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevSlide(true);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nextSlide(true);
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
      prevSlide(true);
    } else if (deltaX < -45) {
      nextSlide(true);
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
      className="relative w-full overflow-hidden bg-[#F6FAFA] select-none flex flex-col justify-between h-[640px] sm:h-[660px] lg:h-[640px]"
    >
      {/* ============================================================= */}
      {/* 1. SHARED TEAL LOUNGE BACKGROUND (Absolute layer filling hero) */}
      {/* ============================================================= */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
        <Image
          src="/images/hero-teal-lounge-bg.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[25%_center] sm:object-center"
        />
      </div>

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
      <div className="relative w-full h-full z-10 flex flex-col justify-center overflow-hidden">
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
      <div className="relative z-30 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-3.5 pt-1 flex flex-col items-center shrink-0">
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
                onClick={() => goToSlide(index, true)}
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
