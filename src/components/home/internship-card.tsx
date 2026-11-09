"use client";

import React from "react";
import { MapPin, Calendar, Clock } from "lucide-react";
import type { Internship } from "@/lib/content";
import { InternshipLogo } from "./internship-logo";

export interface InternshipCardProps {
  internship: Internship;
  isActive?: boolean;
  onSelect?: (internship: Internship) => void;
}

export function InternshipCard({ internship, isActive = false, onSelect }: InternshipCardProps) {
  const handleClick = () => {
    if (onSelect) {
      onSelect(internship);
    }
  };

  const allowance = internship.allowance?.displayText || "Allowance on request";

  return (
    <div
      tabIndex={0}
      role="button"
      data-testid="internship-card"
      data-internship-id={internship.id}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`group relative flex flex-col justify-between h-[510px] w-full rounded-2xl p-6 sm:p-7 bg-white focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#086477] focus-visible:ring-offset-2 transition-all duration-200 ease-out select-none cursor-pointer ${
        isActive
          ? "border-2 border-[#086477] bg-[#F2F8F9] shadow-md ring-1 ring-[#086477]/20"
          : "border border-[#E2ECEE] shadow-xs hover:border-[#086477]/60 hover:bg-[#F2F8F9] hover:shadow-md"
      }`}
    >
      <div>
        {/* 1. Original Company Logo Area (consistent height) */}
        <div className="h-10 flex items-center">
          <InternshipLogo company={internship.companyName} />
        </div>

        {/* 2. Small "INTERNSHIP" label */}
        <span className="block text-[11px] font-bold uppercase tracking-wider text-[#526E77] mt-5">
          INTERNSHIP
        </span>

        {/* 3. Actual role title */}
        <h3 className="text-[22px] sm:text-[24px] font-bold tracking-tight text-[#172E35] leading-snug mt-1">
          {internship.roleTitle}
        </h3>

        {/* 4. Company name */}
        <p className="text-sm font-medium text-[#526E77] mt-0.5">{internship.companyName}</p>

        {/* 5. Fine divider */}
        <div className="w-full h-px bg-[#E5ECEE] my-3.5" />

        {/* 6, 7, 8. Workplace, Schedule, Duration */}
        <div className="space-y-2 text-[13px] text-[#172E35]">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#526E77] shrink-0" strokeWidth={1.75} />
            <span className="font-medium truncate">{internship.workplace}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#526E77] shrink-0" strokeWidth={1.75} />
            <span className="font-medium truncate">{internship.schedule}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#526E77] shrink-0" strokeWidth={1.75} />
            <span className="font-medium truncate">{internship.duration}</span>
          </div>
        </div>

        {/* 9. Short description */}
        <p className="text-[13px] sm:text-[14px] text-[#526E77] leading-relaxed mt-3 line-clamp-2 min-h-[38px]">
          {internship.shortDescription}
        </p>
      </div>

      <div>
        {/* 10. Soft teal monthly allowance panel */}
        <div className="bg-[#E8F3F5] rounded-xl p-3 sm:p-3.5 mt-2">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#526E77]">
            MONTHLY ALLOWANCE
          </span>
          <span className="block text-[15px] sm:text-[17px] font-bold text-[#086477] mt-0.5 truncate">
            {allowance}
          </span>
        </div>

        {/* 11. Quiet "View details" action with plus icon */}
        <div className="flex items-center justify-between pt-3.5 text-sm font-semibold text-[#086477] group-hover:text-[#06505F] transition-colors">
          <span>View details</span>
          <span
            aria-hidden="true"
            className="w-5 h-5 rounded-full border border-[#086477]/40 flex items-center justify-center text-[#086477] text-xs font-bold leading-none transition-transform duration-200 group-hover:scale-110"
          >
            +
          </span>
        </div>
      </div>
    </div>
  );
}
