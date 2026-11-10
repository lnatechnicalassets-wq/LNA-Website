import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { MentorsSection } from "./mentors-section";
import { MentorQuickViewProvider } from "./mentor-quick-view-context";
import { OfficialCompanyLogo } from "./company-logo";
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

describe("MentorsSection - 5-Card Layered Editorial Showcase", () => {
  it("renders category filters with dynamic counts and search input", () => {
    render(
      <MentorQuickViewProvider>
        <MentorsSection mentors={mockMentors} />
      </MentorQuickViewProvider>
    );

    // Category buttons
    expect(screen.getByRole("tab", { name: /all mentors/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /technology & ai/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /business & leadership/i })).toBeDefined();

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

    // Eyebrow and Heading
    expect(screen.getByText(/our mentors/i)).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: /meet our mentors/i })).toBeDefined();

    // Three highlights matching reference
    expect(screen.getByText(/industry experts/i)).toBeDefined();
    expect(screen.getByText(/real-world experience/i)).toBeDefined();
    expect(screen.getByText(/global perspective/i)).toBeDefined();

    // Find a Mentor button
    expect(screen.getByRole("button", { name: /find a mentor/i })).toBeDefined();
  });

  it("renders 5 visible layered cards in carousel with company logos", () => {
    render(
      <MentorQuickViewProvider>
        <MentorsSection mentors={mockMentors} />
      </MentorQuickViewProvider>
    );

    // All 5 mentors rendered in card deck
    expect(screen.getAllByText("Nadia Islam").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Ethan Park").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Riya Sharma").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Marcus Reed").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Lena Chen").length).toBeGreaterThanOrEqual(1);

    // Role with company renders cleanly instead of standalone title
    expect(screen.getAllByText("Head of People at Airbnb").length).toBeGreaterThanOrEqual(1);

    // Company logos rendered in logo-only mode (accessible role="img", no visible duplicate label text)
    expect(screen.getAllByRole("img", { name: "airbnb", hidden: true }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("img", { name: "Microsoft", hidden: true }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("img", { name: "Vellum", hidden: true }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("img", { name: "StrideWorks", hidden: true }).length).toBeGreaterThanOrEqual(1);
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

    // Position indicator showing 03 / 05 Mentors (Riya is initially centered)
    expect(screen.getByText(/03 \/ 05 mentors/i)).toBeDefined();

    const nextBtn = screen.getByRole("button", { name: /next mentor/i });
    const prevBtn = screen.getByRole("button", { name: /previous mentor/i });

    expect(nextBtn).toBeDefined();
    expect(prevBtn).toBeDefined();

    // Advance to next mentor
    fireEvent.click(nextBtn);

    // Return to previous mentor
    fireEvent.click(prevBtn);
  });

  it("filters mentors when clicking a category and searching", () => {
    render(
      <MentorQuickViewProvider>
        <MentorsSection mentors={mockMentors} />
      </MentorQuickViewProvider>
    );

    // Click HR & Operations category
    const hrTab = screen.getByRole("tab", { name: /hr & operations/i });
    fireEvent.click(hrTab);

    // Nadia Islam should be present
    expect(screen.getAllByText("Nadia Islam").length).toBeGreaterThanOrEqual(1);

    // Search for a keyword
    const searchInput = screen.getByPlaceholderText(/search mentors, company or expertise/i);
    fireEvent.change(searchInput, { target: { value: "Nadia" } });

    expect(screen.getAllByText("Nadia Islam").length).toBeGreaterThanOrEqual(1);
  });

  it("opens one consistent centered quick-view modal across all viewports and never renders a side-floating panel", () => {
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

        // Click active card plus button
        const plusBtn = screen.getByRole("button", {
          name: /open quick view for riya sharma/i,
        });
        fireEvent.click(plusBtn);

        // Centered modal dialog opens
        const modal = screen.getByRole("dialog");
        expect(modal).toBeDefined();
        expect(within(modal).getAllByText("Riya Sharma").length).toBeGreaterThanOrEqual(1);
        expect(
          within(modal).getByText(/Growth leader with 15\+ years of experience/i)
        ).toBeDefined();

        // Ensure NO side-floating panel is rendered on any viewport
        expect(screen.queryByRole("region", { name: /featured mentor spotlight/i })).toBeNull();

        // Close button dismisses modal
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
    expect(nextBtn).toBeDefined();

    // Perform 20 rapid clicks
    for (let i = 0; i < 20; i++) {
      fireEvent.click(nextBtn);
    }

    // Carousel remains responsive and displays a valid index
    const counter = screen.getByText(/\d{2} \/ 05 mentors/i);
    expect(counter).toBeDefined();
  });

  it("does not render a visible pause button and provides accessible keyboard interaction", () => {
    render(
      <MentorQuickViewProvider>
        <MentorsSection mentors={mockMentors} initialMentorId="mentor-riya-sharma" />
      </MentorQuickViewProvider>
    );

    // Pause button is completely removed from the UI per approved spec
    expect(screen.queryByRole("button", { name: /pause/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /start autoplay rotation/i })).toBeNull();

    // Carousel container handles keyboard navigation
    const carousel = screen.getByRole("region", { name: /executive mentors carousel/i });
    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    fireEvent.keyDown(carousel, { key: "ArrowLeft" });
    fireEvent.keyDown(carousel, { key: " " });
  });

  it("rotates mentors automatically at 4-second intervals and resumes after manual navigation", () => {
    vi.useFakeTimers();
    try {
      render(
        <MentorQuickViewProvider>
          <MentorsSection mentors={mockMentors} initialMentorId="mentor-riya-sharma" />
        </MentorQuickViewProvider>
      );

      // Initially Riya Sharma (03 / 05)
      expect(screen.getByText(/03 \/ 05 mentors/i)).toBeDefined();

      // Fast-forward past entrance reveal (1300ms)
      act(() => {
        vi.advanceTimersByTime(1400);
      });

      // Advance 4000ms idle display time + remaining transition
      act(() => {
        vi.advanceTimersByTime(4800);
      });

      // Should advance to Marcus Reed (04 / 05)
      expect(screen.getByText(/04 \/ 05 mentors/i)).toBeDefined();

      // Advance another 750ms transition + 4000ms idle display time
      act(() => {
        vi.advanceTimersByTime(4800);
      });

      // Should advance to Lena Chen (05 / 05)
      expect(screen.getByText(/05 \/ 05 mentors/i)).toBeDefined();

      // Manual Next click navigates immediately
      const nextBtn = screen.getByRole("button", { name: /next mentor/i });
      act(() => {
        fireEvent.click(nextBtn);
      });

      // Immediately wraps to Nadia Islam (01 / 05)
      expect(screen.getByText(/01 \/ 05 mentors/i)).toBeDefined();

      // Resumes automatic rotation after 750ms transition + 4000ms display time
      act(() => {
        vi.advanceTimersByTime(4800);
      });

      // Advances to Ethan Park (02 / 05)
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

      // Settle reveal
      act(() => {
        vi.advanceTimersByTime(1400);
      });
      expect(screen.getByText(/03 \/ 05 mentors/i)).toBeDefined();

      // Open modal
      const plusBtn = screen.getByRole("button", {
        name: /open quick view for riya sharma/i,
      });
      act(() => {
        fireEvent.click(plusBtn);
      });

      const modal = screen.getByRole("dialog");
      expect(modal).toBeDefined();

      // Advance timers by 10 seconds while modal is open
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // Carousel must remain paused on Riya Sharma (03 / 05)
      expect(screen.getByText(/03 \/ 05 mentors/i)).toBeDefined();

      // Close modal
      const closeBtn = within(modal).getByRole("button", { name: /close mentor details/i });
      act(() => {
        fireEvent.click(closeBtn);
      });

      expect(screen.queryByRole("dialog")).toBeNull();

      // After closing, advancing 750ms + 4000ms resumes rotation
      act(() => {
        vi.advanceTimersByTime(4800);
      });
      expect(screen.getByText(/04 \/ 05 mentors/i)).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("renders role-with-company titles and official logo-only corporate marks for LNA mentors", () => {
    const officialMentors: Mentor[] = [
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
        order: 1,
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
        order: 2,
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
        order: 3,
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
        order: 4,
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
        id: "mentor-syed-himyanuddin-ahmed",
        name: "Syed Himyanuddin Ahmed",
        role: "Senior Associate Administrator, Administrator’s Office Division",
        organization: "Nagad Ltd.",
        bio: "Senior Associate Administrator at Nagad Ltd.",
        portraitSrc: "/images/mentors/syed-himyanuddin-ahmed.png",
        categories: ["Operations & Management"],
        expertise: ["Corporate Administration"],
        careerHistory: [
          {
            company: "Nagad Ltd.",
            role: "Senior Associate Administrator, Administrator’s Office Division",
          },
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
    ];

    render(
      <MentorQuickViewProvider>
        <MentorsSection mentors={officialMentors} initialMentorId="mentor-mir-hasib" />
      </MentorQuickViewProvider>
    );

    // Role displays with organization instead of bare title
    expect(screen.getByText("CEO at Lead Nation Academy")).toBeDefined();
    expect(screen.getByText("CEO at IGLOO")).toBeDefined();
    expect(screen.getByText("MD & CEO at BrandGear Limited")).toBeDefined();
    expect(screen.getByText("COO at Chaldal PLC")).toBeDefined();
    expect(
      screen.getByText("Senior Associate Administrator, Administrator’s Office Division at Nagad Ltd.")
    ).toBeDefined();
    expect(screen.queryByText(/^CEO$/)).toBeNull();

    // Official corporate logo images render with clean alt attributes and no plain-text company names
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

    // Standalone company names should NOT appear in the card footer strip
    expect(screen.queryByText("Goyara Ltd")).toBeNull();
    expect(screen.queryByText("BrandGear Limited")).toBeNull();
    expect(screen.queryByText("Chaldal PLC")).toBeNull();
    expect(screen.queryByText("Nagad Ltd.")).toBeNull();

    // Quick-view modal also displays role-with-company and official corporate logos
    fireEvent.click(screen.getByRole("button", { name: /open quick view for mir hasib mahmud/i }));
    const modal = screen.getByRole("dialog");
    expect(within(modal).getByText("CEO at Lead Nation Academy")).toBeDefined();
    expect(within(modal).getByRole("img", { name: "Lead Nation Academy" })).toBeDefined();
    expect(within(modal).getByRole("img", { name: "Goyara Ltd" })).toBeDefined();
  });

  it("applies recognizable calibrated heights for hero, card, and modal OfficialCompanyLogo sizes", () => {
    render(
      <div>
        <OfficialCompanyLogo src="/images/partners/brandgear.png" alt="BrandGear Hero" size="hero" />
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
