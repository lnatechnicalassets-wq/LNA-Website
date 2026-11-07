"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, MapPin } from "lucide-react";
import type { Course, Batch, Mentor } from "@/lib/content";
import { formatPoishaToBDT } from "@/lib/money";
import { getMentorAvatar } from "@/lib/mentors";
import { CourseArtwork } from "./course-artwork";
import { useMentorQuickView } from "./mentor-quick-view-context";

export interface CourseCardProps {
  course: Course;
  batch?: Batch;
  mentors?: Mentor[];
  priority?: boolean;
}

export function CourseCard({ course, batch, mentors = [] }: CourseCardProps) {
  const { openQuickView } = useMentorQuickView();

  // Financial calculation via integer poisha (Rule R5)
  const feePoisha = batch?.feePoisha ?? 3000000;
  const discountFeePoisha = batch?.discountFeePoisha;
  const effectiveFeePoisha = discountFeePoisha ?? feePoisha;

  // Status computation
  const statusLabel =
    batch?.status === "in_progress"
      ? "Ongoing"
      : batch?.status === "open_for_enrollment"
        ? "Upcoming"
        : "Upcoming";

  // Duration computation
  const duration =
    batch?.scheduleDescription && batch.scheduleDescription.includes("(")
      ? batch.scheduleDescription.split("(")[1]?.replace(")", "")
      : `${course.modules.length * 2} weeks`;

  // Mentors array for this course (all equal priority, no featured mentor)
  const courseMentors = mentors.length > 0 ? mentors : [];
  const mentorCount = courseMentors.length;

  // Normal state: display up to 3 mentor portraits, plus +N badge for additional
  const normalVisibleMentors = courseMentors.slice(0, 3);
  const overflowCount = Math.max(0, mentorCount - 3);

  // Adaptive hover portrait sizes per Section 2 of spec:
  // 2 mentors: 72px (1 row)
  // 3 mentors: 66px (1 row)
  // 4 mentors: 66px (2 rows of 2 + 2)
  // 5 mentors: 62px (2 rows of 3 + 2)
  // 6 mentors: 62px (2 rows of 3 + 3)
  const getHoverMentorSizeClass = (count: number) => {
    if (count <= 2) return "w-[72px] h-[72px]";
    if (count === 3) return "w-[66px] h-[66px]";
    if (count === 4) return "w-[66px] h-[66px]";
    return "w-[62px] h-[62px]";
  };

  // Adaptive row partitioning: maximum of 3 mentor portraits per row
  // 2 mentors: 1 row of 2
  // 3 mentors: 1 row of 3
  // 4 mentors: 2 rows of 2 + 2
  // 5 mentors: 2 rows of 3 + 2
  // 6 mentors: 2 rows of 3 + 3
  const getMentorLayoutRows = (list: Mentor[]): Mentor[][] => {
    const count = list.length;
    if (count <= 3) {
      return [list];
    }
    if (count === 4) {
      return [list.slice(0, 2), list.slice(2, 4)];
    }
    if (count === 5) {
      return [list.slice(0, 3), list.slice(3, 5)];
    }
    // 6 or more mentors: capped at 6 in spotlight (3 + 3)
    return [list.slice(0, 3), list.slice(3, 6)];
  };

  const getRowGapClass = (totalCount: number, rowLength: number) => {
    if (rowLength === 1) return "";
    if (rowLength === 2) {
      if (totalCount <= 2) return "gap-6 sm:gap-7";
      if (totalCount === 4) return "gap-5 sm:gap-6";
      return "gap-4 sm:gap-5";
    }
    // rowLength === 3
    if (totalCount === 3) return "gap-3.5 sm:gap-4";
    return "gap-3 sm:gap-3.5";
  };

  const mentorRows = getMentorLayoutRows(courseMentors);

  return (
    <div
      tabIndex={0}
      data-testid="course-card"
      data-course-id={course.id}
      data-mentor-count={mentorCount}
      className="group relative flex flex-col justify-between h-[480px] w-full rounded-3xl p-6 overflow-hidden border border-[#E5ECEE] bg-white shadow-xs transition-all duration-500 ease-out hover:shadow-xl hover:border-[#0A7387] focus-within:shadow-xl focus-within:border-[#0A7387]"
    >
      {/* Coordinated Deep Teal background layer on hover (500ms transition) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-[#086477] via-[#06505F] to-[#04333D] opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 group-focus-within:opacity-100"
      />

      {/* Code-based SVG ascending staircase with architectural depth, shadows, and silhouette */}
      {/* Positioned full height along the right quadrant, masked seamlessly by card border radius */}
      <div
        aria-hidden="true"
        className="absolute right-0 inset-y-0 w-36 sm:w-44 pointer-events-none transition-transform duration-700 ease-out group-hover:scale-105 group-focus-within:scale-105"
      >
        <CourseArtwork className="w-full h-full" />
      </div>

      {/* Primary Accessible Click Target (Full Card Link to /courses/[slug] at z-10) */}
      <Link
        href={`/courses/${course.id}`}
        className="absolute inset-0 z-10 focus:outline-hidden"
        aria-label={`View details and curriculum for ${course.title}`}
      />

      {/* 1. Card Header: Category & Status Badge (Always visible, coordinated color shift) */}
      <div className="relative z-20 flex items-center justify-between gap-3 pointer-events-none">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#526E77] transition-colors duration-500 group-hover:text-[#C5E2E5] group-focus-within:text-[#C5E2E5]">
          {course.category}
        </span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#D1FAE5] text-[#065F46] transition-all duration-500 group-hover:bg-[#10B981]/25 group-hover:text-[#A7F3D0] group-hover:border group-hover:border-[#34D399]/40 group-focus-within:bg-[#10B981]/25 group-focus-within:text-[#A7F3D0]">
          {statusLabel}
        </span>
      </div>

      {/* 2. Card Title: Visible in both states, transitions from Dark Slate to Crisp White */}
      <div className="relative z-20 mt-3 pointer-events-none">
        <h3 className="text-xl sm:text-[22px] font-bold tracking-tight text-[#172E35] leading-snug transition-colors duration-500 group-hover:text-white group-focus-within:text-white max-w-[76%] sm:max-w-[78%]">
          {course.title}
        </h3>
      </div>

      {/* 3 & 4. Normal State Content Layer: Summary, Duration/Location, and Small Faculty Row */}
      {/* Fades out cleanly on hover (300ms) to yield the central canvas to Faculty Spotlight */}
      <div className="relative z-20 flex-1 flex flex-col justify-between transition-opacity duration-300 ease-out group-hover:opacity-0 group-hover:pointer-events-none group-focus-within:opacity-0 group-focus-within:pointer-events-none">
        {/* Concise Course Summary without truncation */}
        <p className="mt-1.5 text-xs sm:text-[13px] text-[#526E77] leading-relaxed max-w-[76%] sm:max-w-[78%] pointer-events-none">
          {course.summary}
        </p>

        {/* Duration & Delivery Mode: Stacked vertically with icons */}
        <div className="mt-4 sm:mt-5 space-y-2 text-xs text-[#526E77] pointer-events-none">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-[#086477]" />
            <span className="font-medium text-[#172E35]">{duration}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-[#086477]" />
            <span className="font-medium text-[#172E35]">Offline Only • Dhanmondi</span>
          </div>
        </div>

        {/* Normal State Mentor Portraits: Lifted higher to balance vertical space, each triggering quick-view popup */}
        <div
          className="flex items-center gap-2 mt-auto mb-16 sm:mb-20"
          aria-label={`Assigned faculty: ${courseMentors.map((m) => m.name).join(", ")}`}
        >
          {normalVisibleMentors.map((mentor, idx) => {
            const avatarSrc = getMentorAvatar(mentor, idx);
            return (
              <button
                key={mentor.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openQuickView(mentor);
                }}
                className="relative z-30 block rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#086477] focus-visible:ring-offset-2 transition-transform duration-200 hover:scale-105 cursor-pointer"
                aria-label={`View ${mentor.name}'s details`}
                title={`${mentor.name} — ${mentor.role}`}
              >
                <div className="relative w-10 h-10 sm:w-[42px] sm:h-[42px] rounded-full overflow-hidden bg-[#E8F3F5] ring-2 ring-white shadow-xs shrink-0">
                  <Image
                    src={avatarSrc}
                    alt={mentor.name}
                    fill
                    sizes="42px"
                    className="object-cover object-top"
                  />
                </div>
              </button>
            );
          })}

          {/* Overflow Badge "+N": Clean circular badge with matching diameter */}
          {overflowCount > 0 && (
            <div
              className="relative z-20 flex items-center justify-center w-10 h-10 sm:w-[42px] sm:h-[42px] rounded-full bg-white text-[#172E35] font-bold text-xs ring-2 ring-white border border-[#D5E2E5] shadow-xs shrink-0 pointer-events-none"
              aria-label={`${overflowCount} additional mentors`}
            >
              +{overflowCount}
            </div>
          )}
        </div>
      </div>

      {/* 5. Hover State Content Layer: Faculty Spotlight (Adaptive Grid Architecture, max 3 per row) */}
      {/* Centered dedicated faculty showcase that fades in smoothly (500ms transition) */}
      <div
        aria-hidden={false}
        className="absolute inset-x-6 top-[120px] bottom-[68px] z-20 flex flex-col items-center justify-center pointer-events-none opacity-0 transition-all duration-500 ease-out translate-y-2 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0"
      >
        {/* Discreet Heading */}
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#C5E2E5] mb-3.5 sm:mb-4 text-center select-none">
          Meet Your Mentors
        </span>

        {/* Mentors Showcase: Adaptive rows of max 3 portraits with independent horizontal centering */}
        <div className="flex flex-col items-center gap-2.5 sm:gap-3 w-full">
          {mentorRows.map((row, rowIdx) => (
            <div
              key={rowIdx}
              className={`flex items-center justify-center ${getRowGapClass(mentorCount, row.length)} w-full`}
            >
              {row.map((mentor) => {
                const originalIdx = courseMentors.indexOf(mentor);
                const avatarSrc = getMentorAvatar(mentor, originalIdx >= 0 ? originalIdx : 0);
                const sizeClass = getHoverMentorSizeClass(mentorCount);
                return (
                  <button
                    key={mentor.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openQuickView(mentor);
                    }}
                    className="relative z-30 block rounded-full focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#086477] transition-all duration-300 hover:scale-108 shrink-0 cursor-pointer"
                    aria-label={`View ${mentor.name}'s details`}
                    title={`${mentor.name} — ${mentor.role}`}
                  >
                    <div
                      className={`relative ${sizeClass} rounded-full overflow-hidden bg-white/20 ring-2 ring-white/95 shadow-md shrink-0`}
                    >
                      <Image
                        src={avatarSrc}
                        alt={mentor.name}
                        fill
                        sizes="72px"
                        className="object-cover object-top"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 6. Card Footer: Clean tuition fee and circular action button (Always pinned, visible, and padded) */}
      <div className="relative z-20 flex items-center justify-between mt-auto pt-2 pointer-events-none">
        <div className="flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#172E35] transition-colors duration-500 group-hover:text-white group-focus-within:text-white">
            {formatPoishaToBDT(effectiveFeePoisha).replace("৳", "BDT ")}
          </span>
          {discountFeePoisha && (
            <span className="text-xs text-[#526E77] line-through transition-colors duration-500 group-hover:text-white/60 group-focus-within:text-white/60">
              {formatPoishaToBDT(feePoisha).replace("৳", "BDT ")}
            </span>
          )}
        </div>

        {/* Circular Action Button */}
        <div
          aria-hidden="true"
          className="relative z-20 flex items-center justify-center w-10 h-10 rounded-full bg-white border border-[#D5E2E5] text-[#172E35] shadow-xs transition-all duration-500 group-hover:bg-white group-hover:text-[#086477] group-hover:border-white group-hover:shadow-md group-focus-within:bg-white group-focus-within:text-[#086477]"
        >
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-focus-within:translate-x-1" />
        </div>
      </div>
    </div>
  );
}
