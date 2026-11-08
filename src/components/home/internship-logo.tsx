import React from "react";

export interface InternshipLogoProps {
  company: string;
  className?: string;
}

export function InternshipLogo({ company, className = "" }: InternshipLogoProps) {
  const normalized = company.toLowerCase().trim();

  if (normalized.includes("chaldal")) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Chaldal 3D Egg Icon */}
        <svg
          viewBox="0 0 32 38"
          className="w-7 h-8 shrink-0 drop-shadow-xs"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient
              id="chaldalEgg"
              cx="35%"
              cy="35%"
              r="65%"
              fx="25%"
              fy="25%"
            >
              <stop offset="0%" stopColor="#FFC875" />
              <stop offset="35%" stopColor="#FFA033" />
              <stop offset="75%" stopColor="#F26522" />
              <stop offset="100%" stopColor="#D94406" />
            </radialGradient>
          </defs>
          <ellipse
            cx="16"
            cy="20"
            rx="14"
            ry="18"
            fill="url(#chaldalEgg)"
            transform="rotate(-5 16 20)"
          />
        </svg>

        {/* Chaldal Wordmark + .com */}
        <div className="flex items-baseline">
          <span className="font-serif italic font-black text-2xl tracking-tight text-[#172E35]">
            Chaldal
          </span>
          <span className="text-[10px] font-bold text-[#E53935] ml-0.5 tracking-tighter">
            .com
          </span>
        </div>
      </div>
    );
  }

  if (normalized.includes("fylo")) {
    return (
      <div className={`flex items-center ${className}`}>
        {/* Fylo Clean Pill Badge */}
        <div className="px-3.5 py-1 rounded-full border-[1.5px] border-[#29A3B5] text-[#29A3B5] font-sans font-bold text-lg tracking-wider flex items-center justify-center">
          FYLO
        </div>
      </div>
    );
  }

  if (normalized.includes("dotlines")) {
    return (
      <div className={`flex items-center ${className}`}>
        {/* Dotlines Magenta Wordmark */}
        <div className="flex items-center">
          <div className="relative flex items-center">
            {/* Distinctive dot above d */}
            <span className="w-2.5 h-2.5 rounded-full bg-[#8E248D] mr-1 inline-block shrink-0" />
            <span className="font-sans font-bold text-2xl tracking-tight text-[#8E248D]">
              dotlines
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Fallback for other partner companies
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="w-3 h-3 rounded-full bg-[#086477]" />
      <span className="font-sans font-bold text-xl text-[#172E35]">{company}</span>
    </div>
  );
}

