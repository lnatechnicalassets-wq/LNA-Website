import React from "react";
import type { HeroSlide } from "@/lib/content";
import { HeroSlider } from "./hero-slider";
import { HeroIntro } from "./hero-intro";

export interface HeroSectionProps {
  slides: HeroSlide[];
}

/**
 * HeroSection Component
 * Composes the 3-slide HeroSlider and the centered Academy HeroIntro statement.
 */
export function HeroSection({ slides }: HeroSectionProps) {
  return (
    <section
      aria-label="Lead Nation Academy Hero Showcase"
      className="relative w-full bg-surface-base"
    >
      <HeroSlider slides={slides} />
      <HeroIntro />
    </section>
  );
}
