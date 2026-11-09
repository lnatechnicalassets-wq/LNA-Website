import React from "react";

export interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "crest" | "full" | "mark";
  inverted?: boolean;
  showText?: boolean;
  showTagline?: boolean;
  showDemoBadge?: boolean;
  className?: string;
  name?: string;
  shortName?: string;
  tagline?: string;
}

/**
 * Authentic Lead Nation Academy Brand Logo Component.
 * Uses official brand assets: circular crest emblem and typography.
 * Supports light backgrounds (nav), dark backgrounds (footer via inverted),
 * and maintains backward-compatibility aliases.
 */
export function BrandLogo({
  size = "md",
  variant = "crest",
  inverted = false,
  showText = true,
  showTagline = false,
  className = "",
  name = "Lead Nation Academy",
  tagline = "Empowering Tomorrow's Leaders",
}: BrandLogoProps) {
  // Dimensions for crest emblem
  const crestDimensions = {
    sm: "h-8 w-auto",
    md: "h-10 sm:h-11 w-auto",
    lg: "h-14 sm:h-16 w-auto",
  }[size];

  // Dimensions for full logo graphic
  const fullDimensions = {
    sm: "h-9 w-auto",
    md: "h-12 sm:h-13 w-auto",
    lg: "h-16 sm:h-20 w-auto",
  }[size];

  const textClasses = {
    sm: "text-sm sm:text-base",
    md: "text-base sm:text-lg",
    lg: "text-xl sm:text-2xl",
  }[size];

  if (variant === "full") {
    return (
      <div className={`inline-flex items-center ${className}`} data-testid="demo-logo-container">
        <img
          src={inverted ? "/images/brand/logo-white.png" : "/images/brand/logo.png"}
          alt={name}
          className={`${fullDimensions} object-contain select-none`}
        />
      </div>
    );
  }

  const crestSrc = inverted ? "/images/brand/logo-crest-white.png" : "/images/brand/logo-crest.png";

  return (
    <div
      className={`inline-flex items-center gap-2.5 sm:gap-3 ${className}`}
      data-testid="demo-logo-container"
    >
      {/* Official Circular Crest Emblem */}
      <img
        src={crestSrc}
        alt={`${name} Emblem`}
        className={`${crestDimensions} object-contain shrink-0 select-none`}
      />

      {/* Brand Typography Lockup */}
      {showText && (
        <div className="flex flex-col">
          <span
            className={`font-heading font-black tracking-tight leading-tight select-none ${
              inverted ? "text-white" : "text-[#073A44]"
            } ${textClasses}`}
          >
            {name}
          </span>
          {showTagline && (
            <span
              className={`text-xs select-none mt-0.5 line-clamp-1 ${
                inverted ? "text-[#C5E2E5]" : "text-text-muted"
              }`}
            >
              {tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Backward-compatibility alias for existing imports
export const DemoLogo = BrandLogo;
