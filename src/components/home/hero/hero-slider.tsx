"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { HeroSlide as HeroSlideType } from "@/lib/content";
import { HeroSlide } from "./hero-slide";

export interface HeroSliderProps {
  slides: HeroSlideType[];
}

/**
 * HeroSlider Component
 * Fully accessible (WCAG 2.2 AA) executive carousel slider:
 * - 3 slides with 7-second automatic progression and 600ms smooth crossfade.
 * - Pauses rotation on hover or focus within.
 * - Stops automatic rotation permanently once a user manually selects a slide, swipes, or navigates via keyboard.
 * - Disables automatic rotation for users with prefers-reduced-motion.
 * - Sighted controls: ONLY three clickable indicators (Active: 32px x 8px Deep Teal pill; Inactive: 9px Soft Teal circles).
 * - Keyboard-discoverable pause/resume button for accessibility without visual clutter in default layout.
 * - Touch swipe gestures and Left/Right keyboard navigation supported.
 */
export function HeroSlider({ slides }: HeroSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusedWithin, setIsFocusedWithin] = useState(false);
  const [isStoppedManually, setIsStoppedManually] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const totalSlides = slides.length;

  // Detect prefers-reduced-motion preference on client mount
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

  // Determine if autoplay is currently eligible to tick
  const isAutoplayActive = !isStoppedManually && !isReducedMotion && !isHovered && !isFocusedWithin;

  // 7-second automatic progression
  useEffect(() => {
    if (!isAutoplayActive || totalSlides <= 1) {
      return;
    }

    const interval = setInterval(() => {
      nextSlide(false);
    }, 7000);

    return () => clearInterval(interval);
  }, [isAutoplayActive, totalSlides, nextSlide]);

  // Keyboard navigation (ArrowLeft: previous, ArrowRight: next)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevSlide(true);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nextSlide(true);
    }
  };

  // Touch gesture handling (Swipe Left: next, Swipe Right: previous)
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

  // Keyboard-accessible explicit pause/resume toggle
  const toggleAutoplayByKeyboard = () => {
    setIsStoppedManually((prev) => !prev);
  };

  if (!slides || slides.length === 0) {
    return null;
  }

  // Refined Three Indicators: Active is 32px x 8px pill; Inactive are 9px circles
  const renderControls = (isCurrentActive: boolean) => (
    <div className="flex items-center pt-1 sm:pt-2">
      <div
        className="flex items-center gap-2 sm:gap-2.5"
        role="tablist"
        aria-label="Hero slider slide selectors"
      >
        {slides.map((slide, index) => {
          const isSelected = index === activeIndex;
          return (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-label={`Go to slide ${index + 1}: ${slide.title}`}
              tabIndex={isCurrentActive ? 0 : -1}
              onClick={() => goToSlide(index, true)}
              className="group min-w-[36px] min-h-[36px] p-2 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full cursor-pointer"
            >
              <span
                className={`block transition-all duration-300 ease-in-out rounded-full ${
                  isSelected
                    ? "w-[32px] h-[8px] bg-[#086477] shadow-2xs"
                    : "w-[9px] h-[9px] bg-[#C5DDE0] group-hover:bg-[#8FB7BE]"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );

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
      className="relative w-full bg-surface-base overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {/* Keyboard-discoverable Accessible Stop/Restart Control (WCAG 2.2.2 compliant, zero default visual clutter) */}
      <button
        type="button"
        onClick={toggleAutoplayByKeyboard}
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-4 focus:z-30 focus:px-3.5 focus:py-1.5 focus:rounded-md focus:bg-white focus:text-[#086477] focus:font-semibold focus:text-xs focus:shadow-md focus:ring-2 focus:ring-[#086477] cursor-pointer"
      >
        {isStoppedManually ? "Resume automatic slide rotation" : "Pause automatic slide rotation"}
      </button>

      {/* Slides Container */}
      <div className="relative w-full min-h-0 lg:min-h-[640px]">
        {slides.map((slide, index) => (
          <HeroSlide
            key={slide.id}
            slide={slide}
            isActive={index === activeIndex}
            slideIndex={index}
            totalSlides={totalSlides}
            controlsElement={index === activeIndex ? renderControls(true) : null}
          />
        ))}

        {/* Sweeping Lower Wave Transition Overlay with Refined Soft-Teal Contour */}
        <div
          className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none z-20 pointer-events-none"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 1440 110"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-12 sm:h-16 lg:h-28 block preserve-3d"
            preserveAspectRatio="none"
          >
            {/* Refined Soft Teal Contour Line framing the lower wave */}
            <path
              d="M0,64 C360,102 700,90 1040,32 C1200,8 1350,14 1440,24"
              fill="none"
              stroke="#C5E2E5"
              strokeWidth="2"
              className="opacity-80"
            />
            {/* Foreground Pearl Wave sweeping smoothly upward to the right underneath the hero photograph */}
            <path
              d="M0,68 C360,106 700,94 1040,36 C1200,12 1350,18 1440,28 L1440,110 L0,110 Z"
              fill="var(--surface-base, #F6FAFA)"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
