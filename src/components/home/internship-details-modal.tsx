"use client";

import React, { useEffect } from "react";
import { MapPin, Calendar, Clock, Coins, ExternalLink, ArrowLeft, ArrowRight } from "lucide-react";
import type { Internship } from "@/lib/content";
import { InternshipLogo } from "./internship-logo";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export interface InternshipDetailsModalProps {
  internship: Internship | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  internships?: Internship[];
  currentIndex?: number;
  onNavigate?: (index: number) => void;
}

export function InternshipDetailsModal({
  internship,
  isOpen,
  onOpenChange,
  internships = [],
  currentIndex = 0,
  onNavigate,
}: InternshipDetailsModalProps) {
  const totalItems = internships.length;

  useEffect(() => {
    if (!isOpen || !onNavigate || totalItems <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onNavigate((currentIndex - 1 + totalItems) % totalItems);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onNavigate((currentIndex + 1) % totalItems);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, totalItems, onNavigate]);

  if (!internship) return null;

  const title = `${internship.roleTitle} at ${internship.companyName}`;
  const allowanceText =
    internship.allowance?.displayText?.replace("/month", "").trim() || "Unpaid / Not Disclosed";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[680px] sm:max-w-[720px] p-6 sm:p-8 bg-white rounded-2xl border border-[#E5ECEE] shadow-2xl overflow-hidden focus:outline-hidden">
        {/* Top Header: Company Logo + Previous/Next Navigation Controls */}
        <div className="flex items-center justify-between pr-8">
          <InternshipLogo company={internship.companyName} />
          {totalItems > 1 && onNavigate && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate((currentIndex - 1 + totalItems) % totalItems)}
                aria-label="Previous internship opportunity"
                className="w-8 h-8 rounded-full border border-[#D5E2E5] bg-white hover:border-[#086477] text-[#172E35] hover:text-[#086477] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-semibold text-[#526E77] min-w-[34px] text-center select-none">
                {currentIndex + 1} / {totalItems}
              </span>
              <button
                type="button"
                onClick={() => onNavigate((currentIndex + 1) % totalItems)}
                aria-label="Next internship opportunity"
                className="w-8 h-8 rounded-full border border-[#D5E2E5] bg-white hover:border-[#086477] text-[#172E35] hover:text-[#086477] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Title */}
        <DialogTitle className="mt-3 text-2xl sm:text-[28px] font-serif font-bold text-[#172E35] tracking-tight">
          {title}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Details for {internship.roleTitle} internship opportunity at {internship.companyName}
        </DialogDescription>

        {/* Fine Horizontal Divider */}
        <div className="w-full h-px bg-[#E5ECEE] my-4" />

        {/* 4 Summary Fields (2x2 Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 py-1">
          {/* 1. Workplace */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[#F6FAFA] text-[#086477] shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
              <span className="text-xs font-medium text-[#526E77] block">Workplace</span>
              <span className="text-sm font-bold text-[#172E35] block mt-0.5">
                {internship.workplace}
              </span>
            </div>
          </div>

          {/* 2. Schedule */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[#F6FAFA] text-[#086477] shrink-0 mt-0.5">
              <Calendar className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
              <span className="text-xs font-medium text-[#526E77] block">Schedule</span>
              <span className="text-sm font-bold text-[#172E35] block mt-0.5">
                {internship.schedule}
              </span>
            </div>
          </div>

          {/* 3. Duration */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[#F6FAFA] text-[#086477] shrink-0 mt-0.5">
              <Clock className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
              <span className="text-xs font-medium text-[#526E77] block">Duration</span>
              <span className="text-sm font-bold text-[#172E35] block mt-0.5">
                {internship.duration}
              </span>
            </div>
          </div>

          {/* 4. Monthly allowance */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[#F6FAFA] text-[#086477] shrink-0 mt-0.5">
              <Coins className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
              <span className="text-xs font-medium text-[#526E77] block">Monthly allowance</span>
              <span className="text-sm font-bold text-[#172E35] block mt-0.5">{allowanceText}</span>
            </div>
          </div>
        </div>

        {/* Fine Horizontal Divider */}
        <div className="w-full h-px bg-[#E5ECEE] my-4" />

        {/* About the opportunity */}
        <div>
          <h4 className="text-base sm:text-lg font-bold text-[#172E35]">About the opportunity</h4>
          <p className="mt-2 text-sm sm:text-base text-[#526E77] leading-relaxed">
            {internship.fullDescription || internship.shortDescription}
          </p>
        </div>

        {/* Application link section (if URL provided) */}
        {internship.applicationUrl && (
          <>
            <div className="w-full h-px bg-[#E5ECEE] my-4" />
            <div>
              <h4 className="text-base sm:text-lg font-bold text-[#172E35]">Application link</h4>
              <a
                href={internship.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm sm:text-base font-semibold text-[#086477] underline hover:text-[#06505F] transition-colors"
              >
                <span>Open application link</span>
                <ExternalLink className="w-4 h-4 shrink-0" strokeWidth={2} />
              </a>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
