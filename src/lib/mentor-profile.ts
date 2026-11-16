import { z } from "zod";
import type { Mentor } from "@/lib/content";
import { mentorMediaKey, mentorMediaPath } from "./mentor-media";

export const mentorPreviewProvenance: Mentor["provenance"] = {
  class: "B",
  verified: false,
  source: "Staff preview",
  verifiedBy: null,
  verifiedOn: null,
};

const localAsset = /^\/images\/([a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(png|jpe?g|webp|avif|svg)$/;

export const linkedinProfile =
  /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_%.-]+\/?(\?[^#\s]*)?(#[^\s]*)?$/i;

export function isMentorAsset(value: string) {
  return (
    localAsset.test(value) ||
    (value.startsWith(mentorMediaPath) && mentorMediaKey.test(value.slice(mentorMediaPath.length)))
  );
}

export function parseMentorExpertise(value: string) {
  return [
    ...new Set(
      value
        .split(/[,\r\n]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];
}

export const mentorExpertise = z.array(z.string().min(1).max(80)).max(12);

export function publicMentorSource(row: {
  slug: string;
  name: string;
  role: string;
  organization: string;
  bio: string;
  portrait_src: string | null;
  company_logo_src: string | null;
  linkedin_url: string | null;
  expertise: string[];
  career_history: Mentor["careerHistory"];
}) {
  return {
    id: row.slug,
    name: row.name,
    role: row.role,
    organization: row.organization,
    bio: row.bio,
    portraitSrc: row.portrait_src && isMentorAsset(row.portrait_src) ? row.portrait_src : undefined,
    companyLogoSrc:
      row.company_logo_src && isMentorAsset(row.company_logo_src)
        ? row.company_logo_src
        : undefined,
    linkedInUrl:
      row.linkedin_url && linkedinProfile.test(row.linkedin_url) ? row.linkedin_url : undefined,
    expertise: row.expertise,
    careerHistory: row.career_history,
    published: true,
  };
}
