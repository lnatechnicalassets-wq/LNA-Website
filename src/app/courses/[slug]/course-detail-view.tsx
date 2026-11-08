"use client";

import React, { useState } from "react";
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
  ShieldCheck,
  Building,
  MapPin,
} from "lucide-react";
import type { Course, Batch, Mentor } from "@/lib/content";
import { formatPoishaToBDT } from "@/lib/money";
import { getMentorAvatar } from "@/lib/mentors";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export interface CourseDetailViewProps {
  course: Course;
  batch?: Batch;
  mentors: Mentor[];
}

type TabType = "overview" | "curriculum" | "mentors";

export function CourseDetailView({
  course,
  batch,
  mentors,
}: CourseDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    "0": true, // first module open by default
  });
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);

  const isMto = course.id === "mto-readiness" || course.id === "mto";
  const isIrgp = course.id === "irgp";
  const isCompleted = isIrgp || batch?.status === "completed";

  // Financial calculations via integer poisha (Rule R5)
  const feePoisha = batch?.feePoisha ?? (isMto ? 750000 : 0);
  const formattedFee = formatPoishaToBDT(feePoisha).replace("৳", "BDT ");

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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="w-full bg-[#F6FAFA] text-[#172E35] min-h-screen py-8 sm:py-10 lg:py-12">
      <div className="max-w-7xl xl:max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* ============================================================ */}
        {/* 1. COMPACT COURSE INTRODUCTION (Title, Subtitle, CTA)         */}
        {/* ============================================================ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 pb-2">
          <div className="flex flex-col items-start">
            <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-serif font-bold tracking-tight text-[#172E35] leading-tight">
              {course.title}
            </h1>
            <p className="text-sm sm:text-base text-[#526E77] mt-1 font-sans">
              {course.subtitle || course.summary}
            </p>
          </div>

          <div className="shrink-0">
            {isCompleted ? (
              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase bg-[#E8F3F5] text-[#086477] border border-[#086477]/25 shadow-2xs">
                <span>COMPLETED PROGRAM · IRGP</span>
              </div>
            ) : (
              <Button
                variant="primary"
                onClick={() => setIsEnrollDialogOpen(true)}
                className="rounded-full px-6 py-2.5 bg-[#086477] hover:bg-[#064654] text-white font-semibold text-xs sm:text-sm shadow-sm transition-all duration-200 inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Enroll in {course.title}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. WIDE CLASSROOM OR PROGRAM BANNER                          */}
        {/* ============================================================ */}
        <div className="mt-4">
          <div className="relative w-full h-[220px] sm:h-[300px] lg:h-[340px] rounded-2xl overflow-hidden shadow-xs border border-[#E5ECEE] bg-[#E8F3F5]">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 divide-y lg:divide-y-0 lg:divide-x divide-[#E5ECEE]">
            {isMto ? (
              <>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-[#086477] shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-[#172E35]">
                    16 sessions
                  </span>
                </div>
                <div className="flex items-center gap-3 pt-3 lg:pt-0 lg:pl-6">
                  <Clock className="h-5 w-5 text-[#086477] shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-[#172E35]">
                    1.5h each
                  </span>
                </div>
                <div className="flex items-center gap-3 pt-3 lg:pt-0 lg:pl-6">
                  <Layers className="h-5 w-5 text-[#086477] shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-[#172E35]">
                    8 essential skills
                  </span>
                </div>
                <div className="flex items-center gap-3 pt-3 lg:pt-0 lg:pl-6">
                  <Users className="h-5 w-5 text-[#086477] shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-[#172E35]">
                    5 industry mentors
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Layers className="h-5 w-5 text-[#086477] shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-[#172E35]">
                    10 focus areas
                  </span>
                </div>
                <div className="flex items-center gap-3 pt-3 lg:pt-0 lg:pl-6">
                  <Users className="h-5 w-5 text-[#086477] shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-[#172E35]">
                    8 industry mentors
                  </span>
                </div>
                <div className="flex items-center gap-3 pt-3 lg:pt-0 lg:pl-6">
                  <CheckCircle2 className="h-5 w-5 text-[#086477] shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-[#172E35]">
                    100% completed cohort
                  </span>
                </div>
                <div className="flex items-center gap-3 pt-3 lg:pt-0 lg:pl-6">
                  <Award className="h-5 w-5 text-[#086477] shrink-0" />
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
        <div className="block lg:hidden mb-8">
          <div className="bg-white rounded-2xl border border-[#E5ECEE] p-6 shadow-xs">
            {isCompleted ? (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#526E77] block">
                  PROGRAM STATUS
                </span>
                <p className="text-2xl font-bold font-serif text-[#086477] my-2">
                  Completed Cohort
                </p>
                <div className="space-y-2 text-xs sm:text-sm text-[#526E77] mb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#086477]" />
                    <span>10 focus areas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#086477]" />
                    <span>8 industry mentors</span>
                  </div>
                </div>
                <Link
                  href="/#reviews"
                  className="w-full text-center py-3 px-4 rounded-xl bg-[#086477] hover:bg-[#064654] text-white font-bold text-xs shadow-xs inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Explore Learner Reviews</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#526E77] block">
                  PROGRAM FEE
                </span>
                <p className="text-3xl font-extrabold text-[#172E35] my-2">
                  {formattedFee}
                </p>
                <div className="space-y-2 text-xs sm:text-sm text-[#526E77] mb-5">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#086477]" />
                    <span>16 sessions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#086477]" />
                    <span>1.5h each</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#086477]" />
                    <span>5 industry mentors</span>
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={() => setIsEnrollDialogOpen(true)}
                  className="w-full py-3.5 rounded-xl bg-[#086477] hover:bg-[#064654] text-white font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2"
                >
                  <span>Enroll in {course.title}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. TWO-COLUMN LAYOUT (Left Tabs 70% | Right Summary 30%)     */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* ========================================================== */}
          {/* LEFT COLUMN: TABS (Overview, Curriculum, Mentors)          */}
          {/* ========================================================== */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E5ECEE] p-6 sm:p-8 shadow-xs">
            {/* Accessible Tab List */}
            <div
              role="tablist"
              aria-label="Course details navigation"
              className="flex items-center gap-2 border-b border-[#E5ECEE] pb-3 mb-6"
            >
              <button
                type="button"
                role="tab"
                id="tab-overview"
                aria-selected={activeTab === "overview"}
                aria-controls="panel-overview"
                onClick={() => setActiveTab("overview")}
                className={`px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === "overview"
                    ? "bg-[#D9EDF0] text-[#086477] font-bold border border-[#A4D1D6] shadow-2xs"
                    : "text-[#526E77] hover:text-[#172E35] hover:bg-[#F6FAFA]"
                }`}
              >
                Overview
              </button>

              <button
                type="button"
                role="tab"
                id="tab-curriculum"
                aria-selected={activeTab === "curriculum"}
                aria-controls="panel-curriculum"
                onClick={() => setActiveTab("curriculum")}
                className={`px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === "curriculum"
                    ? "bg-[#D9EDF0] text-[#086477] font-bold border border-[#A4D1D6] shadow-2xs"
                    : "text-[#526E77] hover:text-[#172E35] hover:bg-[#F6FAFA]"
                }`}
              >
                Curriculum
              </button>

              <button
                type="button"
                role="tab"
                id="tab-mentors"
                aria-selected={activeTab === "mentors"}
                aria-controls="panel-mentors"
                onClick={() => setActiveTab("mentors")}
                className={`px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === "mentors"
                    ? "bg-[#D9EDF0] text-[#086477] font-bold border border-[#A4D1D6] shadow-2xs"
                    : "text-[#526E77] hover:text-[#172E35] hover:bg-[#F6FAFA]"
                }`}
              >
                Mentors
              </button>
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
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-[#172E35]">Learn</h4>
                      <p className="text-[11.5px] sm:text-xs text-[#526E77] mt-1 leading-relaxed">
                        Build essential concepts and practical framework tools.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#F6FAFA] border border-[#E5ECEE] flex flex-col items-start">
                      <div className="w-8 h-8 rounded-lg bg-[#E0F3F5] text-[#086477] flex items-center justify-center mb-2.5">
                        <Settings className="h-4 w-4" />
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-[#172E35]">Apply</h4>
                      <p className="text-[11.5px] sm:text-xs text-[#526E77] mt-1 leading-relaxed">
                        Use the learning in realistic hands-on cases and tasks.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#F6FAFA] border border-[#E5ECEE] flex flex-col items-start">
                      <div className="w-8 h-8 rounded-lg bg-[#E0F3F5] text-[#086477] flex items-center justify-center mb-2.5">
                        <RefreshCw className="h-4 w-4" />
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
                    onClick={() => setActiveTab("curriculum")}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#086477] hover:underline cursor-pointer"
                  >
                    <span>Explore the learning plan</span>
                    <ArrowRight className="h-4 w-4" />
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
                      <Clock className="h-3.5 w-3.5 text-[#086477]" />
                      <span>
                        {isMto
                          ? "16 sessions · 1.5h each"
                          : "10 focus areas · 8 industry mentors"}
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
                      return (
                        <div
                          key={mod.id}
                          className="rounded-xl border border-[#E5ECEE] overflow-hidden bg-white shadow-2xs"
                        >
                          <button
                            type="button"
                            onClick={() => toggleModule(String(idx))}
                            aria-expanded={isExpanded}
                            className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[#F6FAFA] transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
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
                                <Minus className="h-4 w-4 text-[#086477]" />
                              ) : (
                                <Plus className="h-4 w-4 text-[#526E77]" />
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="p-4 bg-[#EAF5F7] border-t border-[#D5E5E8] space-y-2">
                              {mod.topics.map((topic, tIdx) => (
                                <div
                                  key={tIdx}
                                  className="flex items-center gap-2 text-xs text-[#172E35]"
                                >
                                  <Clock className="h-3.5 w-3.5 text-[#086477] shrink-0" />
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
                    onClick={() => setActiveTab("mentors")}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#086477] hover:underline cursor-pointer"
                  >
                    <span>Meet the mentors behind the program</span>
                    <ArrowRight className="h-4 w-4" />
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
                    const orgDisplay = mentor.organization.split(",")[0].trim();

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

                        <div className="flex items-center gap-3 sm:border-l sm:border-[#E5ECEE] sm:pl-4">
                          <span className="text-sm sm:text-base font-bold text-[#086477] font-serif tracking-tight whitespace-nowrap">
                            {orgDisplay}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-[#E5ECEE]">
                  <h3 className="text-base sm:text-lg font-serif font-bold text-[#172E35]">
                    Learn through industry perspectives
                  </h3>
                  <p className="text-xs text-[#526E77] mt-1 leading-relaxed">
                    The program brings mentor perspectives into practical learning and career preparation.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("curriculum")}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#086477] hover:underline mt-3 cursor-pointer"
                  >
                    <span>View the curriculum</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================== */}
          {/* RIGHT COLUMN: STICKY COURSE SUMMARY CARD (Desktop)         */}
          {/* ========================================================== */}
          <div className="hidden lg:block lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            <div className="bg-white rounded-2xl border border-[#E5ECEE] p-6 sm:p-7 shadow-xs">
              {isCompleted ? (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#526E77] block">
                    PROGRAM STATUS
                  </span>
                  <p className="text-2xl font-bold font-serif text-[#086477] my-2">
                    Completed Cohort
                  </p>

                  <div className="space-y-2.5 text-xs sm:text-[13px] text-[#526E77] my-4">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-[#086477] shrink-0" />
                      <span>10 focus areas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#086477] shrink-0" />
                      <span>8 industry mentors</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#086477] shrink-0" />
                      <span>100% completed cohort</span>
                    </div>
                  </div>

                  <Link
                    href="/#reviews"
                    className="w-full text-center py-3.5 px-4 rounded-xl bg-[#086477] hover:bg-[#064654] text-white font-bold text-xs shadow-xs inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>Explore Learner Reviews</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>

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
                </div>
              ) : (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#526E77] block">
                    PROGRAM FEE
                  </span>
                  <p className="text-3xl font-extrabold text-[#172E35] my-2">
                    {formattedFee}
                  </p>

                  <div className="space-y-2.5 text-xs sm:text-[13px] text-[#526E77] my-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#086477] shrink-0" />
                      <span>16 sessions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#086477] shrink-0" />
                      <span>1.5h each</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#086477] shrink-0" />
                      <span>5 industry mentors</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => setIsEnrollDialogOpen(true)}
                    className="w-full py-3.5 rounded-xl bg-[#086477] hover:bg-[#064654] text-white font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Enroll in {course.title}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                  <div className="w-full h-px bg-[#E5ECEE] my-6" />

                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#172E35] mb-3">
                    Program at a glance
                  </h3>
                  <div className="space-y-3 text-xs text-[#526E77]">
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-[#086477] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-[#172E35] block">Format</span>
                        <span>Live, cohort-based learning</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Building className="h-4 w-4 text-[#086477] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-[#172E35] block">Focus</span>
                        <span>Workplace-relevant MTO skills</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Layers className="h-4 w-4 text-[#086477] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-[#172E35] block">Skills</span>
                        <span>8 essential professional skills</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Award className="h-4 w-4 text-[#086477] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-[#172E35] block">Outcome</span>
                        <span>Readiness for MTO opportunities</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
            className="shrink-0 px-6 py-3 rounded-xl bg-[#086477] hover:bg-[#064654] text-white font-bold text-xs sm:text-sm shadow-xs inline-flex items-center gap-2 transition-colors"
          >
            <span>Explore our programs</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 6. ACCESSIBLE ENROLLMENT DETAILS DIALOG                       */}
      {/* ============================================================ */}
      <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6 sm:p-7 border border-[#E5ECEE]">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-bold text-[#172E35]">
              Enroll in {course.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#526E77] mt-1">
              Batch information and offline enrollment reservation.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-3 bg-[#F6FAFA] p-4 rounded-xl border border-[#E5ECEE] text-xs">
            <div className="flex justify-between">
              <span className="text-[#526E77]">Batch Name:</span>
              <span className="font-bold text-[#172E35]">
                {batch?.name || "Cohort 1"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#526E77]">Schedule:</span>
              <span className="font-bold text-[#172E35]">
                {batch?.scheduleDescription || "16 Sessions (1.5h each)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#526E77]">Start Date:</span>
              <span className="font-bold text-[#172E35]">
                {batch?.startDate ? "December 1, 2026" : "Upcoming"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#526E77]">Campus Venue:</span>
              <span className="font-bold text-[#172E35]">
                {course.venue || "Dhanmondi, Dhaka"}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#E5ECEE]">
              <span className="font-bold text-[#172E35]">Tuition Fee:</span>
              <span className="font-bold text-[#086477] text-sm">
                {formattedFee}
              </span>
            </div>
          </div>

          <p className="text-xs text-[#526E77] leading-relaxed">
            Offline cohorts have strictly capped capacity. To reserve your seat and confirm enrollment, please reach out to our Dhanmondi campus admissions desk at{" "}
            <a href="mailto:info@lnabd.org" className="text-[#086477] font-bold underline">
              info@lnabd.org
            </a>{" "}
            or call{" "}
            <a href="tel:+8801700000000" className="text-[#086477] font-bold underline">
              +880 1700-000000
            </a>.
          </p>

          <DialogFooter className="mt-5 flex items-center justify-end gap-2.5">
            <DialogClose asChild>
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold text-[#526E77] hover:text-[#172E35] rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </DialogClose>
            <a
              href="mailto:info@lnabd.org?subject=Enrollment%20Inquiry%20-%20MTO%20Readiness%20Program"
              className="px-5 py-2 rounded-xl bg-[#086477] hover:bg-[#064654] text-white font-bold text-xs shadow-xs transition-colors"
            >
              Contact Admissions
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

