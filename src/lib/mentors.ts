import type { Mentor } from "@/lib/content";

const mentorAvatars: Record<string, string> = {
  // MTO Mentors (5)
  "mentor-mohammad-salekeen-ibrahim": "/images/mentors/mohammad-salekeen-ibrahim.png",
  "mentor-salekeen-ibrahim": "/images/mentors/mohammad-salekeen-ibrahim.png",
  "mentor-syed-himyanuddin-ahmed": "/images/mentors/syed-himyanuddin-ahmed.png",
  "mentor-himyanuddin-ahmed": "/images/mentors/syed-himyanuddin-ahmed.png",
  "mentor-anubhab-rahman": "/images/mentors/anubhab-rahman-v3.png",
  "mentor-md-manik-hossain": "/images/mentors/md-manik-hossain.png",
  "mentor-manik-hossain": "/images/mentors/md-manik-hossain.png",
  "mentor-mir-hasib": "/images/mentors/mir-hasib.png",

  // IRGP Mentors (10)
  "mentor-shahnawaj-chowdhury": "/images/mentors/shahnawaj-chowdhury.png",
  "mentor-gm-kamrul": "/images/mentors/gm-kamrul.png",
  "mentor-istiaque-bhuiyan": "/images/mentors/istiaque-bhuiyan.png",
  "mentor-munaf-chowdhury": "/images/mentors/munaf-chowdhury.png",
  "mentor-ilmul-sajib": "/images/mentors/ilmul-sajib.png",
  "mentor-biplob-rahul": "/images/mentors/biplob-rahul.png",
  "mentor-zia-ashraf": "/images/mentors/zia-ashraf.png",
  "mentor-sayeda-salma": "/images/mentors/sayeda-salma.png",
  "mentor-zeeshan-huq": "/images/mentors/zeeshan-huq.png",
  "mentor-talat-rahim": "/images/mentors/talat-rahim.png",
};

const defaultAvatars = [
  "/images/mentors/mir-hasib.png",
  "/images/mentors/anubhab-rahman.png",
  "/images/mentors/syed-himyanuddin-ahmed.png",
  "/images/mentors/mohammad-salekeen-ibrahim.png",
  "/images/mentors/md-manik-hossain.png",
];

export function getMentorAvatar(
  mentor: { id: string; portraitSrc?: string },
  index: number = 0
): string {
  if (mentor.portraitSrc) return mentor.portraitSrc;
  if (mentorAvatars[mentor.id]) return mentorAvatars[mentor.id];
  return defaultAvatars[index % defaultAvatars.length];
}

const defaultCourseMentorIds: Record<string, string[]> = {
  "mto-readiness": [
    "mentor-mohammad-salekeen-ibrahim",
    "mentor-syed-himyanuddin-ahmed",
    "mentor-anubhab-rahman",
    "mentor-md-manik-hossain",
    "mentor-mir-hasib",
  ],
  "mto": [
    "mentor-mohammad-salekeen-ibrahim",
    "mentor-syed-himyanuddin-ahmed",
    "mentor-anubhab-rahman",
    "mentor-md-manik-hossain",
    "mentor-mir-hasib",
  ],
  "irgp": [
    "mentor-shahnawaj-chowdhury",
    "mentor-gm-kamrul",
    "mentor-istiaque-bhuiyan",
    "mentor-munaf-chowdhury",
    "mentor-ilmul-sajib",
    "mentor-biplob-rahul",
    "mentor-zia-ashraf",
    "mentor-sayeda-salma",
  ],
};

/**
 * Resolves the shared canonical mentor roster for a given catalog course.
 * Reads the ordered `mentorIds` defined on the Course aggregate (ADR 0012)
 * and resolves each mentor in sequence.
 * Serves as the single shared source of truth across Hero Slides, Course Cards, and Course Details.
 */
