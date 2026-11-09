import React from "react";
import type { Course, HeroSlide, Mentor } from "@/lib/content";
import { HeroSlider } from "./hero-slider";

export interface HeroSectionProps {
  slides: HeroSlide[];
  mentors?: Mentor[];
  courses?: Course[];
}

/**
 * HeroSection Component
 * Composes the 2-slide HeroSlider featuring MTO Readiness Program (5 mentors)
 * and Industry Readiness Graduate Program (IRGP, 8 mentors).
 */
export function HeroSection({ slides, mentors = [], courses = [] }: HeroSectionProps) {
  return (
    <section
      aria-label="Lead Nation Academy Hero Showcase"
      className="relative w-full bg-surface-base"
    >
      <HeroSlider slides={slides} mentors={mentors} courses={courses} />
    </section>
  );
}
