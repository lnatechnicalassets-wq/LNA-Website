"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import type { Mentor } from "@/lib/content";
import { formatMentorRoleWithCompany, getMentorAvatar, getMentorCompanyLogos } from "@/lib/mentors";
import { CompanyLogo, OfficialCompanyLogo } from "./company-logo";
import { useMentorQuickView } from "./mentor-quick-view-context";

const CARD_TRANSITION_MS = 750;
const DEFAULT_AUTOPLAY_INTERVAL_MS = 2000;

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
  const lastNavTimeRef = useRef<number>(0);
  const lastManualClickRef = useRef<number>(0);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasRevealedRef = useRef(false);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { openQuickView, setFloatingMentor, isQuickViewOpen } = useMentorQuickView();

  const total = mentors.length;
  const activeMentor = mentors[activeIndex] || mentors[0];

  // Reset activeIndex whenever mentors list changes (filtering/search/sort)
  useEffect(() => {
    setActiveIndex(defaultIndex);
    lastNavTimeRef.current = Date.now() - CARD_TRANSITION_MS;
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
      lastNavTimeRef.current = Date.now() - CARD_TRANSITION_MS;
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
            lastNavTimeRef.current = Date.now() - CARD_TRANSITION_MS;
          } else {
            setRevealState("revealing");
            revealTimerRef.current = setTimeout(() => {
              setRevealState("settled");
              lastNavTimeRef.current = Date.now() - CARD_TRANSITION_MS;
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
      lastNavTimeRef.current = Date.now();
      setActiveIndex((prev) => (prev + 1) % total);
    },
    [total]
  );

  const goToPrev = useCallback(
    (_isManual = false) => {
      if (total <= 1) return;
      lastNavTimeRef.current = Date.now();
      setActiveIndex((prev) => (prev - 1 + total) % total);
    },
    [total]
  );

  const goToIndex = useCallback(
    (index: number, _isManual = false) => {
      if (total <= 1 || index === activeIndex || index < 0 || index >= total) return;
      lastNavTimeRef.current = Date.now();
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
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

  // Schedule autoplay: 750ms transition + 1250ms post-transition hold = 2000ms total cycle
  const scheduleAutoplay = useCallback(() => {
    clearAutoplayTimers();

    if (!isAutoplayEligible) return;

    // Wait for any active 750ms slide transition to settle, then hold for the remaining cycle time
    const elapsed = Date.now() - lastNavTimeRef.current;
    const remainingTransition = Math.max(0, CARD_TRANSITION_MS - elapsed);
    const postTransitionHoldMs = Math.max(0, autoplayIntervalMs - CARD_TRANSITION_MS);

    transitionTimerRef.current = setTimeout(() => {
      if (!isAutoplayEligible) return;

      autoplayTimerRef.current = setTimeout(() => {
        if (!isAutoplayEligible) return;
        goToNext(false);
      }, postTransitionHoldMs);
    }, remainingTransition);
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

  const isInitial = revealState === "initial";
  const isRevealing = revealState === "revealing";

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
        style={{ perspective: 1400 }}
        className="relative h-[420px] sm:h-[440px] xl:h-[460px] w-full flex items-center justify-center overflow-visible"
      >
        {mentors.map((mentor, index) => {
          const slot = getSlot(index);
          const isActive = slot === 0;
          const isSlotMinus1 = slot === -1;
          const isSlot1 = slot === 1;
          const isSlotMinus2 = slot === -2;
          const isSlot2 = slot === 2;
          const isVisible = isSlotMinus2 || isSlotMinus1 || isActive || isSlot1 || isSlot2;

          // 3D Transform & Stacking Properties
          // 100% OPAQUE - ZERO TRANSPARENCY DEFECT
          let transformStyle = "translateX(0px) translateZ(-200px) scale(0.7) rotateY(0deg)";
          let zIndex = 0;
          let shadowClass = "";
          let filterStyle = "brightness(1)";
          let visibilityClass = "opacity-0 pointer-events-none";

          if (isInitial) {
            // Calm, tightly gathered stack before section scrolls into view
            if (isActive) {
              transformStyle =
                "translateX(0px) translateY(22px) translateZ(-10px) scale(0.96) rotateY(0deg)";
              zIndex = 30;
              shadowClass = "shadow-xl shadow-teal-950/50 ring-1 ring-white/50";
              filterStyle = "brightness(0.96)";
              visibilityClass = "opacity-90";
            } else if (isSlotMinus1) {
              transformStyle =
                "translateX(-20px) translateY(26px) translateZ(-40px) scale(0.92) rotateY(2deg)";
              zIndex = 20;
              shadowClass = "shadow-lg shadow-teal-950/40";
              filterStyle = "brightness(0.92)";
              visibilityClass = "opacity-60 hidden sm:block";
            } else if (isSlot1) {
              transformStyle =
                "translateX(20px) translateY(26px) translateZ(-40px) scale(0.92) rotateY(-2deg)";
              zIndex = 20;
              shadowClass = "shadow-lg shadow-teal-950/40";
              filterStyle = "brightness(0.92)";
              visibilityClass = "opacity-60 hidden sm:block";
            } else if (isSlotMinus2) {
              transformStyle =
                "translateX(-36px) translateY(30px) translateZ(-80px) scale(0.86) rotateY(4deg)";
              zIndex = 10;
              shadowClass = "shadow-md shadow-teal-950/30";
              filterStyle = "brightness(0.88)";
              visibilityClass = "opacity-0 hidden xl:block";
            } else if (isSlot2) {
              transformStyle =
                "translateX(36px) translateY(30px) translateZ(-80px) scale(0.86) rotateY(-4deg)";
              zIndex = 10;
              shadowClass = "shadow-md shadow-teal-950/30";
              filterStyle = "brightness(0.88)";
              visibilityClass = "opacity-0 hidden xl:block";
            }
          } else {
            // Fanned-out 5-Card Deck (settled or revealing)
            if (isActive) {
              transformStyle =
                "translateX(0px) translateY(0px) translateZ(30px) rotateY(0deg) scale(1.04)";
              zIndex = 30;
              shadowClass = "shadow-2xl shadow-teal-950/70 ring-1 ring-white/60";
              filterStyle = "brightness(1)";
              visibilityClass = "opacity-100";
            } else if (isSlotMinus1) {
              // Left adjacent: 75-80% horizontal visibility, subtle inward rotateY
              transformStyle =
                "translateX(-180px) translateY(0px) translateZ(-40px) rotateY(7deg) scale(0.95)";
              zIndex = 20;
              shadowClass = "shadow-xl shadow-teal-950/45";
              filterStyle = "brightness(0.98)";
              visibilityClass = "opacity-100 hidden sm:block";
            } else if (isSlot1) {
              // Right adjacent: 75-80% horizontal visibility, subtle inward rotateY
              transformStyle =
                "translateX(180px) translateY(0px) translateZ(-40px) rotateY(-7deg) scale(0.95)";
              zIndex = 20;
              shadowClass = "shadow-xl shadow-teal-950/45";
              filterStyle = "brightness(0.98)";
              visibilityClass = "opacity-100 hidden sm:block";
            } else if (isSlotMinus2) {
              // Far left: visible on wide desktop
              transformStyle =
                "translateX(-335px) translateY(0px) translateZ(-95px) rotateY(12deg) scale(0.88)";
              zIndex = 10;
              shadowClass = "shadow-lg shadow-teal-950/30";
              filterStyle = "brightness(0.94)";
              visibilityClass = "opacity-100 hidden xl:block";
            } else if (isSlot2) {
              // Far right: visible on wide desktop
              transformStyle =
                "translateX(335px) translateY(0px) translateZ(-95px) rotateY(-12deg) scale(0.88)";
              zIndex = 10;
              shadowClass = "shadow-lg shadow-teal-950/30";
              filterStyle = "brightness(0.94)";
              visibilityClass = "opacity-100 hidden xl:block";
            }
          }

          // Transition timing: 1.3s smooth fanning during reveal, 750ms standard navigation when settled
          const transitionStyle = isInitial
            ? "none"
            : isRevealing
              ? "transform 1300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 1300ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 1300ms ease, filter 1300ms ease"
              : "transform 750ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 750ms ease, filter 750ms ease";

          const avatarSrc = getMentorAvatar(mentor, index);
          const companyLogos = getMentorCompanyLogos(mentor);
          const fallbackHistoryLogos =
            companyLogos.length === 0
              ? (mentor.careerHistory?.filter((item) => Boolean(item.logoIcon)).slice(0, 2) ?? [])
              : [];

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
                filter: filterStyle,
                transition: transitionStyle,
              }}
              className={`absolute top-2 w-[230px] sm:w-[248px] xl:w-[260px] h-[400px] sm:h-[420px] xl:h-[440px] rounded-3xl overflow-hidden cursor-pointer bg-[#FAF9F6] border border-white/70 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] will-change-transform ${visibilityClass} ${shadowClass}`}
            >
              {/* Upper Portion: Fully Opaque Portrait with subtle specular glass sheen */}
              <div className="relative h-[240px] sm:h-[255px] xl:h-[270px] w-full bg-[#053A45] overflow-hidden">
                <Image
                  src={avatarSrc}
                  alt={mentor.name}
                  fill
                  priority={isActive || isSlotMinus1 || isSlot1}
                  sizes="(max-width: 640px) 240px, (max-width: 1200px) 255px, 265px"
                  className="object-cover object-top transition-transform duration-700 hover:scale-103"
                />

                {/* Subtle glass reflection highlight along top edge */}
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/20 via-white/5 to-transparent pointer-events-none"
                />

                {/* Explicit Info button replacing ambiguous '+' icon */}
                {isVisible && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openQuickView(mentor);
                    }}
                    onMouseEnter={() => setIsHoveringControl(true)}
                    onMouseLeave={() => setIsHoveringControl(false)}
                    aria-label={`View mentor info for ${mentor.name}`}
                    className={`absolute top-3 right-3 inline-flex items-center gap-1 rounded-full border backdrop-blur-xs font-semibold transition-all shadow-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477] ${
                      isActive
                        ? "px-2.5 py-1 text-[11px] bg-white/90 hover:bg-white text-[#086477] border-white ring-1 ring-white/50"
                        : "px-2 py-0.5 text-[10px] bg-white/80 hover:bg-white text-[#086477] border-white/75"
                    }`}
                  >
                    <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span>Info</span>
                  </button>
                )}
              </div>

              {/* Lower Portion: Solid Cream-White Glass Foundation (100% Opaque) */}
              <div className="px-3.5 py-3 sm:px-4 sm:py-3.5 flex flex-col justify-between gap-2 h-[160px] sm:h-[165px] xl:h-[170px] bg-[#FAF9F6] border-t border-white/50">
                <div className="min-w-0">
                  <h3 className="text-[13px] sm:text-sm xl:text-[15px] font-bold font-serif text-[#172E35] tracking-tight leading-snug line-clamp-2">
                    {mentor.name}
                  </h3>
                  <p className="text-[10.5px] sm:text-[11px] font-medium text-[#526E77] mt-0.5 leading-[1.35] line-clamp-3">
                    {formatMentorRoleWithCompany(mentor)}
                  </p>
                </div>

                {/* Company Logos Only (Official Corporate Marks) */}
                {companyLogos.length > 0 ? (
                  <div className="pt-2 border-t border-[#E5ECEE] flex items-center gap-3 min-h-[42px] sm:min-h-[46px]">
                    {companyLogos.slice(0, 2).map((logo) => (
                      <OfficialCompanyLogo
                        key={logo.src}
                        src={logo.src}
                        alt={logo.alt}
                        size="card"
                        compact={companyLogos.length > 1}
                      />
                    ))}
                  </div>
                ) : (
                  fallbackHistoryLogos.length > 0 && (
                    <div className="pt-2 border-t border-[#E5ECEE] flex items-center gap-3 min-h-[42px] sm:min-h-[46px]">
                      {fallbackHistoryLogos.map((item, idx) => (
                        <CompanyLogo
                          key={idx}
                          name={item.company}
                          logoIcon={item.logoIcon}
                          iconOnly
                          className="text-[#172E35]"
                        />
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Controls & Position Counter (Clean, Minimal, No Pause Button) */}
      <div
        style={{
          opacity: isInitial ? 0 : 1,
          transform: isInitial ? "translateY(12px)" : "translateY(0px)",
          transition: "opacity 800ms ease, transform 800ms ease",
        }}
        className="flex items-center justify-center gap-3 sm:gap-4 mt-6"
      >
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
