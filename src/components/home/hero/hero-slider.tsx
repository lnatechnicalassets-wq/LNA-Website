"use client";

import React, { useState, useCallback } from "react";
import type { HeroSlide as HeroSlideType } from "@/lib/content";
import { HeroSlide } from "./hero-slide";

export interface HeroSliderProps {
  slides: HeroSlideType[];
}

/**
 * HeroSlider Component
 * Fully accessible (WCAG 2.2 AA) executive carousel slider:
 * - 100% manually controlled rotation (no automatic advancement).
 * - Sighted controls: ONLY three clickable slide indicator dots.
 * - Generous invisible touch target area (32px) with small elegant visual indicator.
 * - Keyboard navigation (Left/Right arrow keys) and touch swipe gestures supported.
 * - Reduced motion respected (motion-reduce:transition-none).
 */
export function HeroSlider({ slides }: HeroSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const totalSlides = slides.length;

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = (index: number) => {
    setActiveIndex(index);
  };

  // Keyboard navigation (ArrowLeft: previous, ArrowRight: next)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevSlide();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nextSlide();
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
      prevSlide();
    } else if (deltaX < -45) {
      nextSlide();
    }
    setTouchStartX(null);
  };

  if (!slides || slides.length === 0) {
    return null;
  }

  // Hero Controls: ONLY Three Clickable Slide Indicators
  const renderControls = (isCurrentActive: boolean) => (
    <div className="flex items-center pt-1 sm:pt-2">
      <div
        className="flex items-center gap-1.5 sm:gap-2"
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
              onClick={() => goToSlide(index)}
              className="group p-2 min-w-[32px] min-h-[32px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full cursor-pointer"
            >
              <span
                className={`block transition-all duration-300 rounded-full ${
                  isSelected
                    ? "w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[#086477] shadow-xs"
                    : "w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[#C5DDE0] group-hover:bg-[#8FB7BE]"
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
      role="region"
      aria-roledescription="carousel"
      aria-label="Lead Nation Academy Featured Executive Programs and Admissions"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full bg-surface-base overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
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
