"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Mentor } from "@/lib/content";
import { getMentorAvatar } from "@/lib/mentors";
import { CompanyLogo } from "./company-logo";
import { useMentorQuickView } from "./mentor-quick-view-context";

export interface MentorCarouselProps {
  mentors: Mentor[];
  onSelectMentor?: (mentor: Mentor) => void;
  initialMentorId?: string;
  autoplayDisplayMs?: number;
  isSearchActive?: boolean;
}

export function MentorCarousel({
  mentors,
  onSelectMentor,
  initialMentorId = "mentor-leadership-lead",
  autoplayDisplayMs = 4000,
  isSearchActive = false,
}: MentorCarouselProps) {
  const defaultIndex = useMemo(() => {
    const foundIdx = mentors.findIndex((m) => m.id === initialMentorId);
    return foundIdx >= 0 ? foundIdx : 0;
  }, [mentors, initialMentorId]);

  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const [isInViewport, setIsInViewport] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(() =>
    typeof document !== "undefined" ? document.visibilityState === "visible" : true
  );
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isTouchActive, setIsTouchActive] = useState(false);
  const [isUserMotionStopped, setIsUserMotionStopped] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastNavTimeRef = useRef<number>(0);
  const lastManualClickRef = useRef<number>(0);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const { openQuickView, setFloatingMentor, isQuickViewOpen } = useMentorQuickView();

  const total = mentors.length;
  const activeMentor = mentors[activeIndex] || mentors[0];

  // Browser tab visibility tracking
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Check prefers-reduced-motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // IntersectionObserver to manage viewport visibility
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setIsInViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsInViewport(entry.isIntersecting);
      },
      { threshold: 0.15 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Scroll smoothly to target card index
  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const cards = container.children;
      if (!cards || !cards[index]) return;

      const card = cards[index] as HTMLElement;
      const isMobile = window.innerWidth < 640;

      isProgrammaticScrollRef.current = true;
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

      let targetLeft = card.offsetLeft;
      if (isMobile) {
        // On mobile, center the target card
        targetLeft = card.offsetLeft - (container.clientWidth - card.clientWidth) / 2;
      } else {
        // On tablet and desktop, align to start of container
        targetLeft = card.offsetLeft - container.offsetLeft;
      }

      container.scrollTo({
        left: Math.max(0, targetLeft),
        behavior,
      });

      scrollTimeoutRef.current = setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 500);
    },
    []
  );

  // Sync active mentor to quick view context and scroll position on index change
  useEffect(() => {
    if (activeMentor) {
      setFloatingMentor(activeMentor);
      onSelectMentor?.(activeMentor);
    }
  }, [activeIndex, activeMentor, onSelectMentor, setFloatingMentor]);

  // Reset activeIndex whenever mentors list changes (filtering/search)
  useEffect(() => {
    const foundIdx = mentors.findIndex((m) => m.id === initialMentorId);
    const targetIdx = foundIdx >= 0 ? foundIdx : 0;
    setActiveIndex(targetIdx);
    lastNavTimeRef.current = Date.now() - 750;
    scrollToIndex(targetIdx, "instant");
  }, [mentors, initialMentorId, scrollToIndex]);

  // Navigate to target index programmatically
  const navigateTo = useCallback(
    (newIndex: number) => {
      if (total <= 1 || newIndex < 0 || newIndex >= total) return;
      lastNavTimeRef.current = Date.now();
      setActiveIndex(newIndex);
      scrollToIndex(newIndex, "smooth");
    },
    [total, scrollToIndex]
  );

  const goToNext = useCallback(() => {
    if (total <= 1) return;
    const nextIdx = (activeIndex + 1) % total;
    navigateTo(nextIdx);
  }, [activeIndex, total, navigateTo]);

  const goToPrev = useCallback(() => {
    if (total <= 1) return;
    const prevIdx = (activeIndex - 1 + total) % total;
    navigateTo(prevIdx);
  }, [activeIndex, total, navigateTo]);

  // Manual navigation handlers with non-blocking 250ms throttle
  const handleManualNext = useCallback(() => {
    const now = Date.now();
    if (now - lastManualClickRef.current < 250) return;
    lastManualClickRef.current = now;
    goToNext();
  }, [goToNext]);

  const handleManualPrev = useCallback(() => {
    const now = Date.now();
    if (now - lastManualClickRef.current < 250) return;
    lastManualClickRef.current = now;
    goToPrev();
  }, [goToPrev]);

  const handleManualDotClick = useCallback(
    (dotIndex: number) => {
      const now = Date.now();
      if (now - lastManualClickRef.current < 250) return;
      lastManualClickRef.current = now;

      // Group or direct mapping
      const targetIndex = Math.min(dotIndex, total - 1);
      navigateTo(targetIndex);
    },
    [navigateTo, total]
  );

  // Handle native user scrolling/swiping in the snap container
  const handleScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const cards = container.children;
    if (!cards || cards.length === 0) return;

    const isMobile = window.innerWidth < 640;
    const containerCenter = container.scrollLeft + container.clientWidth / 2;

    let closestIndex = activeIndex;
    let minDistance = Infinity;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i] as HTMLElement;
      const cardPosition = isMobile
        ? card.offsetLeft + card.clientWidth / 2
        : card.offsetLeft;
      const comparePoint = isMobile ? containerCenter : container.scrollLeft;
      const distance = Math.abs(cardPosition - comparePoint);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    if (closestIndex !== activeIndex && closestIndex >= 0 && closestIndex < total) {
      setActiveIndex(closestIndex);
    }
  }, [activeIndex, total]);

  // Autoplay eligibility conditions
  const isAutoplayEligible =
    isInViewport &&
    isTabVisible &&
    !isQuickViewOpen &&
    !isSearchActive &&
    !isKeyboardFocused &&
    !isHovered &&
    !isTouchActive &&
    !isUserMotionStopped &&
    !prefersReducedMotion &&
    total > 1;

  // Clear autoplay timer helper
  const clearAutoplayTimer = useCallback(() => {
    if (autoplayTimerRef.current) {
      clearTimeout(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  }, []);

  // Schedule autoplay: 4000ms display hold time
  const scheduleAutoplay = useCallback(() => {
    clearAutoplayTimer();

    if (!isAutoplayEligible) return;

    autoplayTimerRef.current = setTimeout(() => {
      if (!isAutoplayEligible) return;
      goToNext();
    }, autoplayDisplayMs);
  }, [clearAutoplayTimer, isAutoplayEligible, autoplayDisplayMs, goToNext]);

  // Synchronize autoplay scheduling
  useEffect(() => {
    scheduleAutoplay();
    return () => {
      clearAutoplayTimer();
    };
  }, [activeIndex, isAutoplayEligible, scheduleAutoplay, clearAutoplayTimer]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      clearAutoplayTimer();
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [clearAutoplayTimer]);

  // Keyboard navigation & accessibility controls
  const handleKeyDown = (e: React.KeyboardEvent) => {
    setIsKeyboardFocused(true);

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handleManualPrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleManualNext();
    } else if (e.key === "Home") {
      e.preventDefault();
      navigateTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      navigateTo(total - 1);
    } else if (e.key === " " || e.key === "k" || e.key === "p") {
      if (e.target === containerRef.current) {
        e.preventDefault();
        setIsUserMotionStopped((prev) => !prev);
      }
    } else if (e.key === "Enter") {
      if (e.target === containerRef.current && activeMentor) {
        e.preventDefault();
        openQuickView(activeMentor);
      }
    }
  };

  // Touch swipe support to differentiate between tap and swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsTouchActive(true);
    isDraggingRef.current = false;
    touchStartPosRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const deltaX = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
    if (deltaX > 8 || deltaY > 8) {
      isDraggingRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    setIsTouchActive(false);
    touchStartPosRef.current = null;
    scheduleAutoplay();
  };

  if (total === 0) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center text-center text-white/80">
        <p className="text-base font-medium">No mentors found matching your search.</p>
        <p className="text-xs text-white/60 mt-1">
          Try another category or clear the search field.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-label="Executive mentors carousel"
      aria-roledescription="carousel"
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={(e) => {
        if ((e.target as HTMLElement).matches?.(":focus-visible")) {
          setIsKeyboardFocused(true);
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsKeyboardFocused(false);
        }
      }}
      className="relative w-full max-w-full outline-hidden select-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-4 focus-visible:ring-offset-[#086477] rounded-3xl"
    >
      {/* Accessible screen-reader live announcement for carousel movement / state */}
      <div className="sr-only" aria-live="polite">
        {isUserMotionStopped
          ? "Carousel rotation paused"
          : isKeyboardFocused
            ? "Carousel rotation paused for keyboard navigation"
            : `Showing mentor ${activeIndex + 1} of ${total}: ${activeMentor?.name}`}
      </div>

      {/* ============================================================== */}
      {/* 1. RESPONSIVE CAROUSEL TRACK                                    */}
      {/* Desktop: 3 cards | Tablet: 2 cards | Mobile: 1 centered card    */}
      {/* Smooth swipe on mobile with zero horizontal scrollbar           */}
      {/* ============================================================== */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        className="flex items-stretch gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden py-3 px-[calc((100%-min(310px,85vw))/2)] sm:px-0 w-full"
      >
        {mentors.map((mentor, index) => {
          const isActive = index === activeIndex;
          const avatarSrc = getMentorAvatar(mentor, index);

          return (
            <div
              key={mentor.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${total}: ${mentor.name}`}
              aria-hidden={!isActive}
              onClick={() => {
                if (isDraggingRef.current) return;
                openQuickView(mentor);
              }}
              className="group relative flex flex-col justify-between rounded-3xl overflow-hidden bg-[#FAF9F6] border border-white/70 shadow-md hover:shadow-xl transition-all duration-300 w-[85vw] max-w-[310px] sm:w-[calc(50%-10px)] sm:max-w-none lg:w-[calc((100%-40px)/3)] shrink-0 snap-center sm:snap-start cursor-pointer select-none"
            >
              {/* Upper Portion: Mentor Portrait */}
              <div className="relative h-[250px] sm:h-[260px] lg:h-[270px] w-full bg-[#053A45] overflow-hidden">
                <Image
                  src={avatarSrc}
                  alt={mentor.name}
                  fill
                  priority={index < 3}
                  sizes="(max-width: 640px) 310px, (max-width: 1024px) 380px, 340px"
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />

                {/* Subtle glass reflection highlight along top edge */}
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/20 via-white/5 to-transparent pointer-events-none"
                />

                {/* Plus quick-view button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openQuickView(mentor);
                  }}
                  aria-label={`Open quick view for ${mentor.name}`}
                  className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-white/40 hover:bg-white/60 border border-white/60 backdrop-blur-xs flex items-center justify-center text-white transition-all shadow-xs cursor-pointer ring-1 ring-white/50"
                >
                  <Plus className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-90" />
                </button>
              </div>

              {/* Lower Portion: Solid Cream-White Foundation with Complete, Unclipped Text */}
              <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 bg-[#FAF9F6] border-t border-[#E5ECEE] min-h-[145px] sm:min-h-[150px]">
                <div>
                  {/* Name: Full readability without clipping */}
                  <h3 className="text-base sm:text-lg font-bold font-serif text-[#172E35] tracking-tight leading-snug">
                    {mentor.name}
                  </h3>
                  {/* Designation: Full readability */}
                  <p className="text-xs sm:text-[13px] font-semibold text-[#526E77] mt-1 leading-snug">
                    {mentor.role}
                  </p>
                  {/* Company: High-contrast deep teal */}
                  <p className="text-xs sm:text-[13px] font-bold text-[#086477] mt-0.5 leading-snug">
                    {mentor.organization}
                  </p>
                </div>

                {/* Company Logos */}
                {mentor.careerHistory && mentor.careerHistory.length > 0 && (
                  <div className="pt-3 border-t border-[#E5ECEE] flex items-center gap-3 mt-3">
                    {mentor.careerHistory.slice(0, 2).map((item, idx) => (
                      <CompanyLogo
                        key={idx}
                        name={item.company}
                        logoIcon={item.logoIcon}
                        className="text-[#172E35]"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 2. CONTROLS, DOTS & POSITION COUNTER                           */}
      {/* ============================================================== */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 mt-6">
        {/* Previous Button */}
        <button
          type="button"
          onClick={handleManualPrev}
          aria-label="Previous mentor"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-white/35 text-white/90 hover:text-white hover:border-white hover:bg-white/10 flex items-center justify-center transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* 5 Indicator Dots */}
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Mentor slides">
          {Array.from({ length: Math.min(total, 5) }).map((_, idx) => {
            const isDotActive = idx === activeIndex % Math.min(total, 5);
            return (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={isDotActive}
                aria-label={`Go to slide group ${idx + 1}`}
                onClick={() => handleManualDotClick(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  isDotActive ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={handleManualNext}
          aria-label="Next mentor"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-white/35 text-white/90 hover:text-white hover:border-white hover:bg-white/10 flex items-center justify-center transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Divider */}
        <span className="w-px h-4 bg-white/30 mx-1" aria-hidden="true" />

        {/* Compact Position Indicator: e.g. 01 / 80 Mentors */}
        <span className="text-xs sm:text-sm font-semibold tracking-wide text-white">
          {String(activeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")} Mentors
        </span>
      </div>
    </div>
  );
}
