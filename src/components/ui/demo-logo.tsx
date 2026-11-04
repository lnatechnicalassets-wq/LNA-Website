import React from "react";

interface DemoLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  showTagline?: boolean;
  showDemoBadge?: boolean;
  className?: string;
  name?: string;
  shortName?: string;
  tagline?: string;
}

/**
 * Replaceable Demo Logo Component (Phase 2 Design System).
 * Provides an academic crest monogram lockup with accessible labeling.
 * Centrally configurable and replaceable once official brand assets are approved (Gate B0).
 */
export function DemoLogo({
  size = "md",
  showText = true,
  showTagline = false,
  showDemoBadge = true,
  className = "",
  name = "Lead Nation Academy",
  shortName = "LNA",
  tagline = "Empowering Tomorrow's Leaders",
}: DemoLogoProps) {
  const iconDimensions = {
    sm: { width: 32, height: 32, textSize: "text-base" },
    md: { width: 44, height: 44, textSize: "text-lg" },
    lg: { width: 56, height: 56, textSize: "text-2xl" },
  }[size];

  return (
    <div
      className={`inline-flex items-center gap-3 ${className}`}
      data-testid="demo-logo-container"
    >
      {/* Scalable Academic Shield SVG Monogram */}
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: iconDimensions.width, height: iconDimensions.height }}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm transition-transform duration-200"
          role="img"
          aria-label={`${name} Emblem`}
        >
          {/* Shield Outline */}
          <path
            d="M24 4L7 11V23.5C7 34.2 14.3 43.1 24 46C33.7 43.1 41 34.2 41 23.5V11L24 4Z"
            fill="var(--primary-800, #1e3a8a)"
            stroke="var(--accent-600, #d97706)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Inner Geometric Shield Accent */}
          <path
            d="M24 9L11 14.5V23.5C11 31.8 16.6 38.8 24 41.2C31.4 38.8 37 31.8 37 23.5V14.5L24 9Z"
            fill="var(--primary-900, #0f172a)"
            opacity="0.6"
          />
          {/* Monogram Letters */}
          <text
            x="24"
            y="28"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="11"
            fontWeight="800"
            letterSpacing="0.05em"
            fontFamily="var(--font-sans, sans-serif)"
          >
            {shortName}
          </text>
          {/* Accent Gold Star */}
          <polygon
            points="24,14 25.5,17 29,17.5 26.5,20 27,23.5 24,22 21,23.5 21.5,20 19,17.5 22.5,17"
            fill="var(--accent-400, #fbbf24)"
          />
        </svg>

        {/* Subtle Demo Indicator Dot */}
        {showDemoBadge && (
          <span
            className="absolute -bottom-1 -right-1 flex h-3 w-3"
            title="Demo Asset - Replaceable before launch"
          >
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-600" />
          </span>
        )}
      </div>

      {/* Typography Lockup */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span
              className={`font-bold tracking-tight text-primary-900 leading-tight ${
                size === "sm"
                  ? "text-sm"
                  : size === "lg"
                    ? "text-xl sm:text-2xl"
                    : "text-base sm:text-lg"
              }`}
            >
              {name}
            </span>
            {showDemoBadge && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-accent-100 text-accent-800 border border-accent-300">
                Demo
              </span>
            )}
          </div>
          {showTagline && (
            <span className="text-xs text-text-muted mt-0.5 line-clamp-1">{tagline}</span>
          )}
        </div>
      )}
    </div>
  );
}
