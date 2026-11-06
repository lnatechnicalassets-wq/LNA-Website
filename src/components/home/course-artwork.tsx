import React from "react";

export interface CourseArtworkProps {
  className?: string;
  variant?: "default" | "warm" | "cool";
}

/**
 * CourseArtwork: Reusable code-based inline SVG visual system.
 * Designed with a 480px vertical coordinate space (viewBox="0 0 180 480") matching
 * the fixed card height, providing a seamless full-height curved editorial mask,
 * atmospheric teal gradients, cantilevered floating perspective staircase with architectural depth,
 * and a minimal executive human silhouette at the summit bathed in radiant dawn light.
 * 100% deterministic, zero heavy dependencies.
 */
export function CourseArtwork({ className = "", variant = "default" }: CourseArtworkProps) {
  const maskId = `artwork-mask-${variant}`;
  const skyGradId = `artwork-sky-${variant}`;
  const glowGradId = `artwork-glow-${variant}`;
  const treadGradId = `artwork-tread-${variant}`;
  const shadowGradId = `artwork-shadow-${variant}`;

  return (
    <div
      className={`relative pointer-events-none select-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 180 480"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        preserveAspectRatio="xMaxYMid slice"
      >
        <defs>
          {/* Curved Editorial Mask: Keeps content safe on the left, curving seamlessly along the right quadrant from top to bottom */}
          <clipPath id={maskId}>
            <path d="M180 0 C160 40 135 110 115 180 C95 260 76 345 72 405 C68 445 95 470 135 480 L180 480 Z" />
          </clipPath>

          {/* Deep Architectural Sky Gradient */}
          <linearGradient
            id={skyGradId}
            x1="110"
            y1="20"
            x2="160"
            y2="480"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#80D3DE" />
            <stop offset="25%" stopColor="#2E92A2" />
            <stop offset="60%" stopColor="#086477" />
            <stop offset="100%" stopColor="#02242B" />
          </linearGradient>

          {/* Radiant Dawn Aura / Summit Halo */}
          <radialGradient id={glowGradId} cx="144" cy="115" r="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="25%" stopColor="#C8EFF4" stopOpacity="0.75" />
            <stop offset="55%" stopColor="#0E7D93" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#086477" stopOpacity="0" />
          </radialGradient>

          {/* Cantilevered Staircase Tread Gradient (Illuminated Surface) */}
          <linearGradient
            id={treadGradId}
            x1="65"
            y1="400"
            x2="150"
            y2="140"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#148096" />
            <stop offset="45%" stopColor="#2BB0C7" />
            <stop offset="100%" stopColor="#9DE4ED" />
          </linearGradient>

          {/* Architectural Ambient Occlusion Shadow */}
          <linearGradient id={shadowGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#021B21" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#021B21" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Group with Editorial Mask */}
        <g clipPath={`url(#${maskId})`}>
          {/* Sky / Atmospheric Background */}
          <rect width="180" height="480" fill={`url(#${skyGradId})`} />

          {/* Soft Directional Light Stream from Summit */}
          <polygon
            points="144,115 72,420 180,470 180,240"
            fill="#FFFFFF"
            fillOpacity="0.1"
            className="transition-opacity duration-500 group-hover:fill-opacity-18"
          />

          {/* Radiant Summit Halo */}
          <circle cx="144" cy="115" r="75" fill={`url(#${glowGradId})`} />
          <circle
            cx="144"
            cy="115"
            r="28"
            fill="#FFFFFF"
            fillOpacity="0.45"
            className="transition-opacity duration-500 group-hover:fill-opacity-65"
          />

          {/* Distant Atmospheric Mist Layer */}
          <path
            d="M72 290 Q120 260 180 270 L180 340 Q125 330 72 345 Z"
            fill="#C5E2E5"
            fillOpacity="0.18"
          />

          {/* Cantilevered Floating Staircase (6 Sleek Architectural Steps) */}

          {/* Step 1 */}
          <polygon points="70,390 104,378 140,390 106,402" fill={`url(#${shadowGradId})`} />
          <polygon
            points="68,384 102,372 138,384 104,396"
            fill={`url(#${treadGradId})`}
            fillOpacity="0.88"
          />
          <path d="M68 384 L104 396" stroke="#BCEBF0" strokeWidth="1" strokeOpacity="0.8" />
          <polygon points="68,384 104,396 104,401 68,389" fill="#042730" fillOpacity="0.9" />
          <polygon points="104,396 138,384 138,389 104,401" fill="#073B47" fillOpacity="0.85" />

          {/* Step 2 */}
          <polygon points="82,348 114,337 148,349 116,360" fill={`url(#${shadowGradId})`} />
          <polygon
            points="80,342 112,331 146,343 114,354"
            fill={`url(#${treadGradId})`}
            fillOpacity="0.9"
          />
          <path d="M80 342 L114 354" stroke="#BCEBF0" strokeWidth="1" strokeOpacity="0.85" />
          <polygon points="80,342 114,354 114,359 80,347" fill="#042730" fillOpacity="0.9" />
          <polygon points="114,354 146,343 146,348 114,359" fill="#073B47" fillOpacity="0.85" />

          {/* Step 3 */}
          <polygon points="94,306 124,296 156,307 126,317" fill={`url(#${shadowGradId})`} />
          <polygon
            points="92,300 122,290 154,301 124,312"
            fill={`url(#${treadGradId})`}
            fillOpacity="0.92"
          />
          <path d="M92 300 L124 312" stroke="#C8F1F5" strokeWidth="1" strokeOpacity="0.9" />
          <polygon points="92,300 124,312 124,317 92,305" fill="#042730" fillOpacity="0.9" />
          <polygon points="124,312 154,301 154,306 124,317" fill="#073B47" fillOpacity="0.85" />

          {/* Step 4 */}
          <polygon points="106,264 134,255 164,265 136,274" fill={`url(#${shadowGradId})`} />
          <polygon
            points="104,258 132,249 162,259 134,269"
            fill={`url(#${treadGradId})`}
            fillOpacity="0.94"
          />
          <path d="M104 258 L134 269" stroke="#D2F6FA" strokeWidth="1" strokeOpacity="0.92" />
          <polygon points="104,258 134,269 134,274 104,263" fill="#042730" fillOpacity="0.9" />
          <polygon points="134,269 162,259 162,264 134,274" fill="#073B47" fillOpacity="0.85" />

          {/* Step 5 */}
          <polygon points="118,222 144,214 170,223 146,231" fill={`url(#${shadowGradId})`} />
          <polygon
            points="116,216 142,208 168,217 144,226"
            fill={`url(#${treadGradId})`}
            fillOpacity="0.97"
          />
          <path d="M116 216 L144 226" stroke="#E0FBFC" strokeWidth="1.2" strokeOpacity="0.95" />
          <polygon points="116,216 144,226 144,231 116,221" fill="#042730" fillOpacity="0.9" />
          <polygon points="144,226 168,217 168,222 144,231" fill="#073B47" fillOpacity="0.85" />

          {/* Step 6 / Summit Platform */}
          <polygon points="128,180 152,173 176,181 154,188" fill={`url(#${shadowGradId})`} />
          <polygon points="126,174 150,167 174,175 152,182" fill="#B2EEF5" />
          <path d="M126 174 L152 182" stroke="#FFFFFF" strokeWidth="1.4" strokeOpacity="0.95" />
          <polygon points="126,174 152,182 152,187 126,179" fill="#042730" />
          <polygon points="152,182 174,175 174,180 152,187" fill="#073B47" />

          {/* Dignified Executive Human Silhouette standing at Summit Platform */}
          <g className="transition-transform duration-500 ease-out group-hover:-translate-y-1">
            {/* Ambient Backlight Rim */}
            <circle cx="148" cy="144" r="4.5" fill="#FFFFFF" fillOpacity="0.35" />

            {/* Head */}
            <circle cx="148" cy="144" r="3.4" fill="#172E35" />

            {/* Neck & Collar */}
            <rect x="147.2" y="147.5" width="1.6" height="2" fill="#172E35" />

            {/* Tailored Executive Blazer & Torso */}
            <path
              d="M144.5 149.5 C145.4 148.5 150.6 148.5 151.5 149.5 L153 163 C151.5 163.5 144.5 163.5 143 163 Z"
              fill="#172E35"
            />

            {/* Trousers / Legs */}
            <path
              d="M145.5 163 L145.5 174 M150.5 163 L150.5 174"
              stroke="#172E35"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </g>

          {/* Floating Stair Edge Accent Glow */}
          <path
            d="M68 384 L80 342 L92 300 L104 258 L116 216 L126 174"
            stroke="#C5E2E5"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.5"
            className="transition-opacity duration-500 group-hover:stroke-opacity-90"
          />
        </g>

        {/* Outer Mask Contour Glow (Seamless Curve Accent) */}
        <path
          d="M180 0 C160 40 135 110 115 180 C95 260 76 345 72 405 C68 445 95 470 135 480"
          stroke="#C5E2E5"
          strokeWidth="1.5"
          strokeOpacity="0.35"
          fill="none"
          className="transition-all duration-500 group-hover:stroke-white group-hover:stroke-opacity-65"
        />
      </svg>
    </div>
  );
}
