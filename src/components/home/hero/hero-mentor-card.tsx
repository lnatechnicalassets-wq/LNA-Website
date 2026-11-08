"use client";

import React from "react";
import Image from "next/image";
import type { Mentor } from "@/lib/content";
import { getMentorAvatar } from "@/lib/mentors";

export interface HeroMentorCardProps {
  mentor: Mentor;
  onClick: (mentor: Mentor) => void;
  variant?: "mto" | "irgp";
  isFeatured?: boolean;
  priority?: boolean;
}

export function HeroMentorCard({
  mentor,
  onClick,
  variant = "mto",
  isFeatured = false,
}: HeroMentorCardProps) {
  const avatarSrc = getMentorAvatar(mentor);
  void isFeatured;

  if (variant === "irgp") {
    return (
      <button
        type="button"
        onClick={() => onClick(mentor)}
        aria-label={`View mentor profile: ${mentor.name}, ${mentor.role} at ${mentor.organization}`}
        className="group relative text-center transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5CE1E6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#086477] cursor-pointer overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-b from-[#084a57]/95 via-[#05333d]/98 to-[#021f24] hover:border-teal-300/70 hover:shadow-lg w-full h-[200px] sm:h-[215px] lg:h-[225px] xl:h-[235px] flex flex-col justify-between shadow-sm"
      >
        {/* Subtle top rim highlight */}
        <div
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-200/40 to-transparent pointer-events-none z-10"
          aria-hidden="true"
        />

        {/* 1. Upright portrait area (top ~58%) */}
        <div className="relative w-full h-[58%] overflow-hidden shrink-0 bg-[#021b20]">
          <Image
            src={avatarSrc}
            alt={mentor.name}
            fill
            priority
            loading="eager"
            sizes="(max-width: 640px) 160px, (max-width: 1024px) 180px, 220px"
            className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-px bg-white/10 pointer-events-none z-1"
            aria-hidden="true"
          />
        </div>

        {/* 2. Text area (bottom ~42%) */}
        <div className="w-full h-[42%] flex flex-col items-center justify-center text-center px-2.5 py-1.5 sm:py-2 bg-[#021f24] shrink-0">
          <h4 className="text-xs sm:text-[13.5px] lg:text-[14px] xl:text-[15px] font-bold text-white tracking-tight leading-tight group-hover:text-teal-200 transition-colors truncate max-w-full">
            {mentor.name}
          </h4>
          <p className="text-[11px] sm:text-xs xl:text-[13px] font-medium text-teal-200 leading-tight mt-1 line-clamp-1 max-w-full">
            {mentor.role}
          </p>
          <p className="text-[10px] sm:text-[11px] xl:text-[12px] text-teal-300/80 leading-tight mt-0.5 line-clamp-1 max-w-full">
            {mentor.organization}
          </p>
        </div>
      </button>
    );
  }

  // MTO Mentor Card:
  // - Upright portrait area (no slants, no overlapping, no glowing borders)
  // - Pearl caption area with dark, readable text
  // - Consistent dimensions, modest rounded corners, and subtle shadow
  return (
    <button
      type="button"
      onClick={() => onClick(mentor)}
      aria-label={`View mentor profile: ${mentor.name}, ${mentor.role} at ${mentor.organization}`}
      className="group relative text-center transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#086477] focus-visible:ring-offset-2 cursor-pointer overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-md shadow-[#086477]/10 hover:shadow-xl hover:border-[#086477]/30 hover:-translate-y-1.5 w-full h-[270px] sm:h-[285px] lg:h-[295px] xl:h-[305px] flex flex-col justify-between"
    >
      {/* 1. Upright Portrait Area (Top ~64%) */}
      <div className="relative w-full h-[64%] overflow-hidden shrink-0 bg-[#E8F4F5]">
        <Image
          src={avatarSrc}
          alt={mentor.name}
          fill
          priority
          loading="eager"
          sizes="(max-width: 640px) 160px, (max-width: 1024px) 180px, 220px"
          className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
        />
        {/* Subtle dividing border line outside photo */}
        <div
          className="absolute inset-x-0 bottom-0 h-px bg-[#E2EFF1] pointer-events-none z-1"
          aria-hidden="true"
        />
      </div>

      {/* 2. Pearl Caption Area (Bottom ~36%) with Dark Readable Text */}
      <div className="w-full h-[36%] flex flex-col items-center justify-center text-center bg-[#F6FAFA] px-2.5 py-2.5 shrink-0">
        <h4 className="text-xs sm:text-[13.5px] lg:text-[14px] xl:text-[15px] font-bold text-[#172E35] tracking-tight leading-tight group-hover:text-[#086477] transition-colors truncate max-w-full">
          {mentor.name}
        </h4>
        <p className="text-[11px] sm:text-xs xl:text-[13px] font-medium text-[#086477] leading-tight mt-1 line-clamp-1 max-w-full">
          {mentor.role}
        </p>
        <p className="text-[10px] sm:text-[11px] xl:text-[12px] text-[#5B7E87] leading-tight mt-0.5 line-clamp-1 max-w-full">
          {mentor.organization}
        </p>
      </div>
    </button>
  );
}
