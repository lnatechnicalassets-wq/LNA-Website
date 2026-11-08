"use client";

import React from "react";
import Image from "next/image";
import type { Mentor } from "@/lib/content";
import { getMentorAvatar } from "@/lib/mentors";
import { CompanyLogo } from "../company-logo";

export interface HeroMentorCardProps {
  mentor: Mentor;
  onClick: (mentor: Mentor) => void;
  variant?: "mto" | "irgp";
  isFeatured?: boolean;
  priority?: boolean;
}

// Calibrated per-mentor vertical portrait centering for complete faces and headroom
const MENTOR_PORTRAIT_POSITIONS: Record<string, string> = {
  // IRGP Mentors
  "mentor-shahnawaj-chowdhury": "center 18%",
  "mentor-gm-kamrul": "center 14%",
  "mentor-istiaque-bhuiyan": "center 16%",
  "mentor-munaf-chowdhury": "center 15%",
  "mentor-ilmul-sajib": "center 16%",
  "mentor-biplob-rahul": "center 14%",
  "mentor-zia-ashraf": "center 18%",
  "mentor-sayeda-salma": "center 14%",

  // MTO Mentors
  "mentor-arif-rahman": "center 4%",
  "mentor-tanvir-hossain": "center 2%",
  "mentor-mir-hasib": "center 4%",
  "mentor-fahim-ahmed": "center 3%",
  "mentor-sayem-chowdhury": "center 4%",
};

export function HeroMentorCard({
  mentor,
  onClick,
  variant = "mto",
  isFeatured = false,
  priority = false,
}: HeroMentorCardProps) {
  const avatarSrc = getMentorAvatar(mentor);
  const objectPos = MENTOR_PORTRAIT_POSITIONS[mentor.id] || "center 16%";

  // Resolve primary company name and logoIcon from mentor career history or organization
  const primaryHistory = mentor.careerHistory?.[0];
  const companyName =
    primaryHistory?.company ||
    mentor.organization.split(",")[0].split("·")[0].trim();
  const logoIcon = primaryHistory?.logoIcon || companyName;

  return (
    <button
      type="button"
      onClick={() => onClick(mentor)}
      aria-label={`View mentor profile: ${mentor.name} at ${companyName}`}
      className={`group relative flex flex-col items-center text-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#086477] focus-visible:ring-offset-2 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 w-full ${
        isFeatured ? "lg:scale-[1.03] z-10" : "z-0"
      }`}
    >
      {/* 1. Angled Portrait Unit with Offset Teal Backing Layer */}
      <div
        className={`relative w-full ${
          variant === "mto"
            ? "h-[108px] sm:h-[114px] lg:h-[116px] xl:h-[124px]"
            : "h-[102px] sm:h-[110px] lg:h-[110px] xl:h-[118px]"
        }`}
      >
        {/* A. Offset Teal Backing Layer (Peeks from behind on the left/bottom with matching angle) */}
        <div
          className="absolute inset-0 translate-x-[-3px] translate-y-[3px] sm:translate-x-[-4px] sm:translate-y-[4px] bg-[#053D47]/90 rounded-md pointer-events-none transition-transform duration-300 group-hover:translate-x-[-5px] group-hover:translate-y-[5px]"
          style={{
            clipPath: "polygon(14% 0%, 100% 0%, 86% 100%, 0% 100%)",
          }}
          aria-hidden="true"
        />

        {/* B. Angled Pearl Photo Panel */}
        <div
          className="relative w-full h-full bg-[#FFFFFF] shadow-xs overflow-hidden rounded-md border border-white/70"
          style={{
            clipPath: "polygon(14% 0%, 100% 0%, 86% 100%, 0% 100%)",
          }}
        >
          {/* Upright Mentor Photo (Faces, foreheads, and chins remain completely visible and upright) */}
          <Image
            src={avatarSrc}
            alt={mentor.name}
            fill
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            sizes="(max-width: 640px) 150px, (max-width: 1024px) 200px, 240px"
            style={{ objectPosition: objectPos }}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Subtle top sheen */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-white/10 pointer-events-none"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* 2. Separate Pearl Nameplate with Mentor Name & Company Logo */}
      <div className="relative z-10 -mt-3.5 sm:-mt-4 w-[96%] sm:w-[94%] bg-[#FFFFFF]/98 group-hover:bg-white backdrop-blur-xs border border-[#D5E5E8] rounded-xl shadow-xs group-hover:shadow-md group-hover:border-[#086477]/40 px-2 py-1.5 sm:px-2.5 sm:py-2 xl:px-3 xl:py-2 transition-all duration-300 min-h-[44px] sm:min-h-[46px] lg:min-h-[46px] xl:min-h-[48px] flex flex-col items-center justify-center text-center">
        {/* 1. Mentor Name: Bold Dark Ink */}
        <h4 className="text-[12px] sm:text-[12.5px] lg:text-[13px] xl:text-[13.5px] font-bold text-[#172E35] leading-snug tracking-tight group-hover:text-[#086477] transition-colors whitespace-nowrap">
          {mentor.name}
        </h4>

        {/* 2. Company Logo: Brand Mark Icon + Prominent Company Name */}
        <div className="mt-1 flex items-center justify-center max-w-full overflow-hidden">
          <CompanyLogo
            name={companyName}
            logoIcon={logoIcon}
            className="text-[#086477] font-bold"
          />
        </div>
      </div>
    </button>
  );
}
