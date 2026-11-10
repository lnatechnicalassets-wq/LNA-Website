"use client";

import React from "react";
import Image from "next/image";
import { X, ExternalLink } from "lucide-react";
import type { Mentor } from "@/lib/content";
import {
  formatMentorRoleWithCompany,
  getMentorAvatar,
  getMentorCompanyLogos,
} from "@/lib/mentors";
import { CompanyLogo, OfficialCompanyLogo } from "./company-logo";

export interface MentorQuickViewPanelProps {
  mentor: Mentor;
  onClose: () => void;
  className?: string;
}

export function MentorQuickViewPanel({
  mentor,
  onClose,
  className = "",
}: MentorQuickViewPanelProps) {
  const avatarSrc = getMentorAvatar(mentor);
  const companyLogos = getMentorCompanyLogos(mentor);
  const fallbackHistoryLogos =
    companyLogos.length === 0 ? (mentor.careerHistory ?? []) : [];
  const expertiseList = mentor.expertise || [
    "Growth Strategy",
    "Go-to-Market",
    "Scaling Teams",
    "Corporate Governance",
  ];

  return (
    <div
      role="region"
      aria-label={`Featured mentor spotlight: ${mentor.name}`}
      className={`relative w-[380px] xl:w-[410px] bg-[#FAF9F6] text-[#172E35] rounded-3xl p-6 shadow-2xl border border-white/80 transition-all duration-400 ease-out z-30 ${className}`}
    >
      {/* Top Header Row with Close Button */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4 flex-1 min-w-0">
          {/* Portrait Thumbnail */}
          <div className="relative w-24 h-28 xl:w-26 xl:h-30 rounded-2xl overflow-hidden bg-[#E8F2F4] ring-2 ring-white/95 shadow-md shrink-0">
            <Image
              src={avatarSrc}
              alt={mentor.name}
              fill
              sizes="110px"
              className="object-cover object-top"
            />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <h4 className="text-base xl:text-lg font-bold font-serif text-[#172E35] tracking-tight leading-snug">
              {mentor.name}
            </h4>
            <p className="text-xs font-semibold text-[#526E77] mt-0.5 leading-snug">
              {formatMentorRoleWithCompany(mentor)}
            </p>
            <p className="text-xs text-[#526E77] leading-relaxed mt-2 line-clamp-3">{mentor.bio}</p>
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close mentor spotlight"
          className="p-1 rounded-full text-[#526E77] hover:text-[#172E35] hover:bg-[#E5ECEE] transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#086477] cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Companies & Experience Section */}
      {(companyLogos.length > 0 || fallbackHistoryLogos.length > 0) && (
        <div className="mt-4 pt-3.5 border-t border-[#E5ECEE]">
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

      {/* Expertise Section */}
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

      {/* Bottom Action Bar */}
      <div className="mt-5 flex items-center justify-between gap-3">
        {mentor.linkedInUrl ? (
          <a
            href={mentor.linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#086477] hover:bg-[#06505F] text-white text-xs font-semibold shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#086477]"
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
      </div>
    </div>
  );
}
