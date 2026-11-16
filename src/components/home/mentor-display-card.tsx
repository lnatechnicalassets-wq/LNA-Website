import React from "react";
import Image from "next/image";
import { Info } from "lucide-react";
import type { Mentor } from "@/lib/content";
import { formatMentorRoleWithCompany, getMentorAvatar, getMentorCompanyLogos } from "@/lib/mentors";
import { mentorDisplayCopy, usesMentorMediaSource } from "@/lib/mentor-media";
import { CompanyLogo, OfficialCompanyLogo } from "./company-logo";

export function MentorDisplayCard({
  mentor,
  index = 0,
  active = true,
  priority = false,
  onInfo,
  onControlHover,
}: {
  mentor: Mentor;
  index?: number;
  active?: boolean;
  priority?: boolean;
  onInfo?: () => void;
  onControlHover?: (hovering: boolean) => void;
}) {
  const avatarSrc = getMentorAvatar(mentor, index);
  const companyLogos = getMentorCompanyLogos(mentor);
  const fallbackHistoryLogos =
    companyLogos.length === 0
      ? (mentor.careerHistory?.filter((item) => Boolean(item.logoIcon)).slice(0, 2) ?? [])
      : [];
  return (
    <>
      {/* Upper Portion: Fully Opaque Portrait with subtle specular glass sheen */}
      <div className="relative h-[240px] sm:h-[255px] xl:h-[270px] w-full bg-[#053A45] overflow-hidden">
        <Image
          src={avatarSrc}
          alt={mentor.name}
          fill
          priority={priority}
          unoptimized={usesMentorMediaSource(avatarSrc)}
          sizes="(max-width: 640px) 240px, (max-width: 1200px) 255px, 265px"
          className="object-cover object-top transition-transform duration-700 hover:scale-103"
        />

        {/* Subtle glass reflection highlight along top edge */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/20 via-white/5 to-transparent pointer-events-none"
        />

        {/* Explicit Info button replacing ambiguous '+' icon */}
        {onInfo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInfo();
            }}
            onMouseEnter={() => onControlHover?.(true)}
            onMouseLeave={() => onControlHover?.(false)}
            aria-label={mentorDisplayCopy.infoFor(mentor.name)}
            className={`absolute top-3 right-3 inline-flex items-center gap-1 rounded-full border backdrop-blur-xs font-semibold transition-all shadow-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477] ${
              active
                ? "px-2.5 py-1 text-[11px] bg-white/90 hover:bg-white text-[#086477] border-white ring-1 ring-white/50"
                : "px-2 py-0.5 text-[10px] bg-white/80 hover:bg-white text-[#086477] border-white/75"
            }`}
          >
            <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>{mentorDisplayCopy.info}</span>
          </button>
        )}
      </div>

      {/* Lower Portion: Solid Cream-White Glass Foundation (100% Opaque) */}
      <div className="px-3.5 py-3 sm:px-4 sm:py-3.5 flex flex-col justify-between gap-2 h-[160px] sm:h-[165px] xl:h-[170px] bg-[#FAF9F6] border-t border-white/50">
        <div className="min-w-0">
          <h3 className="text-[13px] sm:text-sm xl:text-[15px] font-bold font-serif text-[#172E35] tracking-tight leading-snug line-clamp-2">
            {mentor.name}
          </h3>
          <p className="text-[10.5px] sm:text-[11px] font-medium text-[#526E77] mt-0.5 leading-[1.35] line-clamp-3">
            {formatMentorRoleWithCompany(mentor)}
          </p>
        </div>

        {/* Company Logos Only (Official Corporate Marks) */}
        {companyLogos.length > 0 ? (
          <div className="pt-2 border-t border-[#E5ECEE] flex items-center gap-3 min-h-[42px] sm:min-h-[46px]">
            {companyLogos.slice(0, 2).map((logo) => (
              <OfficialCompanyLogo
                key={logo.src}
                src={logo.src}
                alt={logo.alt}
                size="card"
                compact={companyLogos.length > 1}
              />
            ))}
          </div>
        ) : (
          fallbackHistoryLogos.length > 0 && (
            <div className="pt-2 border-t border-[#E5ECEE] flex items-center gap-3 min-h-[42px] sm:min-h-[46px]">
              {fallbackHistoryLogos.map((item, idx) => (
                <CompanyLogo
                  key={idx}
                  name={item.company}
                  logoIcon={item.logoIcon}
                  iconOnly
                  className="text-[#172E35]"
                />
              ))}
            </div>
          )
        )}
      </div>
    </>
  );
}