export function getCourseMentorRoster(
  mentors: Mentor[],
  courseOrId?: { id?: string; mentorIds?: string[] } | string[] | string | null,
  courses?: { id: string; mentorIds?: string[] }[]
): Mentor[] {
  if (!mentors || !Array.isArray(mentors) || !courseOrId) return [];

  const mentorMap = new Map<string, Mentor>(mentors.map((m) => [m.id, m]));

  // 1. Direct array of mentor IDs
  if (Array.isArray(courseOrId)) {
    return courseOrId
      .map((id) => mentorMap.get(id))
      .filter((m): m is Mentor => Boolean(m));
  }

  // 2. Course object with mentorIds array
  if (typeof courseOrId === "object" && Array.isArray(courseOrId.mentorIds)) {
    return courseOrId.mentorIds
      .map((id) => mentorMap.get(id))
      .filter((m): m is Mentor => Boolean(m));
  }

  // 3. String courseId: resolve via provided courses array or default map
  const rawId = typeof courseOrId === "string" ? courseOrId : courseOrId.id;
  if (!rawId) return [];
  const normalizedId = rawId.trim().toLowerCase();

  let targetMentorIds: string[] | undefined;
  if (Array.isArray(courses)) {
    const matched = courses.find((c) => c.id.trim().toLowerCase() === normalizedId);
    if (matched && Array.isArray(matched.mentorIds)) {
      targetMentorIds = matched.mentorIds;
    }
  }

  if (!targetMentorIds) {
    targetMentorIds = defaultCourseMentorIds[normalizedId];
  }

  if (targetMentorIds) {
    return targetMentorIds
      .map((id) => mentorMap.get(id))
      .filter((m): m is Mentor => Boolean(m));
  }

  return [];
}

export interface MentorCompanyLogo {
  src: string;
  alt: string;
}

/**
 * Formats mentor designation together with organization (e.g., "CEO at Lead Nation Academy").
 */
export function formatMentorRoleWithCompany(mentor: {
  role?: string;
  organization?: string;
}): string {
  const role = (mentor.role || "").trim();
  const org = (mentor.organization || "").trim();
  if (!role) return org;
  if (!org) return role;
  if (role.toLowerCase().includes(org.toLowerCase())) return role;
  return `${role} at ${org}`;
}

/**
 * Resolve verified official company logo for mentor organization.
 * Used across homepage hero slides and course details pages.
 * Returns null if an official asset is unavailable so the logo is omitted cleanly.
 */
