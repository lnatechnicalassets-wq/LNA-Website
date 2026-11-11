import type { Mentor } from "@/lib/content";

export type MentorSortOption = "featured" | "order" | "name-asc" | "org-asc";

export interface MentorSortChoice {
  id: MentorSortOption;
  label: string;
}

export const MENTOR_SORT_OPTIONS: MentorSortChoice[] = [
  { id: "featured", label: "Featured" },
  { id: "order", label: "Program Order" },
  { id: "name-asc", label: "Name (A-Z)" },
  { id: "org-asc", label: "Company (A-Z)" },
];

export interface MentorCategorySummary {
  id: string;
  name: string;
  count: number;
}

const CANONICAL_CATEGORY_PRIORITY: Record<string, number> = {
  "Leadership & Career": 1,
  "Operations & Management": 2,
  "Marketing & Sales": 3,
  "Communication & Influence": 4,
  "Entrepreneurship & Strategy": 5,
  "Technology & AI": 6,
  "Financial Analysis": 7,
};

/**
 * Derives non-zero category tabs dynamically from actual mentor records
 * so zero-count placeholder tabs never appear in the UI.
 */
export function getMentorCategoriesWithCounts(mentors: Mentor[]): MentorCategorySummary[] {
  const counts = new Map<string, number>();

  for (const mentor of mentors) {
    const seenForMentor = new Set<string>();
    for (const rawCategory of mentor.categories ?? []) {
      const category = rawCategory.trim();
      if (!category || seenForMentor.has(category)) continue;
      seenForMentor.add(category);
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }

  const dynamicCategories: MentorCategorySummary[] = Array.from(counts.entries())
    .filter(([, count]) => count > 0)
    .map(([category, count]) => ({
      id: category,
      name: category,
      count,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      const prioA = CANONICAL_CATEGORY_PRIORITY[a.name] ?? 999;
      const prioB = CANONICAL_CATEGORY_PRIORITY[b.name] ?? 999;
      if (prioA !== prioB) return prioA - prioB;
      return a.name.localeCompare(b.name, "en");
    });

  return [{ id: "all", name: "All Mentors", count: mentors.length }, ...dynamicCategories];
}

/**
 * Normalizes primary organization names so sister/parenthetical variants
 * (e.g. "Axentec PLC" and "Axentec PLC (a Robi Axiata company)") group cleanly
 * when interleaving companies in Featured order.
 */
export function normalizeOrganizationGroupKey(organization?: string): string {
  const raw = (organization || "").trim().toLowerCase();
  if (!raw) return "unknown";
  const withoutParens = raw.replace(/\([^)]*\)/g, "").trim();
  const base = withoutParens
    .replace(/\b(ltd\.?|limited|plc\.?|inc\.?|com)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return base || raw;
}

/**
 * Sorts mentors by the active user-selected criterion.
 * "featured" interleaves distinct organizations by canonical `order` so
 * first-screen views highlight organizational diversity without dropping order hierarchy.
 */
export function sortMentors(mentors: Mentor[], sortBy: MentorSortOption = "featured"): Mentor[] {
  const byCanonicalOrder = [...mentors].sort((a, b) => {
    const orderDiff = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
    if (orderDiff !== 0) return orderDiff;
    return a.name.localeCompare(b.name, "en");
  });

  if (sortBy === "order") {
    return byCanonicalOrder;
  }

  if (sortBy === "name-asc") {
    return [...mentors].sort((a, b) => {
      const nameDiff = a.name.localeCompare(b.name, "en");
      if (nameDiff !== 0) return nameDiff;
      return (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
    });
  }

  if (sortBy === "org-asc") {
    return [...mentors].sort((a, b) => {
      const orgDiff = a.organization.localeCompare(b.organization, "en");
      if (orgDiff !== 0) return orgDiff;
      return a.name.localeCompare(b.name, "en");
    });
  }

  // "featured": round-robin across organizations while honoring canonical order
  const orgQueues = new Map<string, Mentor[]>();
  const orgSequence: string[] = [];

  for (const mentor of byCanonicalOrder) {
    const orgKey = normalizeOrganizationGroupKey(mentor.organization);
    let queue = orgQueues.get(orgKey);
    if (!queue) {
      queue = [];
      orgQueues.set(orgKey, queue);
      orgSequence.push(orgKey);
    }
    queue.push(mentor);
  }

  const interleaved: Mentor[] = [];
  let addedInPass = true;
  while (addedInPass) {
    addedInPass = false;
    for (const orgKey of orgSequence) {
      const queue = orgQueues.get(orgKey);
      if (queue && queue.length > 0) {
        const nextMentor = queue.shift();
        if (nextMentor) {
          interleaved.push(nextMentor);
          addedInPass = true;
        }
      }
    }
  }

  return interleaved;
}

export interface FilterMentorsOptions {
  category?: string;
  query?: string;
}

export function filterMentors(
  mentors: Mentor[],
  { category = "all", query = "" }: FilterMentorsOptions = {}
): Mentor[] {
  let list = mentors;

  if (category && category !== "all") {
    list = list.filter((m) => (m.categories ?? []).some((c) => c.trim() === category));
  }

  const normalizedQuery = query.toLowerCase().trim();
  if (normalizedQuery) {
    list = list.filter((m) => {
      const matchName = m.name.toLowerCase().includes(normalizedQuery);
      const matchRole = m.role.toLowerCase().includes(normalizedQuery);
      const matchOrg = m.organization.toLowerCase().includes(normalizedQuery);
      const matchBio = m.bio.toLowerCase().includes(normalizedQuery);
      const matchCategory = m.categories?.some((c) => c.toLowerCase().includes(normalizedQuery));
      const matchExpertise = m.expertise?.some((e) => e.toLowerCase().includes(normalizedQuery));
      const matchCompanyHistory = m.careerHistory?.some(
        (c) =>
          c.company.toLowerCase().includes(normalizedQuery) ||
          (c.role ? c.role.toLowerCase().includes(normalizedQuery) : false)
      );

      return (
        matchName ||
        matchRole ||
        matchOrg ||
        matchBio ||
        Boolean(matchCategory) ||
        Boolean(matchExpertise) ||
        Boolean(matchCompanyHistory)
      );
    });
  }

  return list;
}

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
  mto: [
    "mentor-mohammad-salekeen-ibrahim",
    "mentor-syed-himyanuddin-ahmed",
    "mentor-anubhab-rahman",
    "mentor-md-manik-hossain",
    "mentor-mir-hasib",
  ],
  irgp: [
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
    return courseOrId.map((id) => mentorMap.get(id)).filter((m): m is Mentor => Boolean(m));
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
    return targetMentorIds.map((id) => mentorMap.get(id)).filter((m): m is Mentor => Boolean(m));
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
  if (id === "mentor-talat-rahim" || org.includes("shohoz")) {
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
