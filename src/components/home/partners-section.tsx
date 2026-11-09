"use client";

import React, { useState } from "react";
import type { Partner } from "@/lib/content";

export interface PartnersSectionProps {
  partners: Partner[];
}

/**
 * Corporate Partner Logos & Wordmarks (Provenance Class A, Rule R15).
 * Generously sized for high-visibility editorial branding across desktop and mobile.
 */
function PartnerWordmark({ id }: { id: string }) {
  const uniformLogoClass =
    "h-10 sm:h-11 md:h-13 lg:h-15 xl:h-16 w-auto object-contain select-none shrink-0";
  const uniformContainerClass =
    "flex items-center justify-center select-none h-12 sm:h-13 md:h-15 lg:h-17 xl:h-18 px-1";

  switch (id) {
    case "partner-btrc":
      return (
        <div className={uniformContainerClass}>
          <img src="/images/partners/btrc.png" alt="BTRC" className={uniformLogoClass} />
        </div>
      );

    case "partner-sheba":
      return (
        <div className={uniformContainerClass}>
          <img src="/images/partners/sheba.png" alt="Sheba Platform" className={uniformLogoClass} />
        </div>
      );

    case "partner-ictd":
      return (
        <div className={uniformContainerClass}>
          <img src="/images/partners/ictd.png" alt="ICT Division" className={uniformLogoClass} />
        </div>
      );

    case "partner-ecourier":
      return (
        <div className={uniformContainerClass}>
          <img src="/images/partners/ecourier.png" alt="eCourier" className={uniformLogoClass} />
        </div>
      );

    case "partner-goyara":
      return (
        <div className={uniformContainerClass}>
          <img src="/images/partners/goyara.png" alt="Goyara" className={uniformLogoClass} />
        </div>
      );

    case "partner-unicert":
      return (
        <div className={uniformContainerClass}>
          <img
            src="/images/partners/unicert.png"
            alt="Unicert Global"
            className={uniformLogoClass}
          />
        </div>
      );

    case "partner-triptakerz":
      return (
        <div className={uniformContainerClass}>
          <img
            src="/images/partners/triptakerz.png"
            alt="Trip Takerz"
            className={uniformLogoClass}
          />
        </div>
      );

    case "partner-banking":
      return (
        <div className="flex items-center gap-4 sm:gap-5 select-none h-16 sm:h-20 md:h-24">
          {/* Diamond Financial Crest */}
          <svg
            className="h-9 w-9 sm:h-12 sm:w-12 md:h-14 md:w-14 shrink-0 text-[#086477]"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect
              x="14"
              y="2"
              width="16"
              height="16"
              rx="3"
              transform="rotate(45 14 2)"
              fill="#086477"
              fillOpacity="0.12"
              stroke="#086477"
              strokeWidth="2"
            />
            <path
              d="M10 14L14 10L18 14M14 18V12"
              stroke="#086477"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight text-[#172E35] whitespace-nowrap">
            APEX <span className="font-bold text-[#086477]">FINANCIAL</span>
          </span>
        </div>
      );

    case "partner-rmg":
      return (
        <div className="flex items-center gap-4 sm:gap-5 select-none h-16 sm:h-20 md:h-24">
          {/* Industrial Geometric Peak */}
          <svg
            className="h-9 w-9 sm:h-12 sm:w-12 md:h-14 md:w-14 shrink-0 text-[#172E35]"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M4 22L11 8L17 19L20 13L24 22H4Z"
              fill="#172E35"
              fillOpacity="0.1"
              stroke="#172E35"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="11" cy="7" r="2" fill="#086477" />
          </svg>
          <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight text-[#172E35] whitespace-nowrap">
            CRESTLINE <span className="font-medium text-[#5A737D]">ENTERPRISE</span>
          </span>
        </div>
      );

    case "partner-telecom":
      return (
        <div className="flex items-center gap-4 sm:gap-5 select-none h-16 sm:h-20 md:h-24">
          {/* Telecommunications Pulse Rings */}
          <svg
            className="h-9 w-9 sm:h-12 sm:w-12 md:h-14 md:w-14 shrink-0 text-[#086477]"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="14" cy="14" r="11" stroke="#086477" strokeWidth="1.5" strokeOpacity="0.3" />
            <circle cx="14" cy="14" r="7" stroke="#086477" strokeWidth="1.8" />
            <circle cx="14" cy="14" r="3" fill="#086477" />
          </svg>
          <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight text-[#172E35] whitespace-nowrap">
            TELENEX <span className="font-bold text-[#086477]">GLOBAL</span>
          </span>
        </div>
      );

    case "partner-tech":
      return (
        <div className="flex items-center gap-4 sm:gap-5 select-none h-16 sm:h-20 md:h-24">
          {/* Isometric Cloud AI Cube */}
          <svg
            className="h-9 w-9 sm:h-12 sm:w-12 md:h-14 md:w-14 shrink-0 text-[#172E35]"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M14 3L23 8V18L14 23L5 18V8L14 3Z"
              fill="#086477"
              fillOpacity="0.08"
              stroke="#172E35"
              strokeWidth="1.8"
            />
            <path
              d="M14 3V23M5 8L23 18M5 18L23 8"
              stroke="#086477"
              strokeWidth="1.2"
              strokeOpacity="0.5"
            />
          </svg>
          <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight text-[#172E35] whitespace-nowrap">
            STRATOS <span className="font-bold text-[#086477]">CLOUD</span>
          </span>
        </div>
      );

    case "partner-pharma":
      return (
        <div className="flex items-center gap-4 sm:gap-5 select-none h-16 sm:h-20 md:h-24">
          {/* Life Sciences Bio-Helix Cross */}
          <svg
            className="h-9 w-9 sm:h-12 sm:w-12 md:h-14 md:w-14 shrink-0 text-[#086477]"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect x="11.5" y="4" width="5" height="20" rx="2.5" fill="#086477" fillOpacity="0.2" />
            <rect x="4" y="11.5" width="20" height="5" rx="2.5" fill="#086477" fillOpacity="0.2" />
            <circle cx="14" cy="14" r="3.5" fill="#086477" />
          </svg>
          <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight text-[#172E35] whitespace-nowrap">
            NOVAVITA <span className="font-medium text-[#5A737D]">SCIENCES</span>
          </span>
        </div>
      );

    case "partner-logistics":
    default:
      return (
        <div className="flex items-center gap-4 sm:gap-5 select-none h-16 sm:h-20 md:h-24">
          {/* Supply Chain Forward Chevrons */}
          <svg
            className="h-9 w-9 sm:h-12 sm:w-12 md:h-14 md:w-14 shrink-0 text-[#172E35]"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M7 6L15 14L7 22M15 6L23 14L15 22"
              stroke="#086477"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight text-[#172E35] whitespace-nowrap">
            HORIZON <span className="font-bold text-[#172E35]">GLOBAL</span>
          </span>
        </div>
      );
  }
}

/**
 * PartnersSection Component
 * Implements continuous horizontal movement (Brain Station 23 concept) with Minimal Institutional design:
 * - Centered "Our Partners" heading in Dark Slate (#172E35) without any prominent visible pause icon.
 * - Continuous, smooth right-to-left linear movement (traversal ~40s).
 * - Seamless loop with identical duplicated tracks (Track 2 aria-hidden).
 * - Subtle left/right gradient edge boundary fades.
 * - Accessible motion-stop functionality (WCAG 2.2.2 compliant):
 *   1. Automatic pause on hover and focus-within.
 *   2. Usable tap/click toggle on the track container for mobile and touch interactions.
 *   3. Keyboard-discoverable stop button (sr-only, visible on keyboard focus).
 *   4. prefers-reduced-motion stationary fallback.
 * - Open Pearl background, zero cards, zero capsule, zero page overflow.
 */
export function PartnersSection({ partners }: PartnersSectionProps) {
  const [isPaused, setIsPaused] = useState(false);

  if (!partners || partners.length === 0) {
    return null;
  }

  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  return (
    <section
      aria-label="Our Partners — Corporate Sector Alignments"
      className="relative w-full bg-surface-base pt-10 sm:pt-14 md:pt-18 pb-16 sm:pb-22 md:pb-26 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Centered Heading */}
        <div className="relative flex items-center justify-center mb-12 sm:mb-14 md:mb-16">
          <h2 className="text-center text-sm sm:text-base md:text-lg font-extrabold tracking-[0.25em] uppercase text-[#086477]">
            Our Partners
          </h2>

          {/* Keyboard-discoverable Accessible Stop/Resume Button (WCAG 2.2.2 compliant, visible on focus only) */}
          <button
            type="button"
            onClick={togglePause}
            className="sr-only focus:not-sr-only focus:absolute focus:right-0 focus:top-1/2 focus:-translate-y-1/2 px-3 py-1 text-xs font-semibold rounded-md bg-white text-[#086477] shadow-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#086477] cursor-pointer"
          >
            {isPaused ? "Resume partner logos movement" : "Pause partner logos movement"}
          </button>
        </div>

        {/* Continuous Logo Track Viewport with Tap/Click Pause Support for Touch Users */}
        <div
          className="relative w-full overflow-hidden cursor-pointer"
          role="region"
          aria-label="Partner organizations (tap or press enter to pause movement)"
          tabIndex={0}
          onClick={togglePause}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              togglePause();
            }
          }}
        >
          {/* Status announcement for assistive technology */}
          <span className="sr-only" aria-live="polite">
            {isPaused ? "Partner logos animation paused" : "Partner logos animation playing"}
          </span>

          {/* Subtle Left and Right Edge Boundary Fades */}
          <div
            className="absolute left-0 top-0 bottom-0 w-20 sm:w-32 md:w-44 bg-gradient-to-r from-[var(--surface-base,#F6FAFA)] to-transparent pointer-events-none z-10"
            aria-hidden="true"
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-20 sm:w-32 md:w-44 bg-gradient-to-l from-[var(--surface-base,#F6FAFA)] to-transparent pointer-events-none z-10"
            aria-hidden="true"
          />

          {/* Marquee Motion Container */}
          <div
            className={`animate-marquee flex items-center ${
              isPaused ? "animate-marquee-paused" : ""
            }`}
          >
            {/* Primary Track (Accessible to Screen Readers) */}
            <div className="flex items-center gap-8 sm:gap-10 md:gap-12 lg:gap-14 shrink-0 pr-8 sm:pr-10 md:pr-12 lg:pr-14">
              {partners.map((partner) => (
                <div
                  key={partner.id}
                  className="flex items-center opacity-95 hover:opacity-100 transition-opacity select-none shrink-0"
                  title={
                    partner.isPlaceholder
                      ? `${partner.name} (Demonstration Wordmark)`
                      : partner.name
                  }
                >
                  <PartnerWordmark id={partner.id} />
                  {partner.isPlaceholder && (
                    <span className="sr-only"> (Demonstration Wordmark)</span>
                  )}
                </div>
              ))}
            </div>

            {/* Duplicated Track for Seamless Loop (Hidden from Assistive Technology) */}
            <div
              aria-hidden="true"
              className="flex items-center gap-8 sm:gap-10 md:gap-12 lg:gap-14 shrink-0 pr-8 sm:pr-10 md:pr-12 lg:pr-14"
            >
              {partners.map((partner, index) => (
                <div
                  key={`dup-${partner.id}-${index}`}
                  className="flex items-center opacity-95 hover:opacity-100 transition-opacity select-none shrink-0"
                >
                  <PartnerWordmark id={partner.id} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Retain backward compatibility alias
export const PartnersStrip = PartnersSection;
