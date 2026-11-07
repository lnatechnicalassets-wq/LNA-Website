"use client";

import React from "react";
import Image from "next/image";
import { Star, Briefcase } from "lucide-react";
import type { Review } from "@/lib/content";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface ReviewsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  reviews: Review[];
}

export function ReviewsModal({ isOpen, onOpenChange, reviews }: ReviewsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[85vh] overflow-y-auto bg-white p-6 sm:p-8 rounded-3xl border border-teal-100 shadow-2xl">
        <DialogHeader className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold tracking-widest text-[#086477] uppercase">
              Alumni Perspectives
            </span>
          </div>
          <DialogTitle className="text-2xl sm:text-3xl font-serif font-bold text-[#172E35]">
            Learner Success Stories
          </DialogTitle>
          <DialogDescription className="text-sm text-text-secondary mt-1">
            Read comprehensive feedback from professionals and leaders across Bangladesh who
            participated in Lead Nation Academy programs.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="rounded-2xl border border-teal-100/80 bg-teal-50/20 p-5 flex flex-col justify-between hover:bg-teal-50/40 transition-colors"
            >
              <div>
                {/* Rating */}
                {rev.rating && (
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                )}

                {/* Quote */}
                <blockquote className="text-sm font-serif italic text-[#172E35] leading-relaxed mb-4">
                  &ldquo;{rev.quote}&rdquo;
                </blockquote>

                {/* Program badge */}
                {(rev.program || rev.cohort) && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E0F2F1] text-[#086477] mb-4">
                    {rev.program || rev.cohort}
                  </span>
                )}
              </div>

              {/* Author footer */}
              <div className="flex items-center gap-3 pt-3 border-t border-teal-100/60">
                {rev.portraitSrc ? (
                  <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white shadow-xs shrink-0">
                    <Image
                      src={rev.portraitSrc}
                      alt={rev.author}
                      fill
                      sizes="36px"
                      className="object-cover object-top"
                    />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-teal-100 text-[#086477] font-bold text-xs flex items-center justify-center shrink-0">
                    {rev.author.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-sm font-bold text-[#172E35] block truncate">
                    {rev.author}
                  </span>
                  <span className="text-xs text-text-secondary flex items-center gap-1 truncate">
                    <Briefcase className="w-3 h-3 text-[#086477] shrink-0" />
                    {rev.designation} {rev.company ? `• ${rev.company}` : ""}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
