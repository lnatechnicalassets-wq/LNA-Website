"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Layers,
  Users,
  Award,
  CheckCircle2,
  BookOpen,
  Settings,
  RefreshCw,
  Plus,
  Minus,
  ArrowRight,
  Building,
  AlertCircle,
} from "lucide-react";
import {
  canBatchAcceptApplications,
  getBatchPayablePoisha,
  getBatchRemainingSeats,
  hasBatchDiscount,
  type Batch,
} from "@/lib/content/batches";
import type { Course, Mentor } from "@/lib/content";
import { formatPoishaToBDT } from "@/lib/money";
import { getMentorAvatar, getMentorCompanyLogo } from "@/lib/mentors";
import { OfficialCompanyLogo } from "@/components/home/company-logo";

export interface CourseDetailViewProps {
  course: Course;
  batch?: Batch;
  mentors: Mentor[];
  submissionEnabled?: boolean;
}

type TabType = "overview" | "curriculum" | "mentors";

const COURSE_TABS: Array<{ id: TabType; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "curriculum", label: "Curriculum" },
  { id: "mentors", label: "Mentors" },
];

export function CourseDetailView({
  course,
  batch,
  mentors,
  submissionEnabled = false,
}: CourseDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    "0": true, // first module open by default
  });
  const tabListRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<TabType, HTMLButtonElement | null>>({
    overview: null,
    curriculum: null,
    mentors: null,
  });

  const isMto = course.id === "mto-readiness" || course.id === "mto";
  const isIrgp = course.id === "irgp";
  const isCompleted = isIrgp || batch?.status === "completed";

  // Financial calculations via integer poisha aligned with server start_enrollment() (Rule R5)
  const formatBdt = (poisha: number) =>
    poisha === 0 ? "Free" : formatPoishaToBDT(poisha).replace("৳", "BDT ");

  const hasBatchFee = batch !== undefined;
  const baseFeePoisha = batch?.feePoisha ?? 0;
  const payablePoisha = batch ? getBatchPayablePoisha(batch) : 0;
  const hasDiscount = batch ? hasBatchDiscount(batch) : false;
  const formattedBaseFee = formatBdt(baseFeePoisha);
  const formattedPayableFee = hasBatchFee ? formatBdt(payablePoisha) : "Fee announced soon";

  // Batch & checkout availability gates
  const remainingSeats = batch ? getBatchRemainingSeats(batch) : 0;
  const isBatchOpen = canBatchAcceptApplications(batch);
  const isBatchFull = Boolean(
    batch && batch.status === "open_for_enrollment" && remainingSeats <= 0
  );
  const canEnroll = Boolean(!isCompleted && submissionEnabled && isBatchOpen);

  const scheduleSummary =
    batch?.scheduleDescription || (isMto ? "16 sessions · 1.5h each" : "10 focus areas");
  const mentorCountLabel =
    mentors.length > 0
      ? `${mentors.length} industry mentor${mentors.length === 1 ? "" : "s"}`
      : isMto
        ? "5 industry mentors"
        : "8 industry mentors";

  // Banner and captions
  const bannerSrc = isMto
    ? "/images/course-classroom-banner.jpg"
    : "/images/irgp-gallery-teamwork.jpg";
  const bannerAlt = isMto
    ? "Interactive classroom session at Lead Nation Academy"
    : "IRGP cohort teamwork and practical discussion";
  const bannerCaption = isMto
    ? "Illustrative learning environment"
    : "IRGP program cohort in session";

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const switchTabAndFocus = (nextTab: TabType, shouldScroll = false) => {
    setActiveTab(nextTab);
    if (shouldScroll && tabListRef.current) {
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      tabListRef.current.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }
    requestAnimationFrame(() => {
      tabRefs.current[nextTab]?.focus();
    });
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentIdx: number) => {
    let nextIdx: number | null = null;
    if (event.key === "ArrowRight") {
      nextIdx = (currentIdx + 1) % COURSE_TABS.length;
    } else if (event.key === "ArrowLeft") {
      nextIdx = (currentIdx - 1 + COURSE_TABS.length) % COURSE_TABS.length;
    } else if (event.key === "Home") {
      nextIdx = 0;
    } else if (event.key === "End") {
      nextIdx = COURSE_TABS.length - 1;
    }

    if (nextIdx !== null) {
      event.preventDefault();
      const targetTab = COURSE_TABS[nextIdx].id;
      setActiveTab(targetTab);
      tabRefs.current[targetTab]?.focus();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const availabilityBadge = (() => {
    if (isCompleted) {
      return {
        label: "Completed Program · IRGP",
        className: "bg-[#E8F3F5] text-[#086477] border-[#086477]/25",
      };
    }
    if (isBatchFull) {
      return {
        label: "Batch Full",
        className: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
      };
    }
    if (!isBatchOpen) {
      return {
        label: batch?.status === "upcoming" ? "Upcoming Cohort" : "Enrollment Closed",
        className: "bg-[#F0F5F6] text-[#3D5A62] border-[#C5DDE0]",
      };
    }
    if (!submissionEnabled) {
      return {
        label: "Online enrollment is coming soon",
        className: "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]",
      };
    }
    return {
      label: "Open for Enrollment",
      className: "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]",
    };
  })();

  const renderUnavailableEnrollmentNotice = (variant: "mobile" | "desktop") => {
    const title = isBatchFull
      ? "Batch Full"
      : !isBatchOpen
        ? batch?.status === "upcoming"
          ? "Upcoming Cohort"
          : "Enrollment Closed"
        : "Online enrollment is coming soon";

    const description = isBatchFull
      ? "All seats in this cohort are currently confirmed or held. Check back for upcoming cohorts."
      : !isBatchOpen
        ? "This cohort is not currently accepting online applications."
        : "Hosted bKash Checkout activates once production gateway verification completes.";

    return (
      <div
        role="status"
        data-testid={variant === "desktop" ? "course-enrollment-unavailable" : undefined}
        className="rounded-xl bg-[#F6FAFA] border border-[#C5DDE0] p-4 space-y-2.5"
      >
        <div className="flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-[#92400E] shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-xs sm:text-sm font-bold text-[#172E35]">{title}</p>
            <p className="text-xs text-[#526E77] mt-0.5 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {!submissionEnabled && (
            <Link
              href="/status"
              className="inline-flex items-center min-h-[44px] px-1 text-xs font-semibold text-[#086477] underline underline-offset-2 hover:text-[#064654] rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477]"
            >
              Check application status
            </Link>
          )}
          <Link
            href="/#courses"
            className="inline-flex items-center min-h-[44px] px-1 text-xs font-semibold text-[#086477] underline underline-offset-2 hover:text-[#064654] rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477]"
          >
            Explore programs
          </Link>
        </div>
      </div>
    );
  };

  const renderSummaryCard = (variant: "mobile" | "desktop") => {
    const isDesktop = variant === "desktop";

    return (
      <div className="bg-white rounded-2xl border border-[#E5ECEE] p-6 sm:p-7 shadow-xs">
        {isCompleted ? (
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#526E77] block">
              PROGRAM STATUS
            </span>
            <p className="text-2xl font-bold font-serif text-[#086477] my-2">Completed Cohort</p>

            <div className="space-y-2.5 text-xs sm:text-[13px] text-[#526E77] my-4">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#086477] shrink-0" aria-hidden="true" />
                <span>10 focus areas</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#086477] shrink-0" aria-hidden="true" />
                <span>{mentorCountLabel}</span>
              </div>
              {isDesktop && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#086477] shrink-0" aria-hidden="true" />
                  <span>100% completed cohort</span>
                </div>
              )}
            </div>

            <Link
              href="/#reviews"
              className="w-full min-h-[44px] text-center py-3.5 px-4 rounded-xl bg-[#086477] hover:bg-[#064654] text-white font-bold text-xs shadow-xs inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477]"
            >
              <span>Explore Learner Reviews</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>

            {isDesktop && (
              <>
                <div className="w-full h-px bg-[#E5ECEE] my-6" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#172E35] mb-3">
                  Program at a glance
                </h3>
                <div className="space-y-3 text-xs text-[#526E77]">
                  <div>
                    <span className="font-semibold text-[#172E35] block">Format</span>
                    <span>Comprehensive Graduate Readiness</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#172E35] block">Focus</span>
                    <span>Cross-sector functional literacy</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#172E35] block">Faculty</span>
                    <span>8 senior corporate directors</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#172E35] block">Outcome</span>
                    <span>Practical readiness for corporate roles</span>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#526E77]">
                {hasDiscount ? "PROGRAM FEE · DISCOUNTED" : "PROGRAM FEE"}
              </span>
              {canEnroll && batch?.batchNumber && (
                <span className="text-[11px] font-semibold text-[#166534] bg-[#DCFCE7] border border-[#BBF7D0] px-2 py-0.5 rounded-full">
                  Cohort {batch.batchNumber}
                </span>
              )}
            </div>

            <div className="my-2 flex flex-wrap items-baseline gap-2.5">
              {hasDiscount && (
                <span className="text-base sm:text-lg font-semibold line-through text-[#526E77]">
                  <span className="sr-only">Original fee: </span>
                  {formattedBaseFee}
                </span>
              )}
              <p
                data-testid={isDesktop ? "course-payable-fee" : undefined}
                className="text-3xl font-extrabold text-[#172E35]"
              >
                {formattedPayableFee}
              </p>
            </div>

            {hasDiscount && (
              <p className="text-xs font-semibold text-[#086477] mb-3">
                Cohort discount applied ({batch?.name})
              </p>
            )}

            <div className="space-y-2.5 text-xs sm:text-[13px] text-[#526E77] my-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#086477] shrink-0" aria-hidden="true" />
                <span>{scheduleSummary}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-[#086477] shrink-0" aria-hidden="true" />
                <span>{batch?.venue || course.venue}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#086477] shrink-0" aria-hidden="true" />
                <span>{mentorCountLabel}</span>
              </div>
            </div>

            {canEnroll ? (
              <Link
                href={`/enroll?course=${course.id}&batch=${batch?.id || ""}`}
                className="w-full min-h-[44px] py-3.5 px-4 rounded-xl bg-[#086477] hover:bg-[#064654] text-white font-bold text-xs sm:text-sm shadow-xs inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477]"
              >
                <span>Enroll in {course.title}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              renderUnavailableEnrollmentNotice(variant)
            )}

            {isDesktop && (
              <>
                <div className="w-full h-px bg-[#E5ECEE] my-6" />

                <h3 className="text-xs font-bold uppercase tracking-wider text-[#172E35] mb-3">
                  Program at a glance
                </h3>
                <div className="space-y-3 text-xs text-[#526E77]">
                  <div className="flex items-start gap-2">
                    <Calendar
                      className="h-4 w-4 text-[#086477] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <div>
                      <span className="font-semibold text-[#172E35] block">Format</span>
                      <span>Live, cohort-based offline learning</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Building
                      className="h-4 w-4 text-[#086477] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <div>
                      <span className="font-semibold text-[#172E35] block">Focus</span>
                      <span>{course.category}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Layers className="h-4 w-4 text-[#086477] shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <span className="font-semibold text-[#172E35] block">Curriculum</span>
                      <span>{course.learningOutcomes.length} practical capability areas</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Award className="h-4 w-4 text-[#086477] shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <span className="font-semibold text-[#172E35] block">Cohort Status</span>
                      <span>{availabilityBadge.label}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full bg-[#F6FAFA] text-[#172E35] min-h-screen py-8 sm:py-10 lg:py-12">
      <div className="max-w-7xl xl:max-w-340 mx-auto px-4 sm:px-6 lg:px-8">
        {/* ============================================================ */}
        {/* 1. COMPACT COURSE INTRODUCTION (Title, Subtitle, CTA)         */}
        {/* ============================================================ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 pb-2">
          <div className="flex flex-col items-start">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#086477] mb-1">
              {course.category}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-serif font-bold tracking-tight text-[#172E35] leading-tight">
              {course.title}
            </h1>
            <p className="text-sm sm:text-base text-[#526E77] mt-1 font-sans">
              {course.subtitle || course.summary}
            </p>
          </div>

          <div className="shrink-0">
            {canEnroll ? (
              <Link
                href={`/enroll?course=${course.id}&batch=${batch?.id || ""}`}
                className="min-h-[44px] rounded-full px-6 py-2.5 bg-[#086477] hover:bg-[#064654] text-white font-semibold text-xs sm:text-sm shadow-sm transition-colors duration-200 inline-flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477]"
              >
                <span>Enroll in {course.title}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <span
                data-testid="course-enrollment-status-pill"
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase border shadow-2xs ${availabilityBadge.className}`}
              >
                <span>{availabilityBadge.label}</span>
              </span>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. WIDE CLASSROOM OR PROGRAM BANNER                          */}
        {/* ============================================================ */}
        <div className="mt-4">
          <div className="relative w-full h-55 sm:h-75 lg:h-85 rounded-2xl overflow-hidden shadow-xs border border-[#E5ECEE] bg-[#E8F3F5]">
            <Image
              src={bannerSrc}
              alt={bannerAlt}
              fill
              priority
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 95vw, 1360px"
              className="object-cover object-center"
            />
          </div>
          <p className="text-[11px] sm:text-xs text-[#526E77] italic mt-1.5 pl-1">
            {bannerCaption}
          </p>
        </div>

        {/* ============================================================ */}
        {/* 3. COMPACT METADATA ROW                                      */}
        {/* ============================================================ */}
        <div className="my-6 bg-white rounded-xl border border-[#E5ECEE] shadow-2xs p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0 lg:divide-x divide-[#E5ECEE]">
            {isMto ? (
              <>
                <div className="flex items-center gap-3 lg:pr-6">
                  <Calendar className="h-5 w-5 text-[#086477] shrink-0" aria-hidden="true" />
                  <span className="text-xs sm:text-sm font-bold text-[#172E35]">
                    {batch?.scheduleDescription || "16 sessions"}
                  </span>
                </div>
                <div className="flex items-center gap-3 lg:px-6">
                  <Clock className="h-5 w-5 text-[#086477] shrink-0" aria-hidden="true" />
                  <span className="text-xs sm:text-sm font-bold text-[#172E35]">
                    Offline cohort · 1.5h each
                  </span>
                </div>
                <div className="flex items-center gap-3 lg:px-6">
                  <Layers className="h-5 w-5 text-[#086477] shrink-0" aria-hidden="true" />
                  <span className="text-xs sm:text-sm font-bold text-[#172E35]">
                    {course.learningOutcomes.length} core skills
                  </span>
                </div>
                <div className="flex items-center gap-3 lg:pl-6">
                  <Users className="h-5 w-5 text-[#086477] shrink-0" aria-hidden="true" />
                  <span className="text-xs sm:text-sm font-bold text-[#172E35]">
                    {mentorCountLabel}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 lg:pr-6">
                  <Layers className="h-5 w-5 text-[#086477] shrink-0" aria-hidden="true" />
                  <span className="text-xs sm:text-sm font-bold text-[#172E35]">
                    10 focus areas
                  </span>
                </div>
                <div className="flex items-center gap-3 lg:px-6">
                  <Users className="h-5 w-5 text-[#086477] shrink-0" aria-hidden="true" />
                  <span className="text-xs sm:text-sm font-bold text-[#172E35]">
                    {mentorCountLabel}
                  </span>
                </div>
                <div className="flex items-center gap-3 lg:px-6">
                  <CheckCircle2 className="h-5 w-5 text-[#086477] shrink-0" aria-hidden="true" />
                  <span className="text-xs sm:text-sm font-bold text-[#172E35]">
                    100% completed cohort
                  </span>
                </div>
                <div className="flex items-center gap-3 lg:pl-6">
                  <Award className="h-5 w-5 text-[#086477] shrink-0" aria-hidden="true" />
                  <span className="text-xs sm:text-sm font-bold text-[#172E35]">
                    Placement support
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* MOBILE / TABLET ONLY: Course Summary Card Placed Before Tabs */}
        {/* ============================================================ */}
        <div className="block lg:hidden mb-8">{renderSummaryCard("mobile")}</div>

        {/* ============================================================ */}
        {/* 4. TWO-COLUMN LAYOUT (Left Tabs 70% | Right Summary 30%)     */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* ========================================================== */}
          {/* LEFT COLUMN: TABS (Overview, Curriculum, Mentors)          */}
          {/* ========================================================== */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E5ECEE] p-6 sm:p-8 shadow-xs min-w-0">
            {/* Accessible Tab List */}
            <div
              ref={tabListRef}
              role="tablist"
              aria-label="Course details navigation"
              className="flex items-center gap-2 overflow-x-auto border-b border-[#E5ECEE] pb-3 pt-1 px-1 mb-6 scroll-mt-24"
            >
              {COURSE_TABS.map((tab, idx) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      tabRefs.current[tab.id] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`tab-${tab.id}`}
                    aria-selected={isSelected}
                    aria-controls={`panel-${tab.id}`}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={(e) => handleTabKeyDown(e, idx)}
                    className={`min-h-[44px] px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477] ${
                      isSelected
                        ? "bg-[#D9EDF0] text-[#086477] font-bold border border-[#A4D1D6] shadow-2xs"
                        : "text-[#526E77] hover:text-[#172E35] hover:bg-[#F6FAFA]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* TAB PANEL 1: OVERVIEW */}
            {activeTab === "overview" && (
              <div
                role="tabpanel"
                id="panel-overview"
                aria-labelledby="tab-overview"
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl sm:text-[26px] font-serif font-bold text-[#172E35] tracking-tight">
                    {isMto
                      ? "Learning built around practice."
                      : "Comprehensive industry readiness."}
                  </h2>
                  <p className="mt-3 text-xs sm:text-sm text-[#526E77] leading-relaxed">
                    {course.description}
                  </p>
                </div>

                {/* Two Core Pillars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-[#F6FAFA] border border-[#E5ECEE]">
                    <h3 className="font-bold text-sm text-[#172E35]">
                      {isMto ? "Career Readiness" : "Functional Literacy"}
                    </h3>
                    <p className="text-xs text-[#526E77] mt-1.5 leading-relaxed">
                      {isMto
                        ? "Build the professional, analytical, and communication capabilities expected in MTO roles."
                        : "Master core cross-sector industry operations, governance, and business models."}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F6FAFA] border border-[#E5ECEE]">
                    <h3 className="font-bold text-sm text-[#172E35]">
                      {isMto ? "Leadership Growth" : "Executive Mentorship"}
                    </h3>
                    <p className="text-xs text-[#526E77] mt-1.5 leading-relaxed">
                      {isMto
                        ? "Develop problem-solving, collaboration, and people leadership for an early career in management."
                        : "Engage in practical projects supervised directly by senior corporate directors and executives."}
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-[#E5ECEE] my-6" />

                {/* What you will work on */}
                <div>
                  <h3 className="text-lg sm:text-xl font-serif font-bold text-[#172E35] mb-4">
                    What you will work on
                  </h3>
                  <div className="space-y-3">
                    {course.learningOutcomes.map((outcome, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-xl bg-[#F6FAFA] border border-[#E5ECEE]"
                      >
                        <div className="w-6 h-6 rounded-full bg-[#E0F3F5] text-[#086477] font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>
                        <span className="text-xs sm:text-[13px] font-semibold text-[#172E35] flex-1">
                          {outcome}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="w-full h-px bg-[#E5ECEE] my-6" />

                {/* Who this program is for */}
                <div>
                  <h3 className="text-lg sm:text-xl font-serif font-bold text-[#172E35] mb-3">
                    Who this program is for
                  </h3>
                  <ul className="space-y-2 text-xs sm:text-sm text-[#526E77] list-disc list-inside">
                    {course.targetAudience.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="w-full h-px bg-[#E5ECEE] my-6" />

                {/* How the learning is structured */}
                <div>
                  <h3 className="text-lg sm:text-xl font-serif font-bold text-[#172E35] mb-4">
                    How the learning is structured
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="p-4 rounded-xl bg-[#F6FAFA] border border-[#E5ECEE] flex flex-col items-start">
                      <div className="w-8 h-8 rounded-lg bg-[#E0F3F5] text-[#086477] flex items-center justify-center mb-2.5">
                        <BookOpen className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-[#172E35]">Learn</h4>
                      <p className="text-[11.5px] sm:text-xs text-[#526E77] mt-1 leading-relaxed">
                        Build essential concepts and practical framework tools.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#F6FAFA] border border-[#E5ECEE] flex flex-col items-start">
                      <div className="w-8 h-8 rounded-lg bg-[#E0F3F5] text-[#086477] flex items-center justify-center mb-2.5">
                        <Settings className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-[#172E35]">Apply</h4>
                      <p className="text-[11.5px] sm:text-xs text-[#526E77] mt-1 leading-relaxed">
                        Use the learning in realistic hands-on cases and tasks.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#F6FAFA] border border-[#E5ECEE] flex flex-col items-start">
                      <div className="w-8 h-8 rounded-lg bg-[#E0F3F5] text-[#086477] flex items-center justify-center mb-2.5">
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-[#172E35]">Reflect</h4>
                      <p className="text-[11.5px] sm:text-xs text-[#526E77] mt-1 leading-relaxed">
                        Review your progress and identify areas for rapid growth.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => switchTabAndFocus("curriculum", true)}
                    className="inline-flex items-center gap-1.5 min-h-[44px] px-2 -ml-2 rounded-lg text-xs sm:text-sm font-bold text-[#086477] hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477]"
                  >
                    <span>Explore the learning plan</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB PANEL 2: CURRICULUM */}
            {activeTab === "curriculum" && (
              <div
                role="tabpanel"
                id="panel-curriculum"
                aria-labelledby="tab-curriculum"
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#E5ECEE] pb-3">
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-[#172E35]">
                      Your learning plan
                    </h2>
                    <div className="flex items-center gap-1.5 text-xs text-[#526E77] mt-1">
                      <Clock className="h-3.5 w-3.5 text-[#086477]" aria-hidden="true" />
                      <span>
                        {isMto ? `${scheduleSummary}` : `10 focus areas · ${mentorCountLabel}`}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] sm:text-xs text-[#526E77] italic">
                    Approved curriculum structure
                  </span>
                </div>

                {/* Modules Accordion List */}
                <div className="space-y-3">
                  {course.modules.length > 0 ? (
                    course.modules.map((mod, idx) => {
                      const isExpanded = Boolean(expandedModules[String(idx)]);
                      const triggerId = `module-trigger-${mod.id}`;
                      const panelId = `module-panel-${mod.id}`;

                      return (
                        <div
                          key={mod.id}
                          className="rounded-xl border border-[#E5ECEE] bg-white shadow-2xs"
                        >
                          <button
                            type="button"
                            id={triggerId}
                            onClick={() => toggleModule(String(idx))}
                            aria-expanded={isExpanded}
                            aria-controls={panelId}
                            className={`w-full min-h-[44px] p-4 flex items-center justify-between gap-3 text-left hover:bg-[#F6FAFA] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477] ${
                              isExpanded ? "rounded-t-xl" : "rounded-xl"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="font-bold text-xs sm:text-sm text-[#086477]">
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              <span className="w-px h-4 bg-[#E5ECEE]" aria-hidden="true" />
                              <span className="font-bold text-xs sm:text-sm text-[#172E35]">
                                {mod.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[11px] sm:text-xs text-[#526E77] bg-[#F6FAFA] px-2.5 py-0.5 rounded-md border border-[#E5ECEE]">
                                {mod.duration}
                              </span>
                              {isExpanded ? (
                                <Minus className="h-4 w-4 text-[#086477]" aria-hidden="true" />
                              ) : (
                                <Plus className="h-4 w-4 text-[#526E77]" aria-hidden="true" />
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div
                              id={panelId}
                              role="region"
                              aria-labelledby={triggerId}
                              className="p-4 rounded-b-xl bg-[#EAF5F7] border-t border-[#D5E5E8] space-y-2"
                            >
                              {mod.topics.map((topic, tIdx) => (
                                <div
                                  key={tIdx}
                                  className="flex items-center gap-2 text-xs text-[#172E35]"
                                >
                                  <Clock
                                    className="h-3.5 w-3.5 text-[#086477] shrink-0"
                                    aria-hidden="true"
                                  />
                                  <span className="font-medium">{topic}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 rounded-xl bg-[#F6FAFA] border border-[#E5ECEE] text-center text-xs text-[#526E77]">
                      Detailed curriculum will be published soon.
                    </div>
                  )}
                </div>

                {/* A Session at a Glance */}
                <div className="pt-4 border-t border-[#E5ECEE]">
                  <h3 className="text-base sm:text-lg font-serif font-bold text-[#172E35] mb-3">
                    A session at a glance
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[#F6FAFA] border border-[#E5ECEE]">
                    <div>
                      <h4 className="font-bold text-xs text-[#172E35]">Concept</h4>
                      <p className="text-[11px] text-[#526E77] mt-1 leading-relaxed">
                        A focused input on a key idea (e.g. core responsibilities &amp; frameworks).
                      </p>
                    </div>
                    <div className="sm:border-l sm:border-[#E5ECEE] sm:pl-3 pt-2 sm:pt-0">
                      <h4 className="font-bold text-xs text-[#172E35]">Practice</h4>
                      <p className="text-[11px] text-[#526E77] mt-1 leading-relaxed">
                        A hands-on activity to apply the concept (e.g. case analysis or mini-task).
                      </p>
                    </div>
                    <div className="sm:border-l sm:border-[#E5ECEE] sm:pl-3 pt-2 sm:pt-0">
                      <h4 className="font-bold text-xs text-[#172E35]">Discussion</h4>
                      <p className="text-[11px] text-[#526E77] mt-1 leading-relaxed">
                        A guided discussion to share perspectives and learn from executive faculty.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => switchTabAndFocus("mentors", true)}
                    className="inline-flex items-center gap-1.5 min-h-[44px] px-2 -ml-2 rounded-lg text-xs sm:text-sm font-bold text-[#086477] hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477]"
                  >
                    <span>Meet the mentors behind the program</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB PANEL 3: MENTORS */}
            {activeTab === "mentors" && (
              <div
                role="tabpanel"
                id="panel-mentors"
                aria-labelledby="tab-mentors"
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-serif font-bold text-[#172E35]">
                    Industry experience. Practical guidance.
                  </h2>
                  <p className="text-xs sm:text-sm text-[#526E77] mt-1">
                    Meet the {mentors.length} mentors connected to this program.
                  </p>
                </div>

                {/* Mentors List */}
                <div className="space-y-3">
                  {mentors.map((mentor, idx) => {
                    const avatarSrc = getMentorAvatar(mentor, idx);
                    const initials = getInitials(mentor.name);
                    const companyLogo = getMentorCompanyLogo(mentor);

                    return (
                      <div
                        key={mentor.id}
                        className="p-4 sm:p-5 rounded-xl bg-[#F6FAFA] border border-[#E5ECEE] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#086477]/40 transition-colors"
                      >
                        <div className="flex items-center gap-3.5">
                          {avatarSrc ? (
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white border border-[#D5E5E8] shrink-0">
                              <Image
                                src={avatarSrc}
                                alt={mentor.name}
                                fill
                                sizes="48px"
                                className="object-cover object-top"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-[#E0F3F5] text-[#086477] font-bold text-sm flex items-center justify-center shrink-0 border border-[#BCE1E5]">
                              {initials}
                            </div>
                          )}

                          <div className="min-w-0">
                            <h3 className="text-sm sm:text-base font-bold text-[#172E35]">
                              {mentor.name}
                            </h3>
                            <p className="text-xs text-[#526E77] mt-0.5 leading-snug">
                              {mentor.role}
                            </p>
                          </div>
                        </div>

                        {companyLogo && (
                          <div className="flex items-center sm:border-l sm:border-[#E5ECEE] sm:pl-4 shrink-0">
                            <OfficialCompanyLogo
                              src={companyLogo.src}
                              alt={companyLogo.alt}
                              size="modal"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-[#E5ECEE]">
                  <h3 className="text-base sm:text-lg font-serif font-bold text-[#172E35]">
                    Learn through industry perspectives
                  </h3>
                  <p className="text-xs text-[#526E77] mt-1 leading-relaxed">
                    The program brings mentor perspectives into practical learning and career
                    preparation.
                  </p>
                  <button
                    type="button"
                    onClick={() => switchTabAndFocus("curriculum", true)}
                    className="inline-flex items-center gap-1.5 min-h-[44px] px-2 -ml-2 mt-2 rounded-lg text-xs sm:text-sm font-bold text-[#086477] hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477]"
                  >
                    <span>View the curriculum</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================== */}
          {/* RIGHT COLUMN: STICKY COURSE SUMMARY CARD (Desktop)         */}
          {/* ========================================================== */}
          <div className="hidden lg:block lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            {renderSummaryCard("desktop")}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 5. PRE-FOOTER "YOUR NEXT STEP STARTS HERE." BANNER            */}
        {/* ============================================================ */}
        <div className="my-12 rounded-2xl bg-[#E2F0F2] border border-[#BCE1E5] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#172E35]">
              Your next step starts here.
            </h2>
            <p className="text-xs sm:text-sm text-[#526E77] mt-1">
              Explore professional offline programs guided by senior corporate executives.
            </p>
          </div>

          <Link
            href="/#courses"
            className="shrink-0 min-h-[44px] px-6 py-3 rounded-xl bg-[#086477] hover:bg-[#064654] text-white font-bold text-xs sm:text-sm shadow-xs inline-flex items-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477]"
          >
            <span>Explore our programs</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
