"use client";

import { ArrowRight, CalendarRange, MapPin, Presentation } from "lucide-react";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./readiness-hero.module.css";
import {
  GLASS_SLANT_PX,
  RIGHT_COLUMN_X0,
  SEAM_BOTTOM_X,
  SEAM_TOP_X,
  STAGE_HEIGHT,
  STAGE_WIDTH,
} from "./seam";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-hero-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-hero-serif",
  axes: ["opsz"],
});

export type Slide = {
  id: string;
  name: string;
  nameLine1?: string;
  nameLine2?: string;
  shortTitle?: string;
  role: string;
  portraitSrc: string;
  portraitWidth?: number;
  portraitHeight?: number;
  portraitYOffset?: number;
  faceCenterRatio?: number;
  logo: { src: string; alt: string } | null;
  organization: string;
};

export type Admissions = {
  deadline: string | null;
  batchId?: string;
  startDate?: string;
  seatsLeft?: number;
  capacity?: number;
  confirmedRatio?: number;
};

const slideDuration = 2500;
const motionQuery = "(prefers-reduced-motion: reduce)";
const tileDate = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

function deriveNameLines(fullName: string): { line1: string; line2: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { line1: fullName, line2: "" };
  }
  const line2 = parts.pop()!;
  const line1 = parts.join(" ");
  return { line1, line2 };
}

function deriveShortTitle(role: string): string {
  return role.replace(/,\s*[^,]*Division$/i, "").trim();
}

function ProgramHighlights() {
  return (
    <ul className={styles.statsList} aria-label="Program highlights">
      <li className={styles.statItem}>
        <CalendarRange size={18} strokeWidth={1.5} className={styles.statIcon} aria-hidden="true" />
        <span>16 sessions, 1.5 hours each</span>
      </li>
      <li className={styles.statItem}>
        <MapPin size={18} strokeWidth={1.5} className={styles.statIcon} aria-hidden="true" />
        <span>2 industry visits</span>
      </li>
      <li className={styles.statItem}>
        <Presentation size={18} strokeWidth={1.5} className={styles.statIcon} aria-hidden="true" />
        <span>Business case simulations</span>
      </li>
    </ul>
  );
}

