import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HeroSlider } from "./hero/hero-slider";
import { MentorQuickViewProvider } from "./mentor-quick-view-context";
import type { HeroSlide, Mentor } from "@/lib/content";

const mockSlides: HeroSlide[] = [
  {
    id: "slide-mto-readiness",
    programType: "mto",
    eyebrow: "FEATURED PROGRAM",
    title: "MTO Readiness Program",
    subtitle: "Graduate Career & Leadership Accelerator",
    headline: "MTO Readiness Program",
    description:
      "A practical, industry-focused program to prepare recent graduates for Management Trainee Officer (MTO) opportunities in leading organizations.",
    highlights: [
      { label: "16 Sessions", sublabel: "(1.5h each)", icon: "sessions" },
      { label: "8 Essential", sublabel: "Skills", icon: "skills" },
      { label: "5 Industry", sublabel: "Mentors", icon: "mentors" },
    ],
    mentorEyebrow: "MTO PROGRAM FACULTY",
    mentorHeading: "Learn From Industry Leaders",
    mentorIds: [
      "mentor-nadia-islam",
      "mentor-marcus-reed",
      "mentor-ethan-park",
      "mentor-riya-sharma",
      "mentor-lena-chen",
    ],
    ctaText: "Explore the Program",
    ctaHref: "#courses",
    classStartLabel: "Class Starts From",
    classStartDate: "December 1, 2026",
    badgeText: "FEATURED PROGRAM",
    imagePlaceholder: "/images/hero-campus.jpg",
    order: 1,
    provenance: {
      class: "B",
      verified: false,
      source: "Mock Seed",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
  {
    id: "slide-irgp",
    programType: "irgp",
    eyebrow: "COMPLETED PROGRAM",
    title: "IRGP",
    subtitle: "Industry Readiness Graduate Program",
    headline: "Industry Readiness Graduate Program (IRGP)",
    description:
      "A comprehensive, industry-focused program to build real-world skills, professional readiness, and career confidence for university students.",
    highlights: [
      { label: "10 Focus", sublabel: "Areas", icon: "areas" },
      { label: "8 Industry", sublabel: "Mentors", icon: "mentors" },
      { label: "Internship &", sublabel: "Job Support", icon: "career" },
    ],
    mentorHeading: "Meet Our IRGP Mentors",
    mentorIds: [
      "mentor-shahnawaj-chowdhury",
      "mentor-gm-kamrul",
      "mentor-istiaque-bhuiyan",
      "mentor-munaf-chowdhury",
      "mentor-ilmul-sajib",
      "mentor-biplob-rahul",
      "mentor-zia-ashraf",
      "mentor-sayeda-salma",
    ],
    ctaText: "Explore the IRGP Story",
    ctaHref: "#reviews",
    secondaryCtaText: "View Learner Experiences",
    secondaryCtaHref: "#reviews",
    badgeText: "COMPLETED PROGRAM",
    imagePlaceholder: "/images/hero-campus.jpg",
    order: 2,
    provenance: {
      class: "B",
      verified: false,
      source: "Mock Seed",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
];

const mockMentors: Mentor[] = [
  // 5 MTO Mentors (Reusing canonical mentors from the 80-mentor dataset)
  {
    id: "mentor-nadia-islam",
    name: "Nadia Islam",
    role: "Head of People",
    organization: "Airbnb",
    bio: "People operations leader specializing in organizational design and executive talent development.",
    portraitSrc: "/images/mentor-nadia.jpg",
    isPlaceholder: true,
    order: 1,
    provenance: { class: "B", verified: false, source: "Mock", verifiedBy: null, verifiedOn: null },
  },
  {
    id: "mentor-marcus-reed",
    name: "Marcus Reed",
    role: "Former CEO & Board Advisor",
    organization: "Crestline & Pivona",
    bio: "Executive leadership advisor and former CEO.",
    portraitSrc: "/images/mentor-marcus.jpg",
    isPlaceholder: true,
    order: 4,
    provenance: { class: "B", verified: false, source: "Mock", verifiedBy: null, verifiedOn: null },
  },
  {
    id: "mentor-ethan-park",
    name: "Ethan Park",
    role: "Former Chief Product Officer",
    organization: "Microsoft & Nexora",
    bio: "Product executive and leadership strategist.",
    portraitSrc: "/images/mentor-ethan.jpg",
    isPlaceholder: true,
    order: 2,
    provenance: { class: "B", verified: false, source: "Mock", verifiedBy: null, verifiedOn: null },
  },
  {
    id: "mentor-riya-sharma",
    name: "Riya Sharma",
    role: "Former Chief Growth Officer",
    organization: "Vellum & StrideWorks",
    bio: "Growth strategy leader and scaling executive.",
    portraitSrc: "/images/mentor-riya.jpg",
    isPlaceholder: true,
    order: 3,
    provenance: { class: "B", verified: false, source: "Mock", verifiedBy: null, verifiedOn: null },
  },
  {
    id: "mentor-lena-chen",
    name: "Lena Chen",
    role: "Head of Strategy",
    organization: "Novaris & Arcview",
    bio: "Corporate strategy leader driving enterprise transformation.",
    portraitSrc: "/images/mentor-lena.jpg",
    isPlaceholder: true,
    order: 5,
    provenance: { class: "B", verified: false, source: "Mock", verifiedBy: null, verifiedOn: null },
  },
  // 8 IRGP Mentors
  {
    id: "mentor-shahnawaj-chowdhury",
    name: "Shahnawaj Chowdhury",
    role: "Additional Managing Director",
    organization: "Modhumoti Bank PLC.",
    bio: "Corporate banking leader at Modhumoti Bank.",
    portraitSrc: "/images/mentor-shahnawaj-chowdhury.jpg",
    isPlaceholder: false,
    order: 86,
    provenance: { class: "B", verified: false, source: "Mock", verifiedBy: null, verifiedOn: null },
  },
  {
    id: "mentor-gm-kamrul",
    name: "G M Kamrul Hassan",
    role: "CEO",
    organization: "Akij Infotech",
    bio: "CEO across Akij Group technology enterprises.",
    portraitSrc: "/images/mentor-gm-kamrul.jpg",
    isPlaceholder: false,
    order: 87,
    provenance: { class: "B", verified: false, source: "Mock", verifiedBy: null, verifiedOn: null },
  },
  {
    id: "mentor-istiaque-bhuiyan",
    name: "Istiaque Ahmed Bhuiyan",
    role: "Sr. GM (Cloud, Colo, ANS)",
    organization: "Aventec PLC",
    bio: "Senior technology executive at Aventec PLC.",
    portraitSrc: "/images/mentor-istiaque-bhuiyan.jpg",
    isPlaceholder: false,
    order: 88,
    provenance: { class: "B", verified: false, source: "Mock", verifiedBy: null, verifiedOn: null },
  },
  {
    id: "mentor-munaf-chowdhury",
    name: "Munaf Mojib Chowdhury",
    role: "Head of Brand & Communication",
    organization: "Aventec PLC.",
    bio: "Brand strategist at Aventec PLC.",
    portraitSrc: "/images/mentor-munaf-chowdhury.jpg",
    isPlaceholder: false,
    order: 89,
    provenance: { class: "B", verified: false, source: "Mock", verifiedBy: null, verifiedOn: null },
  },
  {
    id: "mentor-ilmul-sajib",
    name: "Ilmul Haque Sajib",
    role: "Co-Founder",
    organization: "Sheba Platform Limited",
    bio: "Co-Founder of Sheba Platform Limited.",
    portraitSrc: "/images/mentor-ilmul-sajib.jpg",
    isPlaceholder: false,
    order: 90,
    provenance: { class: "B", verified: false, source: "Mock", verifiedBy: null, verifiedOn: null },
  },
  {
    id: "mentor-biplob-rahul",
    name: "Biplob G Rahul",
    role: "CEO",
    organization: "e-Courier Limited",
    bio: "Founder and CEO of e-Courier Limited.",
    portraitSrc: "/images/mentor-biplob-rahul.jpg",
    isPlaceholder: false,
    order: 91,
    provenance: { class: "B", verified: false, source: "Mock", verifiedBy: null, verifiedOn: null },
  },
  {
    id: "mentor-zia-ashraf",
    name: "Zia Ashraf",
    role: "COO",
    organization: "Chaldal PLC.",
    bio: "COO of Chaldal PLC.",
    portraitSrc: "/images/mentor-zia-ashraf.jpg",
    isPlaceholder: false,
    order: 92,
    provenance: { class: "B", verified: false, source: "Mock", verifiedBy: null, verifiedOn: null },
  },
  {
    id: "mentor-sayeda-salma",
    name: "Sayeda Umme Salma",
    role: "CEO",
    organization: "BrandGear Ltd.",
    bio: "CEO of BrandGear Ltd.",
    portraitSrc: "/images/mentor-sayeda-salma.jpg",
    isPlaceholder: false,
    order: 93,
    provenance: { class: "B", verified: false, source: "Mock", verifiedBy: null, verifiedOn: null },
  },
];

function renderHeroWithContext() {
  return render(
    <MentorQuickViewProvider>
      <HeroSlider slides={mockSlides} mentors={mockMentors} />
    </MentorQuickViewProvider>
  );
}

describe("HeroSlider Component (Two-Slide Premium Mentor Showcase)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders exactly two Hero slides with no third slide", () => {
    renderHeroWithContext();

    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBe(2);
    expect(
      screen.getByRole("tab", { name: /Go to slide 1: MTO Readiness Program/i })
    ).toBeDefined();
    expect(screen.getByRole("tab", { name: /Go to slide 2: IRGP/i })).toBeDefined();
    expect(screen.queryByRole("tab", { name: /Go to slide 3/i })).toBeNull();
  });

  it("renders Slide 1 (MTO) with 5 assigned mentors, headings, and CTAs", () => {
    renderHeroWithContext();

    // Slide 1 Content
    expect(screen.getAllByText(/MTO Readiness/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Graduate Career & Leadership Accelerator")).toBeDefined();
    expect(screen.getByText("Learn From Industry Leaders")).toBeDefined();
    expect(screen.getByText("MTO PROGRAM FACULTY")).toBeDefined();

    // 5 MTO Mentors
    expect(screen.getAllByText("Nadia Islam").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Marcus Reed").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Ethan Park").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Riya Sharma").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Lena Chen").length).toBeGreaterThanOrEqual(1);

    // Primary CTA and Class Start Information
    expect(screen.getByRole("link", { name: /Explore the Program/i })).toBeDefined();
    expect(screen.getByText("Class Starts From")).toBeDefined();
    expect(screen.getByText("December 1, 2026")).toBeDefined();
  });

  it("renders Slide 2 (IRGP) with 8 assigned mentors after advancing", () => {
    renderHeroWithContext();

    // Advance 4s to Slide 2
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // Slide 2 Content
    expect(screen.getAllByText("IRGP").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Industry Readiness Graduate Program").length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Meet Our IRGP Mentors")).toBeDefined();

    // 8 IRGP Mentors
    expect(screen.getAllByText("Shahnawaj Chowdhury").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("G M Kamrul Hassan").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Istiaque Ahmed Bhuiyan").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Munaf Mojib Chowdhury").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Ilmul Haque Sajib").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Biplob G Rahul").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Zia Ashraf").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Sayeda Umme Salma").length).toBeGreaterThanOrEqual(1);

    // CTAs
    expect(screen.getByRole("link", { name: /Explore the IRGP Story/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /View Learner Experiences/i })).toBeDefined();
  });

  it("automatically advances every 4 seconds and loops continuously between Slide 1 and Slide 2", () => {
    renderHeroWithContext();

    // Initial: Slide 1 (MTO)
    expect(screen.getByText("Learn From Industry Leaders")).toBeDefined();

    // After 4s -> Slide 2 (IRGP)
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText("Meet Our IRGP Mentors")).toBeDefined();

    // After another 4s -> Loops back to Slide 1 (MTO)
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText("Learn From Industry Leaders")).toBeDefined();
  });

  it("pauses rotation on hover and resumes on mouse leave", () => {
    renderHeroWithContext();

    const carousel = screen.getByRole("region", {
      name: /Lead Nation Academy Featured Executive Programs/i,
    });

    // Hover pauses autoplay
    fireEvent.mouseEnter(carousel);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    // Remains on Slide 1 because it is hovered
    expect(screen.getByText("Learn From Industry Leaders")).toBeDefined();

    // Mouse leave resumes autoplay
    fireEvent.mouseLeave(carousel);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    // Advanced to Slide 2
    expect(screen.getByText("Meet Our IRGP Mentors")).toBeDefined();
  });

  it("pauses rotation on focus and resumes on blur", () => {
    renderHeroWithContext();

    const carousel = screen.getByRole("region", {
      name: /Lead Nation Academy Featured Executive Programs/i,
    });

    // Focus pauses autoplay
    fireEvent.focus(carousel);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText("Learn From Industry Leaders")).toBeDefined();

    // Blur resumes autoplay
    fireEvent.blur(carousel);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText("Meet Our IRGP Mentors")).toBeDefined();
  });

  it("clicking any mentor opens the shared quick-view modal and pauses Hero rotation", () => {
    renderHeroWithContext();

    // Find Nadia Islam's mentor card buttons (desktop + responsive)
    const nadiaBtns = screen.getAllByRole("button", {
      name: /View mentor profile: Nadia Islam, Head of People at Airbnb/i,
    });
    expect(nadiaBtns.length).toBeGreaterThanOrEqual(1);

    // Click mentor card
    fireEvent.click(nadiaBtns[0]);

    // Modal dialog opens with mentor details
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(
      screen.getByText(
        "People operations leader specializing in organizational design and executive talent development."
      )
    ).toBeDefined();

    // While modal is open, advance timers -> Hero must NOT rotate behind modal
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.getByText("Learn From Industry Leaders")).toBeDefined();

    // Close modal via close button
    const closeBtn = screen.getByRole("button", { name: /Close mentor details/i });
    fireEvent.click(closeBtn);

    // After modal closes, rotation resumes
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText("Meet Our IRGP Mentors")).toBeDefined();
  });

  it("does not render visible previous/next arrow buttons or visible pause button", () => {
    renderHeroWithContext();

    expect(screen.queryByRole("button", { name: /Previous slide/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Next slide/i })).toBeNull();

    // Hidden screen-reader button exists for WCAG 2.2.2
    const srPause = screen.getByRole("button", { name: /Pause automatic slide rotation/i });
    expect(srPause).toBeDefined();
    expect(srPause.className).toContain("sr-only");
  });

  it("manual indicator click switches slide and resets countdown", () => {
    renderHeroWithContext();

    const slide2Tab = screen.getByRole("tab", { name: /Go to slide 2: IRGP/i });
    fireEvent.click(slide2Tab);

    // Switched immediately to Slide 2
    expect(screen.getByText("Meet Our IRGP Mentors")).toBeDefined();
  });

  it("supports keyboard arrow navigation", () => {
    renderHeroWithContext();

    const carousel = screen.getByRole("region", {
      name: /Lead Nation Academy Featured Executive Programs/i,
    });

    // Press ArrowRight to advance
    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    expect(screen.getByText("Meet Our IRGP Mentors")).toBeDefined();

    // Press ArrowLeft to return
    fireEvent.keyDown(carousel, { key: "ArrowLeft" });
    expect(screen.getByText("Learn From Industry Leaders")).toBeDefined();
  });
});
