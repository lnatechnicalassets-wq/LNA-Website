import React from "react";

/**
 * HeroIntro Component
 * Renders the centered institutional statement directly below the hero slider,
 * seamlessly connecting into the corporate partners strip.
 */
export function HeroIntro() {
  return (
    <div className="relative w-full bg-surface-base overflow-hidden pt-6 sm:pt-8 pb-12 sm:pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Eyebrow Tag */}
        <div className="text-[11px] sm:text-xs md:text-[13px] font-bold tracking-[0.15em] sm:tracking-[0.2em] uppercase text-[#086477] mb-2 sm:mb-2.5">
          PROFESSIONAL LEARNING FOR TODAY&apos;S LEADERS
        </div>

        {/* Authoritative Headline (complements hero headline) */}
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-[36px] font-bold tracking-tight text-[#172E35] leading-snug sm:leading-tight max-w-3xl mx-auto break-normal">
          Learn From Industry Professionals. Build Your Future.
        </h2>

        {/* Deep Teal Accent Bar */}
        <div
          className="h-1 w-12 rounded-full bg-[#086477] mx-auto mt-3 sm:mt-3.5 mb-3.5 sm:mb-4"
          aria-hidden="true"
        />

        {/* Supporting Editorial Paragraph */}
        <p className="text-sm sm:text-base lg:text-lg text-[#3D5A62] leading-relaxed max-w-2xl mx-auto font-normal">
          Practical, industry-relevant executive programs in finance, strategy, leadership and
          digital transformation — designed for professionals and business leaders in Bangladesh.
        </p>
      </div>
    </div>
  );
}
