"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, Check, Clock, MapPin } from "lucide-react";
import type { Course, Batch, Mentor } from "@/lib/content";
import { formatPoishaToBDT } from "@/lib/money";
import { getMentorAvatar } from "@/lib/mentors";
import { Badge } from "@/components/ui/badge";
import { useMentorQuickView } from "./mentor-quick-view-context";

export interface CourseCardProps {
  course: Course;
  batch?: Batch;
  mentors?: Mentor[];
  priority?: boolean;
  onSelect?: (course: Course, batch?: Batch, mentors?: Mentor[]) => void;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatBatchStartDate(isoDate?: string): string | null {
  if (!isoDate) return null;
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;
  const year = match[1];
  const monthIdx = Number.parseInt(match[2], 10) - 1;
  const day = Number.parseInt(match[3], 10);
  const monthName = MONTH_NAMES[monthIdx];
  if (!monthName || Number.isNaN(day)) return isoDate;
  return `${monthName} ${day}, ${year}`;
}

function formatCompactVenue(rawVenue?: string): string {
  if (!rawVenue) return "Offline Campus";
  const parts = rawVenue
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 2) return parts.join(", ");
  return `${parts[0]}, ${parts[1]}`;
}

function formatMentorOrganizations(mentors: Mentor[]): string {
  const uniqueOrgs: string[] = [];
  for (const mentor of mentors) {
    const org = mentor.organization?.trim();
    if (org && !uniqueOrgs.includes(org)) {
      uniqueOrgs.push(org);
    }
  }
  if (uniqueOrgs.length === 0) return "Industry Practitioners";
  if (uniqueOrgs.length <= 2) return uniqueOrgs.join(" & ");
  return `${uniqueOrgs[0]}, ${uniqueOrgs[1]} & more`;
}

