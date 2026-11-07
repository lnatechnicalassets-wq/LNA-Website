"use client";

import React from "react";
import { GraduationCap, Calendar, Check, ArrowRight } from "lucide-react";
import type { IrgpStory } from "@/lib/content";

export interface IrgpOverviewCardProps {
  story: IrgpStory;
  onExploreClick: () => void;
}

export function IrgpOverviewCard({ story, onExploreClick }: IrgpOverviewCardProps) {
  return (
    <div className="relative h-full flex flex-col justify-between overflow-hidden rounded-[28px] bg-gradient-to-br from-[#086477] via-[#075565] to-[#053d49] p-6 sm:p-8 text-white shadow-[0_20px_50px_-12px_rgba(8,100,119,0.35)] border border-teal-600/30">
      {/* Decorative organic teal wave at bottom-right */}
      <svg
        className="pointer-events-none absolute -bottom-10 -right-10 h-64 w-64 text-teal-400/20"
        viewBox="0 0 200 200"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M45.7,-78.9C58.9,-71.8,69.1,-59.5,76.5,-45.5C83.8,-31.6,88.4,-15.8,87.6,-0.5C86.7,14.8,80.5,29.7,72.1,43.2C63.6,56.7,53,68.9,39.8,75.9C26.5,82.9,10.7,84.7,-4.8,82.9C-20.2,81.1,-35.3,75.7,-48.8,67.3C-62.2,58.9,-74,47.4,-80.6,33.3C-87.1,19.1,-88.4,2.3,-84.9,-13.4C-81.5,-29,-73.2,-43.5,-61.6,-51.2C-50.1,-58.8,-35.3,-59.7,-21.8,-66.6C-8.3,-73.5,3.9,-86.4,18.8,-87.3C33.7,-88.1,47.2,-77,45.7,-78.9Z" />
      </svg>

      <div className="relative z-10">
        {/* Top Header: Icon + Badge + Completed status */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-teal-200 shadow-inner">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold tracking-wider text-teal-200 uppercase font-sans">
              {story.badge}
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-semibold border border-white/20 shadow-xs">
            <Check className="h-3.5 w-3.5 text-teal-200 stroke-[3]" />
            <span>{story.status}</span>
          </span>
        </div>

        {/* Main Title */}
        <h3 className="text-2xl sm:text-3xl lg:text-[30px] font-serif font-bold text-white leading-[1.18] tracking-tight mb-4">
          {story.title}
        </h3>

        {/* Metadata row: Cohort & Period */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-teal-100/90 font-medium mb-4">
          <Calendar className="h-4 w-4 text-teal-300 shrink-0" />
          <span>
            {story.cohort} <span className="opacity-50">|</span> {story.period}
          </span>
        </div>

        {/* Program Description */}
        <p className="text-sm sm:text-base text-teal-50/90 leading-relaxed font-sans mb-6">
          {story.description}
        </p>
      </div>

      {/* CTA Button */}
      <div className="relative z-10 pt-2">
        <button
          type="button"
          onClick={onExploreClick}
          aria-label={`Explore details of ${story.title}`}
          className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#086477] font-semibold text-sm sm:text-base hover:bg-teal-50 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#086477]"
        >
          <span>{story.ctaText}</span>
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
