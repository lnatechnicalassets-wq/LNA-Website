"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  Briefcase,
  Layers,
  Cpu,
  PenTool,
  BarChart3,
  UserCheck,
  Search,
  ArrowRight,
  TrendingUp,
  X,
} from "lucide-react";
import type { Mentor } from "@/lib/content";
import { MentorCarousel } from "./mentor-carousel";

export interface MentorsSectionProps {
  mentors: Mentor[];
  initialMentorId?: string;
}

interface CategoryConfig {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: CategoryConfig[] = [
  { id: "all", name: "All Mentors", icon: Users },
  { id: "Business & Leadership", name: "Business & Leadership", icon: Briefcase },
  { id: "Finance & Banking", name: "Finance & Banking", icon: Layers },
  { id: "Technology & AI", name: "Technology & AI", icon: Cpu },
  { id: "Design & UX", name: "Design & UX", icon: PenTool },
  { id: "Marketing & Growth", name: "Marketing & Growth", icon: BarChart3 },
  { id: "HR & Operations", name: "HR & Operations", icon: UserCheck },
];

export function MentorsSection({
  mentors,
  initialMentorId = "mentor-leadership-lead",
}: MentorsSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);

  // Dynamic category counts derived from actual mentor records
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: mentors.length };
    CATEGORIES.forEach((cat) => {
      if (cat.id !== "all") counts[cat.id] = 0;
    });
    mentors.forEach((m) => {
      (m.categories || []).forEach((c) => {
        if (counts[c] !== undefined) {
          counts[c]++;
        }
      });
    });
    return counts;
  }, [mentors]);

  // Combined category and search filtering
  const filteredMentors = useMemo(() => {
    let list = mentors;
    if (selectedCategory !== "all") {
      list = list.filter((m) => m.categories?.includes(selectedCategory));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((m) => {
        const matchName = m.name.toLowerCase().includes(q);
        const matchRole = m.role.toLowerCase().includes(q);
        const matchOrg = m.organization.toLowerCase().includes(q);
        const matchBio = m.bio.toLowerCase().includes(q);
        const matchExp = m.expertise?.some((e) => e.toLowerCase().includes(q));
        const matchCompany = m.careerHistory?.some((c) => c.company.toLowerCase().includes(q));
        return matchName || matchRole || matchOrg || matchBio || matchExp || matchCompany;
      });
    }
    return list;
  }, [mentors, selectedCategory, searchQuery]);

  const handleFindMentor = () => {
    const inputEl = document.getElementById("mentor-search-input");
    if (inputEl instanceof HTMLInputElement) {
      inputEl.focus();
      inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleClearFilters = () => {
    setSelectedCategory("all");
    setSearchQuery("");
  };

  return (
    <section
      id="mentors"
      aria-labelledby="mentors-heading"
      className="relative w-full overflow-hidden bg-[#F6FAFA] text-[#172E35] pt-12 pb-14 sm:pt-14 sm:pb-16 lg:pt-16 lg:pb-18"
    >
      {/* Sweeping Two-Tone Background Curve: Pearl to Deep Teal */}
      <div aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Desktop Sweeping Curve (>= 1024px) */}
        <svg
          viewBox="0 0 1440 900"
          fill="none"
          preserveAspectRatio="none"
          className="hidden lg:block absolute inset-0 w-full h-full"
        >
          <defs>
            <linearGradient id="deepTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#086477" />
              <stop offset="50%" stopColor="#054452" />
              <stop offset="100%" stopColor="#03272F" />
            </linearGradient>
            <linearGradient id="softTealAccent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C5E2E5" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#086477" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Soft Transition Wave Accent */}
          <path
            d="M 280 900 C 420 700, 680 340, 900 0 L 1440 0 L 1440 900 Z"
            fill="url(#softTealAccent)"
          />

          {/* Primary Sweeping Deep Teal Curve */}
          <path
            d="M 340 900 C 460 680, 720 300, 950 0 L 1440 0 L 1440 900 Z"
            fill="url(#deepTealGrad)"
          />
        </svg>

        {/* Mobile/Tablet Sweeping Curve (< 1024px): Preserves contrast for text on Pearl background */}
        <svg
          viewBox="0 0 400 1000"
          fill="none"
          preserveAspectRatio="none"
          className="block lg:hidden absolute inset-0 w-full h-full"
        >
          <defs>
            <linearGradient id="deepTealGradMobile" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#086477" />
              <stop offset="60%" stopColor="#054452" />
              <stop offset="100%" stopColor="#03272F" />
            </linearGradient>
          </defs>
          <path
            d="M 0 540 Q 200 500, 400 530 L 400 1000 L 0 1000 Z"
            fill="url(#deepTealGradMobile)"
          />
        </svg>

        {/* Subtle radial glow in deep teal area for dimensional depth */}
        <div className="absolute right-0 top-0 w-2/3 h-full bg-radial from-white/5 via-transparent to-transparent opacity-60" />
      </div>

      <div className="relative z-10 max-w-7xl xl:max-w-[1360px] 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* ============================================================== */}
        {/* UPPER BAR: Category Filters & Search Field                     */}
        {/* ============================================================== */}
        <div className="mb-10 sm:mb-12 lg:mb-14">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6">
            {/* Category Pills (2-Row Wrap on Desktop [4 + 3], Scrollable on Mobile) */}
            <div
              className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto lg:overflow-visible lg:flex-wrap pb-2 lg:pb-0 scrollbar-none max-w-full lg:max-w-[820px] xl:max-w-[840px] scroll-smooth"
              role="tablist"
              aria-label="Filter mentors by category"
            >
              {CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const count = categoryCounts[cat.id] ?? 0;
                const isActive = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-[13px] font-semibold transition-all duration-200 cursor-pointer shadow-2xs shrink-0 ${
                      isActive
                        ? "bg-[#086477] text-white ring-2 ring-white/40 shadow-sm"
                        : "bg-white text-[#172E35] border border-[#E5ECEE] hover:border-[#086477]/40 hover:bg-[#F6FAFA]"
                    }`}
                  >
                    <IconComponent
                      className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-white" : "text-[#526E77]"}`}
                    />
                    <span>{cat.name}</span>
                    <span
                      className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        isActive ? "bg-[#0B7F96] text-white" : "bg-[#F0F4F5] text-[#526E77]"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Compact Search Field aligned with Row 2 on Desktop */}
            <div className="relative flex items-center w-full lg:w-72 xl:w-80 shrink-0">
              <Search className="absolute left-3.5 h-4 w-4 text-[#526E77] pointer-events-none" />
              <input
                id="mentor-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Search mentors, company or expertise..."
                aria-label="Search mentors by name, company, designation or expertise"
                className="w-full pl-10 pr-9 py-2.5 rounded-full bg-white text-[#172E35] placeholder:text-[#526E77]/80 text-xs sm:text-[13px] font-medium border border-[#E5ECEE] shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#086477] focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search query"
                  className="absolute right-3 p-1 rounded-full text-[#526E77] hover:text-[#172E35] hover:bg-[#F0F4F5] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* MAIN SHOWCASE: Left Editorial Column + Right 5-Card Deck       */}
        {/* ============================================================== */}
        <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8 lg:gap-8 xl:gap-12 pt-2">
          {/* 1. Left Editorial Content Column (Compact & Fixed Width: 300px - 320px) */}
          <div className="w-full lg:w-[300px] xl:w-[320px] shrink-0 flex flex-col justify-center z-10">
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#172E35]">
                Our Mentors
              </span>
              <span className="w-10 h-px bg-[#172E35]/30" />
            </div>

            {/* Serif Heading */}
            <h2
              id="mentors-heading"
              className="text-3xl sm:text-4xl lg:text-[46px] font-serif font-extrabold text-[#172E35] tracking-tight leading-[1.12]"
            >
              Meet Our
              <br />
              Mentors
            </h2>

            {/* Description */}
            <p className="mt-4 sm:mt-5 text-sm sm:text-base text-[#526E77] leading-relaxed max-w-sm">
              Learn from a curated group of senior leaders, practitioners, and executives
              who&apos;ve built and scaled impactful organizations across industries.
            </p>

            {/* Three Highlights with Thin Dividers */}
            <div className="mt-8 pt-6 border-t border-[#E5ECEE] grid grid-cols-3 gap-2 sm:gap-2.5 max-w-[340px]">
              {/* Highlight 1 */}
              <div className="flex flex-col gap-2">
                <Users className="h-5 w-5 text-[#086477]" />
                <span className="text-xs font-semibold text-[#172E35] leading-snug">
                  Industry Experts
                </span>
              </div>

              {/* Highlight 2 */}
              <div className="flex flex-col gap-2 pl-2 border-l border-[#E5ECEE]">
                <Layers className="h-5 w-5 text-[#086477]" />
                <span className="text-xs font-semibold text-[#172E35] leading-snug">
                  Real-World Experience
                </span>
              </div>

              {/* Highlight 3 */}
              <div className="flex flex-col gap-2 pl-2 border-l border-[#E5ECEE]">
                <TrendingUp className="h-5 w-5 text-[#086477]" />
                <span className="text-xs font-semibold text-[#172E35] leading-snug">
                  Global Perspective
                </span>
              </div>
            </div>

            {/* Find a Mentor Action Button */}
            <div className="mt-8">
              <button
                type="button"
                onClick={handleFindMentor}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#086477] hover:bg-[#06505F] text-white text-xs sm:text-sm font-semibold shadow-md transition-all duration-300 hover:shadow-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#086477] cursor-pointer"
              >
                <Search className="h-4 w-4" />
                <span>Find a Mentor</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 2. Right Mentor Carousel Deck (Flex-1, Centered Deck) */}
          <div className="w-full flex-1 min-w-0 relative flex flex-col items-center justify-center overflow-visible pt-2 lg:pt-0">
            {filteredMentors.length > 0 ? (
              <MentorCarousel
                mentors={filteredMentors}
                initialMentorId={initialMentorId}
                isSearchActive={isSearchFocused || searchQuery.trim().length > 0}
              />
            ) : (
              <div className="w-full py-16 px-6 rounded-3xl bg-white/10 backdrop-blur-xs border border-white/20 text-center text-white">
                <p className="text-base font-semibold">No mentors match your search criteria.</p>
                <p className="text-xs text-white/70 mt-1">
                  Try adjusting your keywords or selected category.
                </p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="mt-4 px-4 py-2 rounded-xl bg-white text-[#086477] text-xs font-semibold hover:bg-white/90 transition-all cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
