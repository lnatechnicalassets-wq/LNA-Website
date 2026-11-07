"use client";

import React from "react";
import Image from "next/image";
import {
  GraduationCap,
  Calendar,
  Check,
  Star,
  Briefcase,
  Monitor,
  Users,
  UserCheck,
  Award,
  ArrowRight,
} from "lucide-react";
import type { IrgpStory, IrgpGalleryItem, Review, IrgpOutcomes } from "@/lib/content";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface IrgpStoryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  story: IrgpStory;
  gallery: IrgpGalleryItem[];
  reviews: Review[];
  outcomes: IrgpOutcomes;
}

function getActivityIcon(iconName?: string) {
  switch (iconName?.toLowerCase()) {
    case "monitor":
      return <Monitor className="w-4 h-4 text-[#086477]" />;
    case "users":
      return <Users className="w-4 h-4 text-[#086477]" />;
    case "usercheck":
      return <UserCheck className="w-4 h-4 text-[#086477]" />;
    case "award":
      return <Award className="w-4 h-4 text-[#086477]" />;
    default:
      return <GraduationCap className="w-4 h-4 text-[#086477]" />;
  }
}

export function IrgpStoryModal({
  isOpen,
  onOpenChange,
  story,
  gallery,
  reviews,
  outcomes,
}: IrgpStoryModalProps) {
  const handleExploreCourses = () => {
    onOpenChange(false);
    setTimeout(() => {
      const el = document.getElementById("courses");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }, 150);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-6 sm:p-8 rounded-3xl border border-teal-100 shadow-2xl">
        <DialogHeader className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-bold tracking-widest text-[#086477] uppercase font-sans">
              {story.badge}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-[#086477] text-xs font-semibold border border-teal-200/60">
              <Check className="w-3 h-3 text-[#086477] stroke-[3]" />
              {story.status}
            </span>
          </div>

          <DialogTitle className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#172E35]">
            {story.title}
          </DialogTitle>

          <DialogDescription className="text-sm text-text-secondary mt-1 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#086477]" />
            <span>
              {story.cohort} • {story.period}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          {/* Section A: Overview & Objectives */}
          <div>
            <h4 className="text-base sm:text-lg font-serif font-bold text-[#172E35] mb-2">
              Program Overview
            </h4>
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
              {story.modalOverview}
            </p>

            <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-teal-50/40 border border-teal-100/80">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#086477] mb-2.5">
                Core Program Objectives
              </h5>
              <ul className="space-y-2">
                {story.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-[#172E35]">
                    <Check className="w-4 h-4 text-[#086477] shrink-0 mt-0.5" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section B: Training Experience Modules */}
          <div>
            <h4 className="text-base sm:text-lg font-serif font-bold text-[#172E35] mb-3">
              Training Experience & Key Activities
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {story.activities.map((act) => (
                <div
                  key={act.id}
                  className="p-4 rounded-2xl border border-teal-100/70 bg-white shadow-xs"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
                      {getActivityIcon(act.icon)}
                    </div>
                    <span className="text-sm font-bold text-[#172E35]">{act.title}</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">{act.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section C: Program Photo Highlights */}
          <div>
            <h4 className="text-base sm:text-lg font-serif font-bold text-[#172E35] mb-3">
              Program Photo Gallery
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              {gallery.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-teal-100 bg-teal-50"
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-2">
                    <span className="text-[10px] text-white font-medium truncate">
                      {photo.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section D: Learner Feedback */}
          <div>
            <h4 className="text-base sm:text-lg font-serif font-bold text-[#172E35] mb-3">
              Alumni Perspectives
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {reviews.slice(0, 2).map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 rounded-2xl border border-teal-100/70 bg-teal-50/20 flex flex-col justify-between"
                >
                  <div>
                    {rev.rating && (
                      <div className="flex items-center gap-1 mb-2">
                        {Array.from({ length: Math.round(rev.rating) }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    )}
                    <blockquote className="text-xs sm:text-sm font-serif italic text-[#172E35] leading-relaxed mb-3">
                      &ldquo;{rev.quote}&rdquo;
                    </blockquote>
                  </div>

                  <div className="flex items-center gap-2.5 pt-2 border-t border-teal-100/50">
                    {rev.portraitSrc && (
                      <div className="relative w-8 h-8 rounded-full overflow-hidden border border-teal-200 shrink-0">
                        <Image
                          src={rev.portraitSrc}
                          alt={rev.author}
                          fill
                          sizes="32px"
                          className="object-cover object-top"
                        />
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-bold text-[#172E35] block">{rev.author}</span>
                      <span className="text-[11px] text-text-secondary flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-[#086477]" />
                        {rev.designation}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section E: Program Outcomes */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-teal-100/90 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#086477] mb-3">
              Documented Program Outcomes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-center">
              {outcomes.metrics
                .filter((m) => m.published !== false)
                .map((m) => (
                  <div key={m.id} className="p-2 sm:p-3 rounded-xl bg-teal-50/40">
                    {m.isVerified && m.metric ? (
                      <span className="text-xl sm:text-2xl font-bold font-serif text-[#172E35] block">
                        {m.metric}
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100/70 text-[#086477] mb-1">
                        {m.statusText || "Pending Audit"}
                      </span>
                    )}
                    <span className="text-[11px] sm:text-xs text-text-secondary font-medium block">
                      {m.label}
                    </span>
                  </div>
                ))}
            </div>
            {outcomes.disclaimer && (
              <p className="mt-3 text-[10px] text-text-muted text-center italic">
                {outcomes.disclaimer}
              </p>
            )}
          </div>

          {/* Section F: Closing CTA to Active Courses */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-teal-100">
            <div>
              <p className="text-sm font-semibold text-[#172E35]">
                Ready to take your career to the next level?
              </p>
              <p className="text-xs text-text-secondary">
                Explore currently open executive masterclasses and programs.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExploreCourses}
              aria-label="Explore Current Courses"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#086477] hover:bg-[#075565] text-white font-medium text-sm transition-colors cursor-pointer shadow-xs"
            >
              <span>Explore Current Courses</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
