"use client";

import React, { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroSlide as HeroSlideType } from "@/lib/content";
import { HeroSlide } from "./hero-slide";

export interface HeroSliderProps {
  slides: HeroSlideType[];
}

/**
 * HeroSlider Component
 * Fully accessible (WCAG 2.2 AA) executive carousel slider:
 * - 100% manually controlled rotation (no automatic advancement).
 * - Sighted controls: 3 slide indicators, previous arrow, next arrow (no counter badge, no pause button).
 * - Clean UI with comfortable 32px-36px touch targets and generous spacing.
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

  // Refined Hero Controls: Indicators + Previous Arrow + Next Arrow (100% manual, uncluttered editorial design)
  const renderControls = (isCurrentActive: boolean) => (
    <div className="flex items-center gap-3.5 sm:gap-5 pt-1 sm:pt-2">
      {/* Three Slide Indicators */}
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
              className="group p-1 sm:p-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full cursor-pointer"
            >
              <span
                className={`block transition-all duration-300 rounded-full ${
                  isSelected
                    ? "w-7 sm:w-9 h-2.5 sm:h-3 bg-[#086477] shadow-xs"
                    : "w-2.5 sm:w-3 h-2.5 sm:h-3 bg-[#C5DDE0] group-hover:bg-[#8FB7BE]"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Manual Navigation Arrows (Previous & Next) */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          tabIndex={isCurrentActive ? 0 : -1}
          onClick={prevSlide}
          aria-label="Previous slide"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-border-default/80 bg-white/95 hover:bg-white text-text-primary hover:text-primary transition-colors flex items-center justify-center shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          tabIndex={isCurrentActive ? 0 : -1}
          onClick={nextSlide}
          aria-label="Next slide"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-border-default/80 bg-white/95 hover:bg-white text-text-primary hover:text-primary transition-colors flex items-center justify-center shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
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
            controlsElement={renderControls(index === activeIndex)}
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
