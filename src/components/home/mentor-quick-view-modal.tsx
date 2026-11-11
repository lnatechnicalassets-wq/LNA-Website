"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { X, ExternalLink } from "lucide-react";
import type { Mentor } from "@/lib/content";
import { formatMentorRoleWithCompany, getMentorAvatar, getMentorCompanyLogos } from "@/lib/mentors";
import { CompanyLogo, OfficialCompanyLogo } from "./company-logo";

export interface MentorQuickViewModalProps {
  mentor: Mentor;
  onClose: () => void;
}

export function MentorQuickViewModal({ mentor, onClose }: MentorQuickViewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Save previously focused element to restore focus on close
    previouslyFocusedElement.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Lock background scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus close button inside modal
    const closeBtn = modalRef.current?.querySelector<HTMLButtonElement>("button[data-close-btn]");
    closeBtn?.focus();

    // Escape key listener & Tab focus trap
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocusedElement.current?.isConnected) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [onClose]);

  const avatarSrc = getMentorAvatar(mentor);
  const companyLogos = getMentorCompanyLogos(mentor);
  const fallbackHistoryLogos = companyLogos.length === 0 ? (mentor.careerHistory ?? []) : [];
  const expertiseList = mentor.expertise ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-view-mentor-name"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-250"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-[560px] sm:max-w-[580px] bg-[#FAF9F6] text-[#172E35] rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/80 overflow-hidden max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-250 ease-out"
      >
        {/* Top Header Row with Close Button */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4 sm:gap-5 flex-1 min-w-0">
            {/* Portrait Thumbnail */}
            <div className="relative w-24 h-28 sm:w-28 sm:h-32 rounded-2xl overflow-hidden bg-[#E8F2F4] ring-2 ring-white/90 shadow-md shrink-0">
              <Image
                src={avatarSrc}
                alt={mentor.name}
                fill
                sizes="128px"
                className="object-cover object-top"
              />
            </div>

            {/* Mentor Info */}
            <div className="flex-1 min-w-0">
              <h3
                id="quick-view-mentor-name"
                className="text-base sm:text-lg font-bold font-serif text-[#172E35] tracking-tight leading-snug"
              >
                {mentor.name}
              </h3>
              <p className="text-xs sm:text-[13px] font-semibold text-[#526E77] mt-0.5 leading-snug">
                {formatMentorRoleWithCompany(mentor)}
              </p>

              {/* Complete biography */}
              <p className="text-xs sm:text-[13px] text-[#526E77] leading-relaxed mt-2.5">
                {mentor.bio}
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            data-close-btn
            onClick={onClose}
            aria-label="Close mentor details"
            className="p-1.5 rounded-full text-[#526E77] hover:text-[#172E35] hover:bg-[#E5ECEE] transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#086477] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Companies & Experience Section */}
        {(companyLogos.length > 0 || fallbackHistoryLogos.length > 0) && (
          <div className="mt-5 pt-4 border-t border-[#E5ECEE]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#526E77] block mb-2">
              Companies &amp; Experience
            </span>
            <div className="flex flex-wrap items-center gap-4">
              {companyLogos.length > 0
                ? companyLogos.map((logo) => (
                    <OfficialCompanyLogo
                      key={logo.src}
                      src={logo.src}
                      alt={logo.alt}
                      size="modal"
                      compact={companyLogos.length > 1}
                    />
                  ))
                : fallbackHistoryLogos.map((item, idx) => (
                    <CompanyLogo
                      key={idx}
                      name={item.company}
                      logoIcon={item.logoIcon}
                      className="text-[#172E35]"
                    />
                  ))}
            </div>
          </div>
        )}

        {/* Expertise Tags */}
        {expertiseList.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-[#E5ECEE]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#526E77] block mb-2">
              Expertise
            </span>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {expertiseList.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#E8F2F4] text-[#086477]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Button: View on LinkedIn */}
        <div className="mt-6 flex items-center justify-between gap-3">
          {mentor.linkedInUrl ? (
            <a
              href={mentor.linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#086477] hover:bg-[#06505F] text-white text-xs font-semibold shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#086477]"
            >
              <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded bg-white text-[#086477] font-bold text-[9px] leading-none">
                in
              </span>
              <span>View on LinkedIn</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-xs text-[#526E77] italic">LinkedIn profile not available</span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#526E77] hover:text-[#172E35] hover:bg-[#E5ECEE] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
