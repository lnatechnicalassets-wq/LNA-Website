import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { MentorsSection } from "./mentors-section";
import { MentorQuickViewProvider } from "./mentor-quick-view-context";
import { OfficialCompanyLogo } from "./company-logo";
import {
  getMentorCategoriesWithCounts,
  normalizeOrganizationGroupKey,
  sortMentors,
} from "@/lib/mentors";
import type { Mentor } from "@/lib/content";

const mockMentors: Mentor[] = [
  {
    id: "mentor-nadia-islam",
    name: "Nadia Islam",
    role: "Head of People",
    organization: "Airbnb",
    bio: "People operations leader specializing in organizational design and executive talent development.",
    portraitSrc: "/images/mentor-nadia.jpg",
    linkedInUrl: "https://linkedin.com/in/nadia-islam-demo",
    categories: ["HR & Operations"],
    expertise: ["People Strategy", "Culture & Scaling"],
    careerHistory: [{ company: "airbnb", logoIcon: "airbnb" }],
    order: 1,
    isPlaceholder: true,
    published: true,
    provenance: {
      class: "B",
      verified: false,
      source: "Test Seed",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
  {
    id: "mentor-ethan-park",
    name: "Ethan Park",
    role: "Former Chief Product Officer",
    organization: "Microsoft & Nexora",
    bio: "Product visionary with extensive experience architecting enterprise SaaS platforms.",
    portraitSrc: "/images/mentor-ethan.jpg",
    linkedInUrl: "https://linkedin.com/in/ethan-park-demo",
    categories: ["Technology & AI", "Business & Leadership"],
    expertise: ["Product Strategy", "Platform Architecture"],
    careerHistory: [
      { company: "Microsoft", logoIcon: "microsoft" },
      { company: "Nexora", logoIcon: "nexora" },
    ],
    order: 2,
    isPlaceholder: true,
    published: true,
    provenance: {
      class: "B",
      verified: false,
      source: "Test Seed",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
  {
    id: "mentor-riya-sharma",
    name: "Riya Sharma",
    role: "Former Chief Growth Officer",
    organization: "Vellum & StrideWorks",
    bio: "Growth leader with 15+ years of experience scaling consumer and enterprise businesses across global markets.",
    portraitSrc: "/images/mentor-riya.jpg",
    linkedInUrl: "https://linkedin.com/in/riya-sharma-demo",
    categories: ["Marketing & Growth", "Business & Leadership"],
    expertise: ["Growth Strategy", "Go-to-Market", "Scaling Teams", "Business Growth"],
    careerHistory: [
      { company: "Vellum", logoIcon: "vellum" },
      { company: "StrideWorks", logoIcon: "strideworks" },
      { company: "Microsoft", logoIcon: "microsoft" },
      { company: "Google", logoIcon: "google" },
    ],
    order: 3,
    isPlaceholder: true,
    published: true,
    provenance: {
      class: "B",
      verified: false,
      source: "Test Seed",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
  {
    id: "mentor-marcus-reed",
    name: "Marcus Reed",
    role: "Former CEO & Board Advisor",
    organization: "Crestline & Pivona",
    bio: "Senior corporate strategist and board advisor.",
    portraitSrc: "/images/mentor-marcus.jpg",
    linkedInUrl: "https://linkedin.com/in/marcus-reed-demo",
    categories: ["Business & Leadership"],
    expertise: ["Executive Leadership", "Board Governance"],
    careerHistory: [
      { company: "Crestline", logoIcon: "crestline" },
      { company: "Pivona", logoIcon: "pivona" },
    ],
    order: 4,
    isPlaceholder: true,
    published: true,
    provenance: {
      class: "B",
      verified: false,
      source: "Test Seed",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
  {
    id: "mentor-lena-chen",
    name: "Lena Chen",
    role: "Head of Strategy",
    organization: "Novaris & Arcview",
    bio: "Corporate strategy director advising multinational conglomerates.",
    portraitSrc: "/images/mentor-lena.jpg",
    linkedInUrl: "https://linkedin.com/in/lena-chen-demo",
    categories: ["Business & Leadership", "Finance & Banking"],
    expertise: ["Corporate Strategy", "Market Expansion"],
    careerHistory: [
      { company: "Novaris", logoIcon: "novaris" },
      { company: "Arcview", logoIcon: "arcview" },
    ],
    order: 5,
    isPlaceholder: true,
    published: true,
    provenance: {
      class: "B",
      verified: false,
      source: "Test Seed",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
];

const officialMentors: Mentor[] = [
  {
    id: "mentor-mohammad-salekeen-ibrahim",
    name: "Mohammad Salekeen Ibrahim",
    role: "Head of Asset, Retail & SME Banking",
    organization: "Eastern Bank PLC",
    bio: "Head of Asset, Retail & SME Banking at Eastern Bank PLC.",
    portraitSrc: "/images/mentors/mohammad-salekeen-ibrahim.png",
    categories: ["Financial Analysis", "Leadership & Career", "Operations & Management"],
    expertise: ["Retail & SME Banking", "Asset Management"],
    careerHistory: [{ company: "Eastern Bank PLC", role: "Head of Asset, Retail & SME Banking" }],
    order: 1,
    isPlaceholder: false,
    published: true,
    provenance: {
      class: "A",
      verified: true,
      source: "Official MTO Faculty Reference",
      verifiedBy: "Executive Team",
      verifiedOn: "2026-11-09",
    },
  },
  {
    id: "mentor-syed-himyanuddin-ahmed",
    name: "Syed Himyanuddin Ahmed",
    role: "Senior Associate Administrator, Administrator’s Office Division",
    organization: "Nagad Ltd.",
    bio: "Senior Associate Administrator at Nagad Ltd.",
    portraitSrc: "/images/mentors/syed-himyanuddin-ahmed.png",
    categories: ["Operations & Management", "Leadership & Career"],
    expertise: ["Corporate Administration", "Institutional Governance"],
    careerHistory: [
      {
        company: "Nagad Ltd.",
        role: "Senior Associate Administrator, Administrator’s Office Division",
      },
    ],
    order: 2,
    isPlaceholder: false,
    published: true,
    provenance: {
      class: "A",
      verified: true,
      source: "Official MTO Faculty Reference",
      verifiedBy: "Executive Team",
      verifiedOn: "2026-11-09",
    },
  },
  {
    id: "mentor-anubhab-rahman",
    name: "Anubhab Rahman",
    role: "Chief Human Resources Officer, Human Resources Division",
    organization: "Nagad Ltd.",
    bio: "Chief Human Resources Officer at Nagad Ltd.",
    portraitSrc: "/images/mentors/anubhab-rahman-v3.png",
    categories: ["Leadership & Career", "Operations & Management"],
    expertise: ["Human Resources Strategy", "Executive Recruitment"],
    careerHistory: [{ company: "Nagad Ltd.", role: "CHRO" }],
    order: 3,
    isPlaceholder: false,
    published: true,
    provenance: {
      class: "A",
      verified: true,
      source: "Official MTO Faculty Reference",
      verifiedBy: "Executive Team",
      verifiedOn: "2026-11-09",
    },
  },
  {
    id: "mentor-md-manik-hossain",
    name: "Md. Manik Hossain",
    role: "Head of HR Strategy & OD, Human Resources Division",
    organization: "Nagad Ltd.",
    bio: "Head of HR Strategy & OD at Nagad Ltd.",
    portraitSrc: "/images/mentors/md-manik-hossain.png",
    categories: ["Leadership & Career", "Operations & Management"],
    expertise: ["HR Strategy", "Organizational Design"],
    careerHistory: [{ company: "Nagad Ltd.", role: "Head of HR Strategy & OD" }],
    order: 4,
    isPlaceholder: false,
    published: true,
    provenance: {
      class: "A",
      verified: true,
      source: "Official MTO Faculty Reference",
      verifiedBy: "Executive Team",
      verifiedOn: "2026-11-09",
    },
  },
  {
    id: "mentor-mir-hasib",
    name: "Mir Hasib Mahmud",
    role: "CEO",
    organization: "Lead Nation Academy",
    bio: "CEO & Co-founder of Lead Nation Academy and corporate strategist.",
    portraitSrc: "/images/mentors/mir-hasib.png",
    categories: ["Leadership & Career"],
    expertise: ["Workplace Communication"],
    careerHistory: [
      { company: "Lead Nation Academy", role: "CEO & Co-founder" },
      { company: "Goyara Ltd", role: "CBO" },
    ],
    order: 5,
    isPlaceholder: false,
    published: true,
    provenance: {
      class: "A",
      verified: true,
      source: "Test",
      verifiedBy: "Executive Team",
      verifiedOn: "2026-11-09",
    },
  },
  {
    id: "mentor-gm-kamrul",
    name: "G M Kamrul Hassan",
    role: "CEO",
    organization: "IGLOO",
    bio: "CEO at IGLOO with decades of executive leadership.",
    portraitSrc: "/images/mentors/gm-kamrul.png",
    categories: ["Marketing & Sales"],
    expertise: ["Sales Strategy"],
    careerHistory: [{ company: "IGLOO", role: "CEO" }],
    order: 6,
    isPlaceholder: false,
    published: true,
    provenance: {
      class: "A",
      verified: true,
      source: "Test",
      verifiedBy: "Executive Team",
      verifiedOn: "2026-11-09",
    },
  },
  {
    id: "mentor-zia-ashraf",
    name: "Zia Ashraf",
    role: "COO",
    organization: "Chaldal PLC",
    bio: "Co-founder & COO at Chaldal PLC.",
    portraitSrc: "/images/mentors/zia-ashraf.png",
    categories: ["Operations & Management"],
    expertise: ["Customer Experience"],
    careerHistory: [{ company: "Chaldal PLC", role: "COO" }],
    order: 7,
    isPlaceholder: false,
    published: true,
    provenance: {
      class: "A",
      verified: true,
      source: "Test",
      verifiedBy: "Executive Team",
      verifiedOn: "2026-11-09",
    },
  },
  {
    id: "mentor-sayeda-salma",
    name: "Sayeda Umme Salma",
    role: "MD & CEO",
    organization: "BrandGear Limited",
    bio: "Managing Director & CEO of BrandGear Limited.",
    portraitSrc: "/images/mentors/sayeda-salma.png",
    categories: ["Marketing & Sales"],
    expertise: ["Brand Architecture"],
    careerHistory: [{ company: "BrandGear Limited", role: "MD & CEO" }],
    order: 8,
    isPlaceholder: false,
    published: true,
    provenance: {
      class: "A",
      verified: true,
      source: "Test",
      verifiedBy: "Executive Team",
      verifiedOn: "2026-11-09",
    },
  },
];

describe("Mentor sorting and dynamic categories", () => {
  it("derives non-zero dynamic categories without 0-count placeholders", () => {
    const categories = getMentorCategoriesWithCounts(officialMentors);

    expect(categories[0]).toEqual({ id: "all", name: "All Mentors", count: 8 });
    expect(categories.every((c) => c.count > 0)).toBe(true);
    expect(categories.some((c) => c.name === "Design & UX")).toBe(false);
    expect(categories.some((c) => c.name === "Business & Leadership")).toBe(false);
  });

  it("interleaves duplicate organizations in featured order while honoring explicit sorts", () => {
    expect(normalizeOrganizationGroupKey("Axentec PLC (a Robi Axiata company)")).toBe("axentec");
    expect(normalizeOrganizationGroupKey("Axentec PLC")).toBe("axentec");

    const featured = sortMentors(officialMentors, "featured");
    // Diverse orgs first (Eastern Bank -> Nagad -> Lead Nation -> IGLOO -> Chaldal)
    expect(featured.slice(0, 5).map((m) => m.id)).toEqual([
      "mentor-mohammad-salekeen-ibrahim",
      "mentor-syed-himyanuddin-ahmed",
      "mentor-mir-hasib",
      "mentor-gm-kamrul",
      "mentor-zia-ashraf",
    ]);

    const byOrder = sortMentors(officialMentors, "order");
    expect(byOrder.slice(0, 4).map((m) => m.id)).toEqual([
      "mentor-mohammad-salekeen-ibrahim",
      "mentor-syed-himyanuddin-ahmed",
      "mentor-anubhab-rahman",
      "mentor-md-manik-hossain",
    ]);

    const byName = sortMentors(officialMentors, "name-asc");
    expect(byName[0]?.name).toBe("Anubhab Rahman");

    const byOrg = sortMentors(officialMentors, "org-asc");
    expect(byOrg[0]?.organization).toBe("BrandGear Limited");
  });
});

describe("MentorsSection - 5-Card Layered Editorial Showcase", () => {
  it("renders dynamic non-zero category tabs (no 0-count pills), sort selector, and search input", () => {
    render(
      <MentorQuickViewProvider>
        <MentorsSection mentors={officialMentors} />
      </MentorQuickViewProvider>
    );

    const tabs = within(
      screen.getByRole("tablist", { name: /filter mentors by category/i })
    ).getAllByRole("tab");

    expect(tabs.map((t) => t.textContent)).toEqual([
      "All Mentors8",
      "Leadership & Career5",
      "Operations & Management5",
      "Marketing & Sales2",
      "Financial Analysis1",
    ]);

    expect(screen.queryByRole("tab", { name: /design & ux/i })).toBeNull();
    expect(screen.queryByRole("tab", { name: /business & leadership/i })).toBeNull();
    expect(screen.queryByText(/^0$/)).toBeNull();

    // Sort selector allows switching Featured -> Program Order / Name / Company
    const sortSelect = screen.getByRole("combobox", { name: /sort mentors/i });
    const cardIds = () =>
      screen.getAllByTestId("mentor-card").map((el) => el.getAttribute("data-mentor-id"));
    expect(cardIds().slice(0, 4)).toEqual([
      "mentor-mohammad-salekeen-ibrahim",
      "mentor-syed-himyanuddin-ahmed",
      "mentor-mir-hasib",
      "mentor-gm-kamrul",
    ]);

    fireEvent.change(sortSelect, { target: { value: "order" } });
    expect(cardIds().slice(0, 4)).toEqual([
      "mentor-mohammad-salekeen-ibrahim",
      "mentor-syed-himyanuddin-ahmed",
      "mentor-anubhab-rahman",
      "mentor-md-manik-hossain",
    ]);

    // Search field
    const searchInput = screen.getByPlaceholderText(/search mentors, company or expertise/i);
    expect(searchInput).toBeDefined();
  });

  it("renders editorial heading, description, 3 highlights, and Find a Mentor action button", () => {
    render(
      <MentorQuickViewProvider>
        <MentorsSection mentors={mockMentors} />
      </MentorQuickViewProvider>
    );

    expect(screen.getByText(/^our mentors$/i)).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: /meet our mentors/i })).toBeDefined();
    expect(screen.getByText(/industry experts/i)).toBeDefined();
    expect(screen.getByText(/real-world experience/i)).toBeDefined();
    expect(screen.getByText(/global perspective/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /find a mentor/i })).toBeDefined();
  });

  it("renders 5 visible layered cards in carousel with explicit Info buttons and icon-only company marks", () => {
    render(
      <MentorQuickViewProvider>
        <MentorsSection mentors={mockMentors} />
      </MentorQuickViewProvider>
    );

    expect(screen.getAllByText("Nadia Islam").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Ethan Park").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Riya Sharma").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Marcus Reed").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Lena Chen").length).toBeGreaterThanOrEqual(1);

    // Info buttons replace ambiguous '+' triggers
    expect(screen.getAllByText(/^Info$/).length).toBe(5);
    expect(screen.getByRole("button", { name: /view mentor info for nadia islam/i })).toBeDefined();
    expect(
      screen.getByRole("button", { name: /view mentor info for riya sharma/i, hidden: true })
    ).toBeDefined();
    expect(screen.queryByRole("button", { name: /open quick view/i, hidden: true })).toBeNull();

    // Role with company renders cleanly instead of standalone title
    expect(screen.getAllByText("Head of People at Airbnb").length).toBeGreaterThanOrEqual(1);

    // Company logos rendered in logo-only mode
    expect(
      screen.getAllByRole("img", { name: "airbnb", hidden: true }).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole("img", { name: "Microsoft", hidden: true }).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole("img", { name: "Vellum", hidden: true }).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole("img", { name: "StrideWorks", hidden: true }).length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("airbnb")).toBeNull();
    expect(screen.queryByText("Microsoft")).toBeNull();
    expect(screen.queryByText("Vellum")).toBeNull();
    expect(screen.queryByText("StrideWorks")).toBeNull();
  });

  it("navigates forward and backward using carousel arrow controls and shows position counter", () => {
    render(
      <MentorQuickViewProvider>
        <MentorsSection mentors={mockMentors} initialMentorId="mentor-riya-sharma" />
      </MentorQuickViewProvider>
    );

    expect(screen.getByText(/03 \/ 05 mentors/i)).toBeDefined();

    const nextBtn = screen.getByRole("button", { name: /next mentor/i });
    const prevBtn = screen.getByRole("button", { name: /previous mentor/i });

    expect(nextBtn).toBeDefined();
    expect(prevBtn).toBeDefined();

    fireEvent.click(nextBtn);
    fireEvent.click(prevBtn);
  });

  it("filters mentors when clicking a category and searching", () => {
    render(
      <MentorQuickViewProvider>
        <MentorsSection mentors={mockMentors} />
      </MentorQuickViewProvider>
    );

    const hrTab = screen.getByRole("tab", { name: /hr & operations/i });
    fireEvent.click(hrTab);
    expect(screen.getAllByText("Nadia Islam").length).toBeGreaterThanOrEqual(1);

    const searchInput = screen.getByPlaceholderText(/search mentors, company or expertise/i);
    fireEvent.change(searchInput, { target: { value: "Nadia" } });
    expect(screen.getAllByText("Nadia Islam").length).toBeGreaterThanOrEqual(1);
  });

  it("opens one consistent centered quick-view modal via Info button across all viewports and never renders a side-floating panel", () => {
    for (const testWidth of [390, 768, 1440, 1920, 2560]) {
      const originalInnerWidth = window.innerWidth;
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: testWidth,
      });

      try {
        const { unmount } = render(
          <MentorQuickViewProvider>
            <MentorsSection mentors={mockMentors} initialMentorId="mentor-riya-sharma" />
          </MentorQuickViewProvider>
        );

        const infoBtn = screen.getByRole("button", {
          name: /view mentor info for riya sharma/i,
        });
        fireEvent.click(infoBtn);

        const modal = screen.getByRole("dialog");
        expect(modal).toBeDefined();
        expect(within(modal).getAllByText("Riya Sharma").length).toBeGreaterThanOrEqual(1);
        expect(
          within(modal).getByText(/Growth leader with 15\+ years of experience/i)
        ).toBeDefined();

        expect(screen.queryByRole("region", { name: /featured mentor spotlight/i })).toBeNull();

        const closeBtn = within(modal).getByRole("button", { name: /close mentor details/i });
        fireEvent.click(closeBtn);

        expect(screen.queryByRole("dialog")).toBeNull();
        unmount();
      } finally {
        Object.defineProperty(window, "innerWidth", {
          writable: true,
          configurable: true,
          value: originalInnerWidth,
        });
      }
    }
  });

  it("handles 20 rapid consecutive Next clicks without freezing or getting stuck", () => {
    render(
      <MentorQuickViewProvider>
        <MentorsSection mentors={mockMentors} initialMentorId="mentor-riya-sharma" />
      </MentorQuickViewProvider>
    );

    const nextBtn = screen.getByRole("button", { name: /next mentor/i });
    for (let i = 0; i < 20; i++) {
      fireEvent.click(nextBtn);
    }

    expect(screen.getByText(/\d{2} \/ 05 mentors/i)).toBeDefined();
  });

  it("does not render a visible pause button and provides accessible keyboard interaction", () => {
    render(
      <MentorQuickViewProvider>
        <MentorsSection mentors={mockMentors} initialMentorId="mentor-riya-sharma" />
      </MentorQuickViewProvider>
    );

    expect(screen.queryByRole("button", { name: /pause/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /start autoplay rotation/i })).toBeNull();

    const carousel = screen.getByRole("region", { name: /executive mentors carousel/i });
    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    fireEvent.keyDown(carousel, { key: "ArrowLeft" });
    fireEvent.keyDown(carousel, { key: " " });
  });

  it("rotates mentors automatically at 2-second intervals and resumes after manual navigation", () => {
    vi.useFakeTimers();
    try {
      render(
        <MentorQuickViewProvider>
          <MentorsSection mentors={mockMentors} initialMentorId="mentor-riya-sharma" />
        </MentorQuickViewProvider>
      );

      expect(screen.getByText(/03 \/ 05 mentors/i)).toBeDefined();

      // Should not rotate before initial 1250ms post-settle hold completes
      act(() => {
        vi.advanceTimersByTime(1100);
      });
      expect(screen.getByText(/03 \/ 05 mentors/i)).toBeDefined();

      // First advance completes at 1250ms (since jsdom has no IntersectionObserver reveal delay)
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByText(/04 \/ 05 mentors/i)).toBeDefined();

      // Subsequent rotations happen at exact 2-second (2000ms = 750ms transition + 1250ms hold) intervals
      act(() => {
        vi.advanceTimersByTime(1900);
      });
      expect(screen.getByText(/04 \/ 05 mentors/i)).toBeDefined();

      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(screen.getByText(/05 \/ 05 mentors/i)).toBeDefined();

      // Manual click triggers immediate update and starts a fresh 2-second cycle
      const nextBtn = screen.getByRole("button", { name: /next mentor/i });
      act(() => {
        fireEvent.click(nextBtn);
      });
      expect(screen.getByText(/01 \/ 05 mentors/i)).toBeDefined();

      act(() => {
        vi.advanceTimersByTime(1900);
      });
      expect(screen.getByText(/01 \/ 05 mentors/i)).toBeDefined();

      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(screen.getByText(/02 \/ 05 mentors/i)).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("pauses autoplay while modal is open and resumes countdown when closed", () => {
    vi.useFakeTimers();
    try {
      render(
        <MentorQuickViewProvider>
          <MentorsSection mentors={mockMentors} initialMentorId="mentor-riya-sharma" />
        </MentorQuickViewProvider>
      );

      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(screen.getByText(/03 \/ 05 mentors/i)).toBeDefined();

      const infoBtn = screen.getByRole("button", {
        name: /view mentor info for riya sharma/i,
      });
      act(() => {
        fireEvent.click(infoBtn);
      });

      const modal = screen.getByRole("dialog");
      expect(modal).toBeDefined();

      act(() => {
        vi.advanceTimersByTime(10000);
      });
      expect(screen.getByText(/03 \/ 05 mentors/i)).toBeDefined();

      const closeBtn = within(modal).getByRole("button", { name: /close mentor details/i });
      act(() => {
        fireEvent.click(closeBtn);
      });
      expect(screen.queryByRole("dialog")).toBeNull();

      act(() => {
        vi.advanceTimersByTime(1300);
      });
      expect(screen.getByText(/04 \/ 05 mentors/i)).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("renders role-with-company titles and official logo-only corporate marks for LNA mentors", () => {
    render(
      <MentorQuickViewProvider>
        <MentorsSection mentors={officialMentors} initialMentorId="mentor-mir-hasib" />
      </MentorQuickViewProvider>
    );

    expect(screen.getByText("CEO at Lead Nation Academy")).toBeDefined();
    expect(screen.getByText("CEO at IGLOO")).toBeDefined();
    expect(screen.getByText("MD & CEO at BrandGear Limited")).toBeDefined();
    expect(screen.getByText("COO at Chaldal PLC")).toBeDefined();
    expect(
      screen.getByText(
        "Senior Associate Administrator, Administrator’s Office Division at Nagad Ltd."
      )
    ).toBeDefined();
    expect(screen.queryByText(/^CEO$/)).toBeNull();

    const lnaLogos = screen.getAllByRole("img", { name: "Lead Nation Academy", hidden: true });
    expect(lnaLogos.some((el) => el.getAttribute("src") === "/images/brand/logo.png")).toBe(true);
    const goyaraLogos = screen.getAllByRole("img", { name: "Goyara Ltd", hidden: true });
    expect(goyaraLogos.some((el) => el.getAttribute("src") === "/images/partners/goyara.png")).toBe(
      true
    );
    const iglooLogos = screen.getAllByRole("img", { name: "IGLOO", hidden: true });
    expect(iglooLogos.some((el) => el.getAttribute("src") === "/images/partners/igloo.png")).toBe(
      true
    );
    const brandgearLogos = screen.getAllByRole("img", { name: "BrandGear Limited", hidden: true });
    expect(
      brandgearLogos.some((el) => el.getAttribute("src") === "/images/partners/brandgear.png")
    ).toBe(true);
    const chaldalLogos = screen.getAllByRole("img", { name: "Chaldal PLC", hidden: true });
    expect(
      chaldalLogos.some((el) => el.getAttribute("src") === "/images/internships/chaldal.png")
    ).toBe(true);
    const nagadLogos = screen.getAllByRole("img", { name: "Nagad Ltd.", hidden: true });
    expect(nagadLogos.some((el) => el.getAttribute("src") === "/images/partners/nagad.png")).toBe(
      true
    );

    expect(screen.queryByText("Goyara Ltd")).toBeNull();
    expect(screen.queryByText("BrandGear Limited")).toBeNull();
    expect(screen.queryByText("Chaldal PLC")).toBeNull();
    expect(screen.queryByText("Nagad Ltd.")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /view mentor info for mir hasib mahmud/i }));
    const modal = screen.getByRole("dialog");
    expect(within(modal).getByText("CEO at Lead Nation Academy")).toBeDefined();
    expect(within(modal).getByRole("img", { name: "Lead Nation Academy" })).toBeDefined();
    expect(within(modal).getByRole("img", { name: "Goyara Ltd" })).toBeDefined();
  });

  it("applies recognizable calibrated heights for hero, card, and modal OfficialCompanyLogo sizes", () => {
    render(
      <div>
        <OfficialCompanyLogo
          src="/images/partners/brandgear.png"
          alt="BrandGear Hero"
          size="hero"
        />
        <OfficialCompanyLogo src="/images/partners/nagad.png" alt="Nagad Hero" size="hero" />
        <OfficialCompanyLogo src="/images/partners/igloo.png" alt="IGLOO Hero" size="hero" />
        <OfficialCompanyLogo src="/images/brand/logo.png" alt="LNA Card" size="card" />
        <OfficialCompanyLogo src="/images/partners/nagad.png" alt="Nagad Modal" size="modal" />
      </div>
    );

    expect(screen.getByRole("img", { name: "BrandGear Hero" }).className).toContain("h-[92px]");
    expect(screen.getByRole("img", { name: "Nagad Hero" }).className).toContain("h-[48px]");
    expect(screen.getByRole("img", { name: "IGLOO Hero" }).className).toContain("h-8 sm:h-9");
    expect(screen.getByRole("img", { name: "LNA Card" }).className).toContain("h-10 sm:h-11");
    expect(screen.getByRole("img", { name: "Nagad Modal" }).className).toContain("h-[66px]");
  });
});
