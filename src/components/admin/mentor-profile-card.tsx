import React from "react";
import Image from "next/image";
import { UserRound } from "lucide-react";
import { type StaffMentorCard } from "@/lib/admin-people";
import { isMentorAsset } from "@/lib/mentor-profile";
import { getMentorCompanyLogo } from "@/lib/mentors";

export function MentorProfileCard({
  mentor,
  children,
}: {
  mentor: StaffMentorCard;
  children?: React.ReactNode;
}) {
  const photo =
    mentor.portrait_src && isMentorAsset(mentor.portrait_src) ? mentor.portrait_src : null;
  const logo =
    mentor.company_logo_src && isMentorAsset(mentor.company_logo_src)
      ? { src: mentor.company_logo_src, alt: mentor.organization }
      : getMentorCompanyLogo({ id: mentor.slug, organization: mentor.organization });

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border-subtle bg-surface-card p-3">
      <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-100 text-primary-800">
        {photo ? (
          <Image src={photo} alt="" fill sizes="56px" className="object-cover" unoptimized />
        ) : (
          <UserRound aria-hidden="true" className="size-6" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-semibold text-primary-900">{mentor.name}</p>
        <p className="break-words text-xs text-text-secondary">{mentor.role}</p>
        {logo ? (
          <Image
            src={logo.src}
            alt={logo.alt}
            width={88}
            height={25}
            className="mt-1.5 h-6 w-auto max-w-24 object-contain object-left"
            unoptimized
          />
        ) : (
          <p className="break-words text-xs text-text-secondary">{mentor.organization}</p>
        )}
      </div>
      {children}
    </div>
  );
}
