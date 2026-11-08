"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  ArrowRight,
  X,
  Users,
  Award,
  BookOpen,
} from "lucide-react";
import type { Course, Batch, Mentor } from "@/lib/content";
import { formatPoishaToBDT } from "@/lib/money";
import { getMentorAvatar } from "@/lib/mentors";
import { useMentorQuickView } from "./mentor-quick-view-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface CourseDetailsModalProps {
  course: Course | null;
  batch?: Batch;
  mentors?: Mentor[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CourseDetailsModal({
  course,
  batch,
  mentors = [],
  isOpen,
  onOpenChange,
}: CourseDetailsModalProps) {
  const { openQuickView } = useMentorQuickView();

  if (!course) return null;

  const isCompleted = batch?.status === "completed";
  const feePoisha = batch?.feePoisha ?? 3000000;
  const discountFeePoisha = batch?.discountFeePoisha;
  const effectiveFeePoisha = discountFeePoisha ?? feePoisha;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white rounded-2xl border border-[#E5ECEE] shadow-2xl">
        {/* Top Header Banner with Deep Teal Accent */}
        <div className="bg-gradient-to-r from-[#086477] to-[#0A7387] p-6 sm:p-8 text-white relative">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#C5E2E5]">
              {course.category}
            </span>
            <span
              className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold ${
                isCompleted
                  ? "bg-[#D1FAE5] text-[#065F46]"
                  : "bg-white/20 text-white border border-white/30"
              }`}
            >
              {isCompleted ? "Completed Cohort" : "Upcoming Cohort"}
            </span>
          </div>

          <DialogTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-snug">
            {course.title}
          </DialogTitle>

          <DialogDescription className="mt-2 text-sm sm:text-base text-[#E2ECEE] leading-relaxed">
            {course.subtitle || course.summary}
          </DialogDescription>

          {/* Quick Details Chips */}
          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs sm:text-sm text-[#E8F3F5]">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-xs">
              <Calendar className="w-4 h-4 text-[#C5E2E5]" />
              <span>{batch?.scheduleDescription || `${course.modules.length * 2} Weeks`}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-xs">
              <MapPin className="w-4 h-4 text-[#C5E2E5]" />
              <span>Offline • Dhanmondi, Dhaka</span>
            </div>
            {!isCompleted && (
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-xs font-semibold">
                <span>Tuition: {formatPoishaToBDT(effectiveFeePoisha).replace("৳", "BDT ")}</span>
                {discountFeePoisha && (
                  <span className="line-through text-white/60 text-xs font-normal">
                    {formatPoishaToBDT(feePoisha).replace("৳", "BDT ")}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-6 sm:p-8 max-h-[60vh] overflow-y-auto space-y-6">
          {/* Overview */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#086477] mb-2">
              Program Overview
            </h4>
            <p className="text-sm sm:text-base text-[#526E77] leading-relaxed">
              {course.description}
            </p>
          </div>

          {/* Key Learning Outcomes */}
          {course.learningOutcomes && course.learningOutcomes.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#086477] mb-3">
                Key Learning Outcomes
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {course.learningOutcomes.map((outcome, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F6FAFA] border border-[#E5ECEE]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#086477] shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-[#172E35] font-medium leading-snug">
                      {outcome}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assigned Faculty */}
          {mentors.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#086477] mb-3">
                Faculty & Industry Mentors ({mentors.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mentors.map((mentor, idx) => {
                  const avatar = getMentorAvatar(mentor, idx);
                  return (
                    <div
                      key={mentor.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#E5ECEE] hover:border-[#086477] transition-colors"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openQuickView(mentor);
                        }}
                        className="relative w-12 h-12 rounded-full overflow-hidden bg-[#E8F3F5] ring-2 ring-[#086477]/20 shrink-0 cursor-pointer hover:scale-105 transition-transform"
                        title={`View profile for ${mentor.name}`}
                      >
                        <Image
                          src={avatar}
                          alt={mentor.name}
                          fill
                          sizes="48px"
                          className="object-cover object-top"
                        />
                      </button>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openQuickView(mentor);
                          }}
                          className="text-sm font-bold text-[#172E35] hover:text-[#086477] text-left truncate block w-full transition-colors cursor-pointer"
                        >
                          {mentor.name}
                        </button>
                        <p className="text-xs text-[#526E77] truncate">{mentor.role}</p>
                        <p className="text-[11px] text-[#526E77]/80 truncate">
                          {mentor.organization}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Actions */}
        <div className="p-4 sm:p-6 bg-[#F6FAFA] border-t border-[#E5ECEE] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[#526E77]">
            {isCompleted ? (
              <span>This cohort concluded successfully. Review our active programs.</span>
            ) : (
              <span>Limited seats available. Offline enrollment at Dhanmondi campus.</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-semibold text-[#526E77] hover:text-[#172E35] transition-colors rounded-xl"
            >
              Close
            </button>
            <Link
              href={`/courses/${course.id}`}
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#086477] hover:bg-[#06505F] text-white text-sm font-bold shadow-xs hover:shadow-md transition-all"
            >
              <span>{isCompleted ? "View Course Page" : "Enroll Now"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