export function getMentorCompanyLogo(mentor: {
  id?: string;
  organization?: string;
}): MentorCompanyLogo | null {
  const org = (mentor.organization || "").toLowerCase();
  const id = mentor.id || "";

  // 1. Eastern Bank PLC (Mohammad Salekeen Ibrahim)
  if (
    id === "mentor-mohammad-salekeen-ibrahim" ||
    org.includes("eastern bank") ||
    org.includes("ebl")
  ) {
    return {
      src: "/images/partners/eastern-bank.png",
      alt: mentor.organization || "Eastern Bank PLC",
    };
  }

  // 2. Nagad Ltd. (Syed Himyanuddin Ahmed, Anubhab Rahman, Md. Manik Hossain)
  if (
    id === "mentor-syed-himyanuddin-ahmed" ||
    id === "mentor-anubhab-rahman" ||
    id === "mentor-md-manik-hossain" ||
    org.includes("nagad")
  ) {
    return {
      src: "/images/partners/nagad.png",
      alt: mentor.organization || "Nagad Ltd.",
    };
  }

  // 3. Lead Nation Academy (Mir Hasib Mahmud)
  if (id === "mentor-mir-hasib" || org.includes("lead nation")) {
    return {
      src: "/images/brand/logo.png",
      alt: mentor.organization || "Lead Nation Academy",
    };
  }

  // 4. Modhumoti Bank PLC (Shahnawaj Chowdhury)
  if (id === "mentor-shahnawaj-chowdhury" || org.includes("modhumoti")) {
    return {
      src: "/images/partners/modhumoti-bank.png",
      alt: mentor.organization || "Modhumoti Bank PLC",
    };
  }

  // 5. IGLOO (G M Kamrul Hassan)
  if (id === "mentor-gm-kamrul" || org.includes("igloo")) {
    return {
      src: "/images/partners/igloo.png",
      alt: mentor.organization || "IGLOO",
    };
  }

  // 6. Axentec PLC (Istiaque Ahmed Bhuiyan, Munaf Mojib Chowdhury)
  if (
    id === "mentor-istiaque-bhuiyan" ||
    id === "mentor-munaf-chowdhury" ||
    org.includes("axentec") ||
    org.includes("robi axiata")
  ) {
    return {
      src: "/images/partners/axentec.png",
      alt: mentor.organization || "Axentec PLC",
    };
  }

  // 7. Sheba Platform Ltd (Ilmul Haque Sajib)
  if (id === "mentor-ilmul-sajib" || org.includes("sheba")) {
    return {
      src: "/images/partners/sheba.png",
      alt: mentor.organization || "Sheba Platform Ltd",
    };
  }

  // 8. e-Courier Limited (Biplob G Rahul)
  if (id === "mentor-biplob-rahul" || org.includes("courier")) {
    return {
      src: "/images/partners/ecourier.png",
      alt: mentor.organization || "e-Courier Limited",
    };
  }

  // 9. Chaldal PLC (Zia Ashraf)
  if (id === "mentor-zia-ashraf" || org.includes("chaldal")) {
    return {
      src: "/images/internships/chaldal.png",
      alt: mentor.organization || "Chaldal PLC",
    };
  }

  // 10. BrandGear Limited (Sayeda Umme Salma)
  if (id === "mentor-sayeda-salma" || org.includes("brandgear")) {
    return {
      src: "/images/partners/brandgear.png",
      alt: mentor.organization || "BrandGear Limited",
    };
  }

  // 11. Goyara Ltd
  if (org.includes("goyara")) {
    return {
      src: "/images/partners/goyara.png",
      alt: mentor.organization || "Goyara Ltd",
    };
  }

  // 12. United Commercial Bank PLC (Zeeshan Kingshuk Huq)
  if (
    id === "mentor-zeeshan-huq" ||
    org.includes("united commercial bank") ||
    org.includes("ucb")
  ) {
    return {
      src: "/images/partners/ucb.svg",
      alt: mentor.organization || "United Commercial Bank PLC",
    };
  }

  // 13. Shohoz.com (Talat Rahim)
  if (
    id === "mentor-talat-rahim" ||
    org.includes("shohoz")
  ) {
    return {
      src: "/images/partners/shohoz.svg",
      alt: mentor.organization || "Shohoz.com",
    };
  }

  // Omit logo if official verified asset is unavailable
  return null;
}

/**
 * Resolves all verified official company logos associated with a mentor's career history,
 * preserving order and deduplicating repeated assets, with fallback to primary organization.
 */
export function getMentorCompanyLogos(mentor: {
  id?: string;
  organization?: string;
  careerHistory?: { company: string }[];
}): MentorCompanyLogo[] {
  const results: MentorCompanyLogo[] = [];
  const seenSrc = new Set<string>();

  if (Array.isArray(mentor.careerHistory) && mentor.careerHistory.length > 0) {
    for (const item of mentor.careerHistory) {
      if (!item.company) continue;
      const logo = getMentorCompanyLogo({ organization: item.company });
      if (logo && !seenSrc.has(logo.src)) {
        seenSrc.add(logo.src);
        results.push(logo);
      }
    }
  }

  if (results.length === 0) {
    const primaryLogo = getMentorCompanyLogo(mentor);
    if (primaryLogo) {
      results.push(primaryLogo);
    }
  }

  return results;
}
