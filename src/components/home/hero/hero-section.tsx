import React from "react";
import type { Course, HeroSlide, Mentor } from "@/lib/content";
import { getMtoHeroCourse } from "@/server/catalog/mto-hero";
import { MtoHero } from "./mto-hero";

export interface HeroSectionProps {
  slides?: HeroSlide[];
  mentors?: Mentor[];
  courses?: Course[];
}

export async function HeroSection({ mentors = [], courses = [] }: HeroSectionProps) {
  const program = await getMtoHeroCourse(courses, [], mentors);
  if (!program) return null;
  return <MtoHero program={program} />;
}
