"use client";

import React from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export interface CommunityBannerProps {
  memberCount?: string;
  onJoinClick?: () => void;
}

const COMMUNITY_AVATARS = [
  { src: "/images/learner-tanvir.jpg", alt: "Learner community member" },
  { src: "/images/learner-nusrat.jpg", alt: "Learner community member" },
  { src: "/images/learner-mahmudul.jpg", alt: "Learner community member" },
  { src: "/images/learner-sadia.jpg", alt: "Learner community member" },
];

export function CommunityBanner({ memberCount = "5,000+", onJoinClick }: CommunityBannerProps) {
  return (
    <div className="w-full max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 sm:mt-18 lg:mt-20">
      <div className="relative rounded-2xl md:rounded-full bg-gradient-to-r from-white/95 via-teal-50/45 to-white/90 backdrop-blur-xl border border-white/95 shadow-[0_16px_40px_-10px_rgba(8,100,119,0.12),0_0_0_1px_rgba(8,100,119,0.06)] py-5 sm:py-6 px-6 sm:px-10 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-6 transition-all duration-300 hover:shadow-[0_20px_45px_-8px_rgba(8,100,119,0.16)]">
        {/* Subtle specular top rim highlight */}
        <div
          className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-90 rounded-t-full pointer-events-none"
          aria-hidden="true"
        />

        {/* Left: Overlapping Learner Avatars */}
        <div className="flex items-center justify-center">
          <div className="flex items-center -space-x-2.5">
            {COMMUNITY_AVATARS.map((avatar, idx) => (
              <div
                key={idx}
                className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden ring-2 ring-white shadow-xs bg-teal-50 shrink-0"
              >
                <Image
                  src={avatar.src}
                  alt={avatar.alt}
                  fill
                  sizes="44px"
                  className="object-cover object-top"
                />
              </div>
            ))}
            {/* +5K Badge */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-teal-50 ring-2 ring-white shadow-xs flex items-center justify-center text-xs font-bold text-[#086477] shrink-0">
              +{memberCount.replace(/\+/g, "").replace(/,/g, "") === "5000" ? "5K" : memberCount}
            </div>
          </div>
        </div>

        {/* Center: Community Invitation Typography */}
        <div className="text-center md:text-left">
          <p className="text-base sm:text-lg lg:text-[19px] text-[#172E35] font-serif leading-snug">
            <span className="italic font-normal">Join a growing community of </span>
            <span className="font-bold font-serif not-italic text-[#172E35]">
              {memberCount} learners.
            </span>
          </p>
        </div>

        {/* Right: CTA Button */}
        <div className="w-full sm:w-auto flex justify-center">
          <button
            type="button"
            onClick={onJoinClick}
            aria-label="Join the Lead Nation Academy community"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-[#086477] hover:bg-[#075565] text-white text-sm font-semibold shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer focus-visible:ring-2 focus-visible:ring-[#086477] focus-visible:ring-offset-2"
          >
            <span>Join the Community</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