export function CourseCard({
  course,
  batch,
  mentors = [],
  priority: _priority = false,
  onSelect: _onSelect,
}: CourseCardProps) {
  const { openQuickView } = useMentorQuickView();

  const isCompleted = batch?.status === "completed" || course.id === "irgp";
  const isOpenForEnrollment = !isCompleted && batch?.status === "open_for_enrollment";

  // Financial calculation via integer poisha (Rule R5)
  const feePoisha = batch?.feePoisha;
  const discountFeePoisha = batch?.discountFeePoisha;
  const hasDiscount =
    feePoisha !== undefined && discountFeePoisha !== undefined && discountFeePoisha < feePoisha;
  const effectiveFeePoisha = discountFeePoisha ?? feePoisha;

  const remainingSeats = batch ? Math.max(0, batch.capacity - batch.enrolledCount) : null;
  const formattedStartDate = formatBatchStartDate(batch?.startDate);
  const compactVenue = formatCompactVenue(course.venue || batch?.venue);
  const scheduleText = batch?.scheduleDescription || `${course.modules.length} Modules`;
  const outcomes = course.learningOutcomes.slice(0, 3);
  const courseHref = `/courses/${course.id}`;

  const visibleMentors = mentors.length > 5 ? mentors.slice(0, 4) : mentors;
  const hiddenMentorCount = Math.max(0, mentors.length - visibleMentors.length);

  let statusText = "Upcoming";
  let statusVariant: "success" | "primary" | "default" = "primary";

  if (isCompleted) {
    statusVariant = "success";
    statusText = batch?.batchNumber ? `Completed · Cohort ${batch.batchNumber}` : "Completed";
  } else if (isOpenForEnrollment) {
    statusVariant = "primary";
    if (remainingSeats !== null && remainingSeats <= 0) {
      statusText = "Batch Full";
    } else {
      statusText = batch?.batchNumber ? `Open · Cohort ${batch.batchNumber}` : "Open";
    }
  } else if (batch?.batchNumber) {
    statusText = `Upcoming · Cohort ${batch.batchNumber}`;
  }

  return (
    <article
      data-testid="course-card"
      data-course-id={course.id}
      data-mentor-count={mentors.length}
      className={`group relative flex flex-col justify-between h-full w-full rounded-2xl bg-surface-card border shadow-xs transition-all duration-200 overflow-hidden ${
        isOpenForEnrollment
          ? "border-border-default hover:border-primary"
          : "border-border-subtle hover:border-border-strong"
      } hover:shadow-lg`}
    >
      {/* Top Editorial Accent Strip */}
      <div
        aria-hidden="true"
        className={`h-1.5 w-full shrink-0 transition-colors duration-200 ${
          isOpenForEnrollment ? "bg-primary" : "bg-border-default group-hover:bg-primary"
        }`}
      />

      {/* Primary Accessible Card Link */}
      <Link
        href={courseHref}
        className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 cursor-pointer"
        aria-label={`View ${course.title} details`}
      />

      {/* Card Body */}
      <div className="relative z-10 flex-1 flex flex-col p-6 pointer-events-none">
        {/* Top Row: Category & Status Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            {course.category}
          </span>
          <Badge
            variant={statusVariant}
            dot
            className="rounded-full normal-case tracking-normal px-2.5 py-1 text-xs"
          >
            {statusText}
          </Badge>
        </div>

        {/* Title & Subtitle */}
        <h3 className="mt-3.5 text-xl sm:text-[22px] font-bold tracking-tight leading-snug text-text-primary group-hover:text-primary transition-colors">
          {course.title}
        </h3>
        <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">
          {course.subtitle || course.summary}
        </p>

        {/* Structured Metadata Pills */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-text-primary">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-base border border-border-subtle">
            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
            <span>{scheduleText}</span>
          </span>

          {!isCompleted && formattedStartDate && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-base border border-border-subtle">
              <Clock className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
              <span>Starts {formattedStartDate}</span>
            </span>
          )}

          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-base border border-border-subtle max-w-full"
            title={course.venue || batch?.venue}
          >
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
            <span className="truncate">{compactVenue}</span>
          </span>
        </div>

        {/* Curriculum Outcomes */}
        {outcomes.length > 0 && (
          <ul className="mt-5 space-y-2 text-xs sm:text-sm text-text-secondary">
            {outcomes.map((outcome, idx) => (
              <li key={idx} className="flex items-start gap-2 leading-snug">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <span>{outcome}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Labeled Mentor Strip (Always visible, 44px mobile touch targets) */}
        {mentors.length > 0 && (
          <div className="mt-auto pt-6">
            <div className="pt-4 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text-primary">
                  {mentors.length} {mentors.length === 1 ? "Industry Mentor" : "Industry Mentors"}
                </p>
                <p className="text-xs text-text-secondary truncate max-w-[220px]">
                  {formatMentorOrganizations(mentors)}
                </p>
              </div>

              <div
                className="flex items-center -space-x-2"
                role="group"
                aria-label={`${course.title} mentors`}
              >
                {visibleMentors.map((mentor, idx) => {
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
                      className="relative z-20 w-11 h-11 rounded-full overflow-hidden bg-primary-50 ring-2 ring-surface-card shadow-xs cursor-pointer hover:scale-110 hover:z-30 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                      aria-label={`View mentor profile: ${mentor.name}, ${mentor.role}`}
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
                {hiddenMentorCount > 0 && (
                  <span
                    className="relative z-10 inline-flex items-center justify-center w-11 h-11 rounded-full bg-surface-muted text-text-primary text-xs font-semibold ring-2 ring-surface-card"
                    aria-label={`${hiddenMentorCount} more mentors`}
                  >
                    +{hiddenMentorCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="relative z-10 px-6 py-4 bg-surface-base border-t border-border-subtle flex items-center justify-between gap-4 pointer-events-none">
        <div>
          {isCompleted ? (
            <>
              <span className="block text-xs text-text-secondary">Cohort Milestone</span>
              <span className="text-base font-bold tracking-tight text-text-primary">
                {batch?.enrolledCount
                  ? `${batch.enrolledCount} Graduates · Cohort ${batch.batchNumber}`
                  : "Completed Cohort"}
              </span>
            </>
          ) : effectiveFeePoisha !== undefined ? (
            <>
              <span className="block text-xs text-text-secondary">Program Fee</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold tracking-tight text-text-primary">
                  {effectiveFeePoisha === 0
                    ? "Free"
                    : formatPoishaToBDT(effectiveFeePoisha).replace("৳", "BDT ")}
                </span>
                {hasDiscount && feePoisha !== undefined && (
                  <span className="text-xs line-through text-text-secondary">
                    {formatPoishaToBDT(feePoisha).replace("৳", "BDT ")}
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <span className="block text-xs text-text-secondary">Program Fee</span>
              <span className="text-base font-bold tracking-tight text-text-primary">
                Details Inside
              </span>
            </>
          )}
        </div>

        <span
          aria-hidden="true"
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors shrink-0 ${
            isCompleted
              ? "bg-surface-card border border-border-default text-text-primary group-hover:border-primary group-hover:text-primary"
              : "bg-primary text-text-inverse group-hover:bg-primary-600 shadow-xs"
          }`}
        >
          <span>{isCompleted ? "Program Story" : "Explore Program"}</span>
          <ArrowRight
            className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
            strokeWidth={2}
          />
        </span>
      </div>
    </article>
  );
}
