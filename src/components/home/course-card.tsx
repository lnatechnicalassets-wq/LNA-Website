"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Layers,
  Users,
} from "lucide-react";
import type { Course, Batch, Mentor } from "@/lib/content";
import { formatPoishaToBDT } from "@/lib/money";
import { getMentorAvatar } from "@/lib/mentors";
import { useMentorQuickView } from "./mentor-quick-view-context";

export interface CourseCardProps {
  course: Course;
  batch?: Batch;
  mentors?: Mentor[];
  priority?: boolean;
  onSelect?: (course: Course, batch?: Batch, mentors?: Mentor[]) => void;
}

export function CourseCard({
  course,
  batch,
  mentors = [],
  priority = false,
  onSelect,
}: CourseCardProps) {
  const { openQuickView } = useMentorQuickView();
  const [isHovered, setIsHovered] = useState(false);

  const isIrgp = course.id === "irgp";
  const isCompleted = batch?.status === "completed" || isIrgp;
  const isMto = course.id === "mto-readiness" || course.id === "mto";

  // Financial calculation via integer poisha (Rule R5)
  const feePoisha = batch?.feePoisha ?? 3000000;
  const discountFeePoisha = batch?.discountFeePoisha;
  const effectiveFeePoisha = discountFeePoisha ?? feePoisha;

  const statusLabel = isCompleted ? "Completed" : "Upcoming";
  const courseHref = `/courses/${course.id}`;

  // Resolve metadata display matching reference image
  let metaItem1 = {
    icon: Calendar,
    text: batch?.scheduleDescription?.includes("Weeks")
      ? "8 Weeks"
      : `${course.modules.length * 2} Weeks`,
  };
  let metaItem2 = {
    icon: MapPin,
    text: "Offline · Dhanmondi",
  };

  if (course.id === "data-analytics" || course.id === "executive-leadership") {
    metaItem1 = { icon: Calendar, text: "8 Weeks" };
    metaItem2 = { icon: MapPin, text: "Offline · Dhanmondi" };
  } else if (isMto) {
    metaItem1 = { icon: Calendar, text: "16 Sessions" };
    metaItem2 = { icon: Clock, text: "1.5h each" };
  } else if (isIrgp) {
    metaItem1 = { icon: Layers, text: "10 focus areas" };
    metaItem2 = { icon: Users, text: "8 industry mentors" };
  }

  const Icon1 = metaItem1.icon;
  const Icon2 = metaItem2.icon;

  const mentorCount = mentors.length;

  return (
    <div
      data-testid="course-card"
      data-course-id={course.id}
      data-mentor-count={mentorCount}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      className={`group relative flex flex-col justify-between h-[465px] w-full max-w-[330px] rounded-2xl p-6 overflow-hidden transition-all duration-200 ease-out select-none mx-auto ${
        isHovered
          ? "bg-[#086477] text-white shadow-xl border border-[#086477]"
          : "bg-white text-[#172E35] border border-[#E2ECEE] shadow-xs hover:border-[#086477]/40 hover:shadow-md"
      }`}
    >
      {/* Primary Accessible Link stretching across entire card */}
      <Link
        href={courseHref}
        className="absolute inset-0 z-0 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#086477] focus-visible:ring-offset-2 rounded-2xl cursor-pointer"
        aria-label={`View ${course.title} details`}
      />

      {/* Top Row: Category & Status Badge */}
      <div className="relative z-10 flex items-center justify-between gap-2 shrink-0 pointer-events-none">
        <span
          className={`text-[11px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0 transition-colors duration-200 ${
            isHovered ? "text-[#C5E2E5]" : "text-[#086477]"
          }`}
        >
          {course.category}
        </span>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all duration-200 ${
            isHovered
              ? "border border-white/60 text-white bg-transparent"
              : isCompleted
                ? "bg-[#D1FAE5] text-[#065F46]"
                : "bg-[#E8F3F5] text-[#086477]"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Course Title */}
      <div className="relative z-10 mt-3 shrink-0 pointer-events-none">
        <h3
          className={`text-[21px] sm:text-[22px] font-bold tracking-tight leading-[1.25] min-h-[56px] transition-colors duration-200 ${
            isHovered ? "text-white" : "text-[#172E35]"
          }`}
        >
          {course.title}
        </h3>
      </div>

      {/* Middle Section: Swaps between Normal View and "MEET YOUR MENTORS" on Hover */}
      <div className="relative z-10 flex-1 flex flex-col justify-between my-2 overflow-hidden pointer-events-none">
        {/* Normal State View */}
        <div
          className={`flex-1 flex flex-col justify-between transition-all duration-200 ${
            isHovered ? "opacity-0 pointer-events-none absolute inset-0" : "opacity-100 relative"
          }`}
        >
          {/* Subtitle / Summary */}
          <p className="text-[14px] text-[#526E77] leading-snug line-clamp-2 min-h-[38px]">
            {course.subtitle || course.summary}
          </p>

          {/* Metadata Row */}
          <div className="flex items-center gap-4 text-[13px] text-[#526E77] my-2">
            <div className="flex items-center gap-1.5">
              <Icon1 className="w-4 h-4 text-[#086477] shrink-0" strokeWidth={1.75} />
              <span className="font-medium text-[#172E35]">{metaItem1.text}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Icon2 className="w-4 h-4 text-[#086477] shrink-0" strokeWidth={1.75} />
              <span className="font-medium text-[#172E35]">{metaItem2.text}</span>
            </div>
          </div>

          {/* Normal State Mentors Row */}
          <div className="mt-auto pt-2 pointer-events-auto">
            {isIrgp ? (
              /* IRGP 2x4 Grid */
              <div
                className="grid grid-cols-4 gap-2 w-max"
                aria-label="IRGP Faculty"
              >
                {mentors.slice(0, 8).map((mentor, idx) => {
                  const avatar = getMentorAvatar(mentor, idx);
                  return (
                    <button
                      key={mentor.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openQuickView(mentor);
                      }}
                      className="relative z-20 w-8 h-8 rounded-full overflow-hidden bg-[#E8F3F5] ring-2 ring-white shadow-xs cursor-pointer hover:scale-110 transition-transform"
                      title={`${mentor.name} — ${mentor.role}`}
                    >
                      <Image
                        src={avatar}
                        alt={mentor.name}
                        fill
                        sizes="32px"
                        className="object-cover object-top"
                      />
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Regular Mentors Horizontal Row */
              <div
                className="flex items-center gap-2"
                aria-label={`Assigned faculty: ${mentors.map((m) => m.name).join(", ")}`}
              >
                {mentors.map((mentor, idx) => {
                  const avatar = getMentorAvatar(mentor, idx);
                  const sizeClass =
                    mentorCount <= 2
                      ? "w-11 h-11"
                      : mentorCount === 3
                        ? "w-10 h-10"
                        : "w-9 h-9";
                  return (
                    <button
                      key={mentor.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openQuickView(mentor);
                      }}
                      className={`relative z-20 ${sizeClass} rounded-full overflow-hidden bg-[#E8F3F5] ring-2 ring-white shadow-xs cursor-pointer hover:scale-110 transition-transform`}
                      title={`${mentor.name} — ${mentor.role}`}
                    >
                      <Image
                        src={avatar}
                        alt={mentor.name}
                        fill
                        sizes="44px"
                        className="object-cover object-top"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Hover State: MEET YOUR MENTORS Showcase */}
        <div
          className={`flex-1 flex flex-col items-center justify-center transition-all duration-200 pointer-events-auto ${
            isHovered ? "opacity-100 relative" : "opacity-0 pointer-events-none absolute inset-0"
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#C5E2E5] text-center mb-3">
            MEET YOUR MENTORS
          </span>

          {isIrgp ? (
            /* IRGP 2x4 Grid in Hover */
            <div className="grid grid-cols-4 gap-2.5">
              {mentors.slice(0, 8).map((mentor, idx) => {
                const avatar = getMentorAvatar(mentor, idx);
                return (
                  <button
                    key={mentor.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openQuickView(mentor);
                    }}
                    className="relative z-20 w-9 h-9 rounded-full overflow-hidden bg-white/20 ring-2 ring-white/95 shadow-md cursor-pointer hover:scale-115 transition-transform"
                    title={`${mentor.name} — ${mentor.role}`}
                  >
                    <Image
                      src={avatar}
                      alt={mentor.name}
                      fill
                      sizes="36px"
                      className="object-cover object-top"
                    />
                  </button>
                );
              })}
            </div>
          ) : (
            /* Responsive row for 2, 3, 5 mentors */
            <div
              className={`flex items-center justify-center ${
                mentorCount <= 3 ? "gap-3 sm:gap-4" : "gap-2"
              }`}
            >
              {mentors.map((mentor, idx) => {
                const avatar = getMentorAvatar(mentor, idx);
                const sizeClass =
                  mentorCount <= 2
                    ? "w-16 h-16"
                    : mentorCount === 3
                      ? "w-14 h-14"
                      : "w-11 h-11";
                return (
                  <button
                    key={mentor.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openQuickView(mentor);
                    }}
                    className={`relative z-20 ${sizeClass} rounded-full overflow-hidden bg-white/20 ring-2 ring-white/95 shadow-md cursor-pointer hover:scale-110 transition-transform`}
                    title={`${mentor.name} — ${mentor.role}`}
                  >
                    <Image
                      src={avatar}
                      alt={mentor.name}
                      fill
                      sizes="64px"
                      className="object-cover object-top"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fine Horizontal Divider */}
      <div
        className={`relative z-10 w-full h-px my-2 transition-colors duration-200 pointer-events-none ${
          isHovered ? "bg-white/20" : "bg-[#E5ECEE]"
        }`}
      />

      {/* Bottom Bar: Price/Story & Circular Arrow Button */}
      <div className="relative z-10 flex items-center justify-between pt-1 shrink-0 pointer-events-none">
        <div>
          {isCompleted ? (
            <span
              className={`text-lg font-bold tracking-tight transition-colors duration-200 ${
                isHovered ? "text-white" : "text-[#172E35]"
              }`}
            >
              Program Story
            </span>
          ) : (
            <div className="flex items-baseline gap-2">
              <span
                className={`text-xl font-bold tracking-tight transition-colors duration-200 ${
                  isHovered ? "text-white" : "text-[#172E35]"
                }`}
              >
                {formatPoishaToBDT(effectiveFeePoisha).replace("৳", "BDT ")}
              </span>
              {discountFeePoisha && (
                <span
                  className={`text-xs line-through transition-colors duration-200 ${
                    isHovered ? "text-white/60" : "text-[#526E77]"
                  }`}
                >
                  {formatPoishaToBDT(feePoisha).replace("৳", "BDT ")}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Circular Arrow Button */}
        <div
          aria-hidden="true"
          className={`flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-200 ${
            isHovered
              ? "bg-white text-[#086477] border-white shadow-sm"
              : "border-[#D5E2E5] text-[#172E35] group-hover:border-[#086477] group-hover:text-[#086477]"
          }`}
        >
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
