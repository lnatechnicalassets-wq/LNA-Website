"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Mentor } from "@/lib/content";
import { MentorDisplayCard } from "./mentor-display-card";
import { useMentorQuickView } from "./mentor-quick-view-context";

const DEFAULT_AUTOPLAY_INTERVAL_MS = 5000;

export interface MentorCarouselProps {
  mentors: Mentor[];
  onSelectMentor?: (mentor: Mentor) => void;
  initialMentorId?: string;
  autoplayIntervalMs?: number;
  isSearchActive?: boolean;
}

export function MentorCarousel({
  mentors,
  onSelectMentor,
  initialMentorId,
  autoplayIntervalMs = DEFAULT_AUTOPLAY_INTERVAL_MS,
  isSearchActive = false,
}: MentorCarouselProps) {
  const defaultIndex = useMemo(() => {
    if (!initialMentorId) return 0;
    const foundIdx = mentors.findIndex((m) => m.id === initialMentorId);
    return foundIdx >= 0 ? foundIdx : 0;
  }, [mentors, initialMentorId]);

  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const [isInViewport, setIsInViewport] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(() =>
    typeof document !== "undefined" ? document.visibilityState === "visible" : true
  );
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);
  const [isUserMotionStopped, setIsUserMotionStopped] = useState(false);
  const [isHoveringControl, setIsHoveringControl] = useState(false);
  const [revealState, setRevealState] = useState<"initial" | "revealing" | "settled">("initial");

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const lastManualClickRef = useRef<number>(0);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasRevealedRef = useRef(false);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { openQuickView, setFloatingMentor, isQuickViewOpen } = useMentorQuickView();

  const total = mentors.length;
  const activeMentor = mentors[activeIndex] || mentors[0];

  // Reset activeIndex whenever mentors list changes (filtering/search/sort)
  useEffect(() => {
    setActiveIndex(defaultIndex);
  }, [defaultIndex, mentors]);

  // Sync active mentor to quick view context
  useEffect(() => {
    if (activeMentor) {
      setFloatingMentor(activeMentor);
      onSelectMentor?.(activeMentor);
    }
  }, [activeIndex, activeMentor, onSelectMentor, setFloatingMentor]);

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

  // IntersectionObserver to trigger initial reveal and manage autoplay visibility
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setIsInViewport(true);
      setRevealState("settled");
      hasRevealedRef.current = true;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsInViewport(entry.isIntersecting);

        // One-time entrance reveal animation (1.3s)
        if (entry.isIntersecting && !hasRevealedRef.current) {
          hasRevealedRef.current = true;
          if (prefersReducedMotion) {
            setRevealState("settled");
          } else {
            setRevealState("revealing");
            revealTimerRef.current = setTimeout(() => {
              setRevealState("settled");
            }, 1300);
          }
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, [prefersReducedMotion]);

  // Navigation functions
  const goToNext = useCallback(
    (_isManual = false) => {
      if (total <= 1) return;
      setActiveIndex((prev) => (prev + 1) % total);
    },
    [total]
  );

  const goToPrev = useCallback(
    (_isManual = false) => {
      if (total <= 1) return;
      setActiveIndex((prev) => (prev - 1 + total) % total);
    },
    [total]
  );

  const goToIndex = useCallback(
    (index: number, _isManual = false) => {
      if (total <= 1 || index === activeIndex || index < 0 || index >= total) return;
      setActiveIndex(index);
    },
    [activeIndex, total]
  );

  // Manual navigation handlers with non-blocking 250ms throttle (prevents freezing on 20 rapid clicks)
  const handleManualNext = useCallback(() => {
    const now = Date.now();
    if (now - lastManualClickRef.current < 250) return;
    lastManualClickRef.current = now;
    goToNext(true);
  }, [goToNext]);

  const handleManualPrev = useCallback(() => {
    const now = Date.now();
    if (now - lastManualClickRef.current < 250) return;
    lastManualClickRef.current = now;
    goToPrev(true);
  }, [goToPrev]);

  const handleManualDotClick = useCallback(
    (index: number) => {
      const now = Date.now();
      if (now - lastManualClickRef.current < 250) return;
      lastManualClickRef.current = now;
      goToIndex(index, true);
    },
    [goToIndex]
  );

  // Autoplay eligibility conditions
  const isAutoplayEligible =
    revealState === "settled" &&
    isInViewport &&
    isTabVisible &&
    !isQuickViewOpen &&
    !isSearchActive &&
    !isKeyboardFocused &&
    !isUserMotionStopped &&
    !isHoveringControl &&
    !prefersReducedMotion &&
    total > 1;

  // Clear timers helper
  const clearAutoplayTimers = useCallback(() => {
    if (autoplayTimerRef.current) {
      clearTimeout(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  }, []);

  // Schedule autoplay with a readable hold between fixed-slot changes.
  const scheduleAutoplay = useCallback(() => {
    clearAutoplayTimers();

    if (!isAutoplayEligible) return;

    // A fresh full interval follows initial reveal, manual navigation, or resume.
    autoplayTimerRef.current = setTimeout(() => {
      autoplayTimerRef.current = null;
      if (isAutoplayEligible) goToNext(false);
    }, autoplayIntervalMs);
  }, [clearAutoplayTimers, isAutoplayEligible, autoplayIntervalMs, goToNext]);

  // Synchronize autoplay scheduling
  useEffect(() => {
    scheduleAutoplay();
    return () => {
      clearAutoplayTimers();
    };
  }, [activeIndex, isAutoplayEligible, scheduleAutoplay, clearAutoplayTimers]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      clearAutoplayTimers();
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, [clearAutoplayTimers]);

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
      goToIndex(0, true);
    } else if (e.key === "End") {
      e.preventDefault();
      goToIndex(total - 1, true);
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

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (deltaX > 45) {
      handleManualPrev();
    } else if (deltaX < -45) {
      handleManualNext();
    }
    touchStartX.current = null;
  };

  // Slot Calculation:
  // Slot -2 (Far Left, Back, z-10)
  // Slot -1 (Left Adjacent, Middle, z-20)
  // Slot 0 (Center, Front, z-30)
  // Slot 1 (Right Adjacent, Middle, z-20)
  // Slot 2 (Far Right, Back, z-10)
  const getSlot = useCallback(
    (index: number) => {
      if (total <= 1) return index === activeIndex ? 0 : 99;
      let diff = index - activeIndex;
      while (diff < -Math.floor(total / 2)) diff += total;
      while (diff > Math.floor(total / 2)) diff -= total;
      if (diff < -2) return -99;
      if (diff > 2) return 99;
      return diff;
    },
    [activeIndex, total]
  );

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
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onPointerDown={() => setIsKeyboardFocused(false)}
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
      {/* 1. Symmetrical 5-Card Layered 3D Carousel Deck */}
      <div
        style={{ isolation: "isolate", containerType: "inline-size" }}
        className="relative h-[420px] sm:h-[440px] xl:h-[460px] w-full flex items-center justify-center overflow-hidden"
      >
        {mentors.map((mentor, index) => {
          const slot = getSlot(index);
          const isActive = slot === 0;
          const isSlotMinus1 = slot === -1;
          const isSlot1 = slot === 1;
          const isSlotMinus2 = slot === -2;
          const isSlot2 = slot === 2;
          const isVisible = isSlotMinus2 || isSlotMinus1 || isActive || isSlot1 || isSlot2;

          // Keep a fixed two-dimensional stacking context. 3D perspective can override
          // z-index while cards cross, which obscures the active mentor.
          const distance = Math.abs(slot);
          const transformStyle = isActive
            ? "translateX(0) scale(1)"
            : distance === 1
              ? `translateX(calc(${slot < 0 ? -1 : 1} * min(21cqw, 180px))) scale(0.94)`
              : `translateX(calc(${slot < 0 ? -1 : 1} * min(37cqw, 335px))) scale(0.86)`;
          const zIndex = isActive ? 50 : distance === 1 ? 20 : distance === 2 ? 10 : 0;
          const visibilityClass = isActive
            ? "opacity-100"
            : distance === 1
              ? "hidden sm:block opacity-100"
              : distance === 2
                ? "hidden xl:block opacity-100"
                : "hidden";
          const shadowClass = isActive ? "shadow-xl ring-1 ring-white/60" : "shadow-lg";

          return (
            <div
              key={mentor.id}
              data-testid="mentor-card"
              data-mentor-id={mentor.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${total}: ${mentor.name}`}
              aria-hidden={!isActive}
              onClick={() => {
                if (isActive) {
                  openQuickView(mentor);
                } else if (isSlotMinus1) {
                  handleManualPrev();
                } else if (isSlot1) {
                  handleManualNext();
                } else if (isVisible) {
                  handleManualDotClick(index);
                }
              }}
              style={{
                transform: transformStyle,
                zIndex,
              }}
              className={`absolute top-2 w-[230px] sm:w-[248px] xl:w-[260px] h-[400px] sm:h-[420px] xl:h-[440px] rounded-3xl overflow-hidden cursor-pointer bg-[#FAF9F6] border border-white/70 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] ${visibilityClass} ${shadowClass}`}
            >
              <MentorDisplayCard
                mentor={mentor}
                index={index}
                active={isActive}
                priority={false}
                onInfo={isVisible ? () => openQuickView(mentor) : undefined}
                onControlHover={setIsHoveringControl}
              />
            </div>
          );
        })}
      </div>

      {/* 2. Controls & Position Counter (Clean, Minimal, No Pause Button) */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 mt-6">
        {/* Previous Button */}
        <button
          type="button"
          onClick={handleManualPrev}
          onMouseEnter={() => setIsHoveringControl(true)}
          onMouseLeave={() => setIsHoveringControl(false)}
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
                onMouseEnter={() => setIsHoveringControl(true)}
                onMouseLeave={() => setIsHoveringControl(false)}
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
          onMouseEnter={() => setIsHoveringControl(true)}
          onMouseLeave={() => setIsHoveringControl(false)}
          aria-label="Next mentor"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-white/35 text-white/90 hover:text-white hover:border-white hover:bg-white/10 flex items-center justify-center transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Divider */}
        <span className="w-px h-4 bg-white/30 mx-1" aria-hidden="true" />

        {/* Compact Position Indicator: e.g. 03 / 15 Mentors */}
        <span className="text-xs sm:text-sm font-semibold tracking-wide text-white">
          {String(activeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")} Mentors
        </span>
      </div>
    </div>
  );
}
