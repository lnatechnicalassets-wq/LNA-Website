import React from "react";

export interface CompanyLogoProps {
  name: string;
  logoIcon?: string;
  className?: string;
  iconOnly?: boolean;
}

export function CompanyLogo({
  name,
  logoIcon,
  className = "",
  iconOnly = false,
}: CompanyLogoProps) {
  const iconKey = (logoIcon || name).toLowerCase().replace(/[^a-z0-9]/g, "");
  const compKey = (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const renderIcon = () => {
    // Specific match by company name first if present
    if (compKey.includes("brac")) {
      return (
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16">
          <rect x="1" y="1" width="14" height="14" rx="3" fill="#E40046" />
          <rect x="4" y="4" width="8" height="8" rx="1.5" fill="#FAF9F6" />
        </svg>
      );
    }
    if (compKey.includes("citybank") || compKey === "city") {
      return (
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16">
          <rect x="1" y="1" width="14" height="14" rx="2.5" fill="#E31B23" />
          <rect x="5" y="5" width="6" height="6" transform="rotate(45 8 8)" fill="#FAF9F6" />
        </svg>
      );
    }
    if (compKey.includes("leadnation") || compKey === "lna") {
      return (
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1.5 L14 4.5 V9 C14 12.5 8 15 8 15 C8 15 2 12.5 2 9 V4.5 Z" fill="#086477" />
          <polygon points="8,5 11,10 5,10" fill="#FAF9F6" />
        </svg>
      );
    }
    if (compKey.includes("pathao")) {
      return (
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 13 C4 5 11 3 15 3 C12 7 9 10 2 13 Z" fill="#EE2A24" />
        </svg>
      );
    }
    if (compKey === "bat" || compKey.includes("britishamerican")) {
      return (
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16">
          <polygon points="8,1 15,14 1,14" fill="#001E62" />
          <line x1="4" y1="10" x2="12" y2="10" stroke="#DB0011" strokeWidth="2" />
        </svg>
      );
    }
    if (compKey.includes("modhumoti")) {
      return (
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="7" fill="#00843D" />
          <path d="M8 4 C6 6 5 9 8 12 C11 9 10 6 8 4 Z" fill="#E40046" />
        </svg>
      );
    }
    if (compKey.includes("akij")) {
      return (
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16">
          <polygon points="8,1 14.5,4.75 14.5,12.25 8,16 1.5,12.25 1.5,4.75" fill="#C4161C" />
          <circle cx="8" cy="8" r="3" fill="#FAF9F6" />
        </svg>
      );
    }
    if (compKey.includes("aventec") || compKey.includes("robi")) {
      return (
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16">
          <polygon points="8,2 14,8 8,14 2,8" fill="#F37023" />
          <polygon points="8,2 14,8 8,8" fill="#ED1C24" />
          <polygon points="2,8 8,8 8,14" fill="#00A0E3" />
        </svg>
      );
    }
    if (compKey.includes("sheba")) {
      return (
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="7" fill="#7C2A90" />
          <polygon points="8,3 9.5,6.5 13,8 9.5,9.5 8,13 6.5,9.5 3,8 6.5,6.5" fill="#FAF9F6" />
        </svg>
      );
    }
    if (compKey.includes("courier")) {
      return (
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16">
          <rect x="1" y="2" width="14" height="12" rx="2" fill="#E51937" />
          <path d="M5 8 L10 5 V7 H12 V9 H10 V11 Z" fill="#FAF9F6" />
        </svg>
      );
    }
    if (compKey.includes("chaldal")) {
      return (
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16">
          <rect x="2" y="5" width="12" height="9" rx="2" fill="#FFA500" />
          <path d="M5 5 C5 2.5 11 2.5 11 5" stroke="#FAF9F6" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      );
    }
    if (compKey.includes("brandgear")) {
      return (
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6.5" fill="#086477" />
          <circle cx="8" cy="8" r="3.5" fill="#FAF9F6" />
          <circle cx="8" cy="8" r="1.5" fill="#086477" />
        </svg>
      );
    }

    switch (iconKey) {
      case "nexora":
        return (
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <polygon points="8,2 14,14 2,14" opacity="0.9" />
            <polygon points="8,5 12,13 4,13" fill="#FAF9F6" />
          </svg>
        );
      case "brightcore":
        return (
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <rect x="2" y="3" width="2.5" height="10" rx="1.2" transform="rotate(-20 3 8)" />
            <rect x="6.5" y="3" width="2.5" height="10" rx="1.2" transform="rotate(-20 7.5 8)" />
            <rect x="11" y="3" width="2.5" height="10" rx="1.2" transform="rotate(-20 12 8)" />
          </svg>
        );
      case "vellum":
        return (
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3 2 L8 14 L13 2 L10 2 L8 8 L6 2 Z" />
          </svg>
        );
      case "strideworks":
        return (
          <svg className="w-4 h-3.5 shrink-0" viewBox="0 0 18 16" fill="currentColor">
            <ellipse cx="6" cy="8" rx="4.5" ry="3.5" transform="rotate(-15 6 8)" opacity="0.85" />
            <ellipse cx="12" cy="8" rx="4.5" ry="3.5" transform="rotate(15 12 8)" opacity="0.95" />
          </svg>
        );
      case "crestline":
        return (
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <rect x="2" y="8" width="5" height="6" rx="1" />
            <rect x="9" y="3" width="5" height="11" rx="1" />
          </svg>
        );
      case "pivona":
        return (
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3 12 C3 6 8 3 13 3 C13 9 8 12 3 12 Z" opacity="0.9" />
          </svg>
        );
      case "arcview":
        return (
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M2 13 C4 6 10 3 14 3 L14 5 C11 5 6 8 4 13 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        );
      case "novaris":
        return (
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M3 5 L8 8 L13 5 M3 8 L8 11 L13 8 M3 11 L8 14 L13 11"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case "airbnb":
        return (
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="#FF5A5F">
            <path d="M12 2C8.8 2 6.5 4.4 6.5 7.4c0 3.6 3.7 8.5 5 10.1.3.4.8.4 1 0 1.3-1.6 5-6.5 5-10.1 0-3-2.3-5.4-5.5-5.4zm0 8.2c-1.5 0-2.8-1.2-2.8-2.8s1.2-2.8 2.8-2.8 2.8 1.2 2.8 2.8-1.2 2.8-2.8 2.8z" />
          </svg>
        );
      case "microsoft":
        return (
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16">
            <rect x="1" y="1" width="6.5" height="6.5" fill="#F25022" />
            <rect x="8.5" y="1" width="6.5" height="6.5" fill="#7FBA00" />
            <rect x="1" y="8.5" width="6.5" height="6.5" fill="#00A4EF" />
            <rect x="8.5" y="8.5" width="6.5" height="6.5" fill="#FFB900" />
          </svg>
        );
      case "google":
        return (
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16">
            <path
              d="M15.5 8.2c0-.6-.05-1.1-.15-1.7H8v3.2h4.2c-.2 1-.7 1.8-1.5 2.4v2h2.5c1.4-1.3 2.3-3.3 2.3-5.9z"
              fill="#4285F4"
            />
            <path
              d="M8 16c2.2 0 4-0.7 5.3-2l-2.5-2c-.7.5-1.7.8-2.8.8-2.1 0-4-1.4-4.6-3.4H.8v2.1C2.1 14.2 4.8 16 8 16z"
              fill="#34A853"
            />
            <path
              d="M3.4 9.4c-.1-.5-.2-1-.2-1.4s.1-.9.2-1.4V4.5H.8C.3 5.5 0 6.7 0 8s.3 2.5.8 3.5l2.6-2.1z"
              fill="#FBBC05"
            />
            <path
              d="M8 3.2c1.2 0 2.2.4 3 1.2l2.3-2.3C11.9.9 10.1 0 8 0 4.8 0 2.1 1.8.8 4.5l2.6 2.1C4 4.6 5.9 3.2 8 3.2z"
              fill="#EA4335"
            />
          </svg>
        );
      case "bcg":
        return (
          <span className="font-extrabold text-[#00875A] tracking-tight text-xs sm:text-[13px] leading-none shrink-0 font-sans">
            BCG
          </span>
        );
      case "hsbc":
        return (
          <svg className="w-4 h-3.5 shrink-0" viewBox="0 0 24 16">
            <polygon points="0,0 8,8 0,16" fill="#DB0011" />
            <polygon points="24,0 16,8 24,16" fill="#DB0011" />
            <polygon points="4,0 12,8 20,0" fill="#DB0011" />
            <polygon points="4,16 12,8 20,16" fill="#DB0011" />
          </svg>
        );
      case "bank":
        return (
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2 L14 5 V7 H2 V5 Z M3 8 H5 V12 H3 Z M7 8 H9 V12 H7 Z M11 8 H13 V12 H11 Z M2 13 H14 V14 H2 Z" />
          </svg>
        );
      default:
        return (
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="8" r="4" opacity="0.8" />
          </svg>
        );
    }
  };

  const isAirbnb = iconKey === "airbnb";
  const isBcg = iconKey === "bcg";

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {renderIcon()}
      {!iconOnly && !isBcg && (
        <span
          className={`text-[11px] sm:text-xs font-bold tracking-tight whitespace-nowrap ${
            isAirbnb ? "text-[#FF5A5F]" : "text-inherit"
          }`}
        >
          {name}
        </span>
      )}
    </div>
  );
}