export function MentorSlideshow({
  title,
  slides,
  admissions,
  initialNow,
}: {
  title: string;
  slides: Slide[];
  admissions: Admissions;
  initialNow: number;
}) {
  const [selection, setSelection] = useState({ index: 0, previous: -1, cycle: 0 });
  const { index, previous, cycle } = selection;
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [now, setNow] = useState(initialNow);
  const [actionIsBelowViewport, setActionIsBelowViewport] = useState(false);
  const [failedLogos, setFailedLogos] = useState<Record<string, boolean>>({});
  const [stageScale, setStageScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const actionSlot = useRef<HTMLDivElement>(null);
  const mentorPanelId = useId();
  const portraitFilterId = useId();
  const slide = slides[index];
  const nextIndex = (index + 1) % slides.length;
  const parsedDeadline = Date.parse(admissions.deadline ?? "");
  const remaining = Number.isFinite(parsedDeadline)
    ? Math.max(0, Math.ceil((parsedDeadline - now) / 1000))
    : null;
  const isOpen = admissions.batchId !== undefined && remaining !== 0 && admissions.seatsLeft !== 0;
  const autoplay = motionAllowed && visible && slides.length > 1;

  // Track responsive scaling between 1024 and 1359px
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width >= 1024 && width < STAGE_WIDTH) {
        setStageScale(width / STAGE_WIDTH);
      } else {
        setStageScale(1);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!admissions.startDate && !admissions.deadline) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [admissions.startDate, admissions.deadline]);

  useEffect(() => {
    const preference = window.matchMedia(motionQuery);
    const syncMotion = () => setMotionAllowed(!preference.matches);
    const syncVisibility = () => setVisible(!document.hidden);
    syncMotion();
    syncVisibility();
    preference.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      preference.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setTimeout(() => {
      setSelection({ index: nextIndex, previous: index, cycle: cycle + 1 });
    }, slideDuration);
    return () => window.clearTimeout(timer);
  }, [autoplay, cycle, index, nextIndex]);

  useEffect(() => {
    const target = actionSlot.current;
    if (!target || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setActionIsBelowViewport(
          entry.boundingClientRect.bottom > (entry.rootBounds?.bottom ?? window.innerHeight)
        );
      },
      { threshold: 1 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [isOpen]);

  function select(position: number) {
    setSelection((current) => ({
      index: position,
      previous: position === current.index ? current.previous : current.index,
      cycle: current.cycle + 1,
    }));
  }

  const enrollmentUrl = {
    pathname: "/enroll",
    query: { course: "mto-readiness", batch: admissions.batchId },
  };

  // Status badge logic
  const { startDate, seatsLeft, capacity } = admissions;
  const seatFraction =
    isOpen && seatsLeft !== undefined && capacity && capacity > 0 ? seatsLeft / capacity : null;

  let badgeStatus: "available" | "limited" | "almost-full" | "closed" = "limited";
  let badgeText = "LIMITED SEATS";

  if (seatsLeft === 0) {
    badgeStatus = "closed";
    badgeText = "BATCH FULL";
  } else if (!isOpen || remaining === 0) {
    badgeStatus = "closed";
    badgeText = "ADMISSIONS CLOSED";
  } else if (seatFraction !== null && seatFraction <= 0.1) {
    badgeStatus = "almost-full";
    badgeText = "ALMOST FULL";
  } else if (seatFraction !== null && seatFraction > 0.25) {
    badgeStatus = "available";
    badgeText = "SEATS AVAILABLE";
  }

  const startMs = Date.parse(startDate ?? "");
  const formattedDate = Number.isFinite(startMs)
    ? tileDate.format(startMs).toUpperCase()
    : "01 DEC";

  return (
    <div
      ref={containerRef}
      className={`${styles.heroWrapper} ${hankenGrotesk.variable} ${fraunces.variable}`}
      style={{
        height: stageScale < 1 ? `${STAGE_HEIGHT * stageScale}px` : undefined,
      }}
    >
      <section
        className={styles.hero}
        aria-labelledby="mto-test-title"
        data-has-slid={cycle > 0}
        style={
          {
            "--seam-top": `${SEAM_TOP_X.toFixed(2)}px`,
            "--seam-bottom": `${SEAM_BOTTOM_X.toFixed(2)}px`,
            "--right-x0": `${RIGHT_COLUMN_X0.toFixed(2)}px`,
            "--glass-slant": `${GLASS_SLANT_PX.toFixed(2)}px`,
            "--slide-duration": `${slideDuration}ms`,
            "--portrait-filter": `url("#${portraitFilterId}")`,
            transform: stageScale < 1 ? `scale(${stageScale})` : undefined,
          } as CSSProperties
        }
      >
        {/* Edge Decontamination and Feather SVG Filter */}
        <svg className={styles.filters} width="0" height="0" aria-hidden="true">
          <defs>
            <filter id={portraitFilterId} colorInterpolationFilters="sRGB">
              <feMorphology in="SourceAlpha" operator="erode" radius="1.0" result="erodedAlpha" />
              <feGaussianBlur in="erodedAlpha" stdDeviation="0.5" result="featheredMask" />
              <feComposite in="SourceGraphic" in2="featheredMask" operator="in" />
            </filter>
          </defs>
        </svg>

        {/* Left & Right Panels derived from seam.ts */}
        <div className={styles.leftPanel} aria-hidden="true">
          <div className={styles.buildingBg} />
        </div>
        <div className={styles.seamLine} aria-hidden="true" />
        <div className={styles.rightPanel} aria-hidden="true" />

        {/* Left Column: text from x=56 to 420 */}
        <div className={styles.textColumn}>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowLine} aria-hidden="true" />
            <span>Management trainee officer program</span>
          </p>
          <h1 id="mto-test-title" className={styles.wordmark} aria-label={title}>
            <span className={styles.wordMask} aria-hidden="true">
              <span className={styles.wordMto}>MTO</span>
            </span>
            <span className={styles.wordMask} aria-hidden="true">
              <span className={styles.readiness}>
                READINESS
                <span className={styles.lightSweep} aria-hidden="true" />
              </span>
            </span>
          </h1>
          <p className={styles.description}>
            Aptitude tests, case interviews and assessment&#x2011;centre practice.
          </p>

          <div className={styles.bottomGroup}>
            <ProgramHighlights />
            <Link className={styles.viewLink} href="/courses/mto-readiness">
              <span>View program and fees</span>
              <span className={styles.linkUnderline} aria-hidden="true" />
              <ArrowRight size={14} className={styles.linkArrow} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Center: Mentor Photo & Dots */}
        {slide && (
          <div
            className={styles.photoFrame}
            role="region"
            aria-roledescription="carousel"
            aria-label="MTO industry mentors"
            aria-live="off"
          >
            {cycle > 0 && (
              <div key={`glass-${cycle}`} className={styles.glassSweep} aria-hidden="true" />
            )}

            <div className={styles.portraits}>
              {slides.map((mentor, position) => {
                const active = position === index;
                const upcoming = position === nextIndex;
                if (!active && position !== previous && !upcoming) return null;
                const localImage =
                  mentor.portraitSrc.startsWith("/") && !mentor.portraitSrc.startsWith("//");

                const rendW = mentor.portraitWidth ?? 530;
                const rendH = mentor.portraitHeight ?? 566;
                const yOff = mentor.portraitYOffset ?? 8;
                const faceRatio = mentor.faceCenterRatio ?? 0.5;

                return (
                  <div
                    key={mentor.id}
                    className={styles.portrait}
                    data-active={active}
                    aria-hidden={!active}
                    style={
                      {
                        "--portrait-w": `${rendW}px`,
                        "--portrait-h": `${rendH}px`,
                        "--offset-y": `${yOff}px`,
                        "--face-center-x": `${(faceRatio * 100).toFixed(1)}%`,
                      } as CSSProperties
                    }
                  >
                    <div className={styles.portraitImage}>
                      <Image
                        src={mentor.portraitSrc}
                        alt={mentor.name}
                        fill
                        unoptimized={!localImage}
                        preload={position === 0 && cycle === 0}
                        loading={position === 0 && cycle === 0 ? undefined : "eager"}
                        fetchPriority={upcoming && !active ? "low" : undefined}
                        sizes="(max-width: 1024px) 100vw, 750px"
                        quality={90}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {slides.length > 1 && (
              <div
                className={styles.dotsRow}
                role="group"
                aria-label="Mentor slideshow controls"
                onKeyDown={(event) => {
                  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                  event.preventDefault();
                  const offset = event.key === "ArrowRight" ? 1 : -1;
                  const dots = Array.from(event.currentTarget.querySelectorAll("button"));
                  const focusedIndex = dots.findIndex((dot) => dot === event.target);
                  const next =
                    ((focusedIndex < 0 ? index : focusedIndex) + offset + dots.length) %
                    dots.length;
                  select(next);
                  dots[next]?.focus();
                }}
              >
                {slides.map((mentor, position) => (
                  <button
                    key={mentor.id}
                    type="button"
                    className={styles.dotButton}
                    aria-label={`Show ${mentor.name} (${position + 1} of ${slides.length})`}
                    aria-controls={mentorPanelId}
                    aria-current={index === position ? "true" : undefined}
                    onClick={() => select(position)}
                  >
                    <span className={styles.dotMark}>
                      {autoplay && position === index && (
                        <i key={cycle} className={styles.dotFill} aria-hidden="true" />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Right Column: Three Sections Separated by 1px Hairlines */}
        <div className={styles.rightColumn}>
          {/* Section A: Date */}
          <div className={styles.sectionA}>
            <p className={styles.sectionLabel}>BATCH STARTS</p>
            <time className={styles.dateValue} dateTime={startDate}>
              {formattedDate}
            </time>
          </div>

          {/* Section B: Mentor Details */}
          <div className={styles.sectionB}>
            {slide && (
              <div id={mentorPanelId} className={styles.mentorDetailsStack} aria-live="off">
                {slides.map((mentor, position) => {
                  const derived = deriveNameLines(mentor.name);
                  const line1 = mentor.nameLine1 ?? derived.line1;
                  const line2 = mentor.nameLine2 ?? derived.line2;
                  const displayTitle = mentor.shortTitle ?? deriveShortTitle(mentor.role);
                  const hasFailedLogo = failedLogos[mentor.id];

                  return (
                    <div
                      key={mentor.id}
                      className={styles.mentorDetail}
                      data-active={position === index}
                      aria-hidden={position !== index}
                    >
                      <p className={styles.sectionLabel}>INDUSTRY MENTOR</p>
                      <div className={styles.mentorNameStack}>
                        <span className={styles.mentorNameLine}>{line1}</span>
                        <span className={styles.mentorNameLine}>{line2}</span>
                      </div>
                      <p className={styles.mentorTitle} title={displayTitle}>
                        {displayTitle}
                      </p>
                      <div className={styles.logoBox} aria-hidden={!mentor.logo || hasFailedLogo}>
                        {mentor.logo && !hasFailedLogo ? (
                          <Image
                            src={mentor.logo.src}
                            alt={mentor.logo.alt || `${mentor.organization} logo`}
                            fill
                            unoptimized
                            sizes="240px"
                            onError={() =>
                              setFailedLogos((prev) => ({ ...prev, [mentor.id]: true }))
                            }
                          />
                        ) : !mentor.logo && !hasFailedLogo ? (
                          <span className={styles.organizationFallback}>{mentor.organization}</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section C: Top-to-Bottom Layout (Badge on Own Row, Right-Aligned above Button) */}
          <div className={styles.sectionC} ref={actionSlot} data-sticky={actionIsBelowViewport}>
            {/* Limited seats badge row, right-aligned to match button arrow */}
            <div className={styles.badgeRow}>
              <div className={styles.statusBadge} data-status={badgeStatus}>
                <span className={styles.badgeRing} aria-hidden="true" />
                <span className={styles.badgeDot} aria-hidden="true" />
                <span className={styles.badgeText}>{badgeText}</span>
              </div>
            </div>

            {isOpen ? (
              <Link className={styles.ctaButton} href={enrollmentUrl}>
                <span className={styles.ctaLabel}>Enroll Now</span>
                <span className={styles.arrowChip}>
                  <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" />
                </span>
              </Link>
            ) : (
              <Link className={styles.ctaButton} href="/courses/mto-readiness">
                <span className={styles.ctaLabel}>View Program Details</span>
                <span className={styles.arrowChip}>
                  <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" />
                </span>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
