import React from "react";
import type { HeroSlide } from "@/lib/content";
import { HeroSlider } from "./hero-slider";

export interface HeroSectionProps {
  slides: HeroSlide[];
}

/**
 * HeroSection Component
 * Composes the 3-slide HeroSlider with approved photographic curves, flowing
 * directly into the Partners section (Option A: Minimal Institutional).
 */
export function HeroSection({ slides }: HeroSectionProps) {
  return (
    <section
      aria-label="Lead Nation Academy Hero Showcase"
      className="relative w-full bg-surface-base"
    >
      <HeroSlider slides={slides} />
    </section>
  );
}
