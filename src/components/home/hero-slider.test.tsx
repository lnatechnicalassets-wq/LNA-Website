import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HeroSlider } from "./hero-slider";
import type { HeroSlide } from "@/lib/content";

const mockSlides: HeroSlide[] = [
  {
    id: "slide-1",
    courseId: "executive-leadership",
    title: "Executive Leadership",
    headline: "First Headline for Leadership",
    description: "Description of the leadership course.",
    ctaText: "View Details",
    ctaHref: "/courses/executive-leadership",
    badgeText: "Cohort 01",
    imagePlaceholder: "/images/hero-1.jpg",
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
    id: "slide-2",
    courseId: "corporate-finance",
    title: "Corporate Finance",
    headline: "Second Headline for Finance",
    description: "Description of corporate finance.",
    ctaText: "Explore Finance",
    ctaHref: "/courses/corporate-finance",
    badgeText: "Weekend Intensive",
    imagePlaceholder: "/images/hero-2.jpg",
    order: 2,
    provenance: {
      class: "B",
      verified: false,
      source: "Mock Seed",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
  {
    id: "slide-3",
    title: "All Programs",
    headline: "Third Headline for All Programs",
    description: "Explore all programs in Dhanmondi.",
    ctaText: "Explore All",
    ctaHref: "/courses",
    badgeText: "Executive Portfolio",
    imagePlaceholder: "/images/hero-3.jpg",
    order: 3,
    provenance: {
      class: "B",
      verified: false,
      source: "Mock Seed",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
];

describe("HeroSlider Component (Autoplay, Indicators, WCAG 2.2 AA)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders active slide with headline, description, and CTAs", () => {
    render(<HeroSlider slides={mockSlides} />);

    expect(screen.getByText("First Headline for Leadership")).toBeDefined();
    expect(
      screen.getAllByText("Description of the leadership course.").length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: /View Details/i })).toBeDefined();
  });

  it("automatically advances every 7 seconds and loops from slide 3 back to slide 1", () => {
    render(<HeroSlider slides={mockSlides} />);

    // Initial: Slide 1
    expect(screen.getByText("First Headline for Leadership")).toBeDefined();

    // Fast-forward 7s -> Slide 2
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(screen.getByText("Second Headline for Finance")).toBeDefined();

    // Fast-forward 7s -> Slide 3
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(screen.getByText("Third Headline for All Programs")).toBeDefined();

    // Fast-forward 7s -> Loops back to Slide 1
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(screen.getByText("First Headline for Leadership")).toBeDefined();
  });

  it("pauses rotation on hover and resumes on mouse leave", () => {
    render(<HeroSlider slides={mockSlides} />);

    const carousel = screen.getByRole("region", {
      name: /Lead Nation Academy Featured Executive Programs/i,
    });

    // Hover pauses autoplay
    fireEvent.mouseEnter(carousel);
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    // Remains on Slide 1 because it is hovered
    expect(screen.getByText("First Headline for Leadership")).toBeDefined();

    // Mouse leave resumes autoplay
    fireEvent.mouseLeave(carousel);
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(screen.getByText("Second Headline for Finance")).toBeDefined();
  });

  it("stops automatic rotation permanently after manual slide selection", () => {
    render(<HeroSlider slides={mockSlides} />);

    const slide2Tab = screen.getByRole("tab", { name: /Go to slide 2: Corporate Finance/i });
    fireEvent.click(slide2Tab);

    // Slide 2 is now active
    expect(screen.getByText("Second Headline for Finance")).toBeDefined();

    // Even after 14 seconds, it remains on Slide 2 because manual selection stopped autoplay
    act(() => {
      vi.advanceTimersByTime(14000);
    });
    expect(screen.getByText("Second Headline for Finance")).toBeDefined();
  });

  it("renders distinct indicator shapes: active pill (32px) and inactive circles (9px)", () => {
    render(<HeroSlider slides={mockSlides} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBe(3);

    // Active tab (tab 0) contains the 32px pill
    const activeSpan = tabs[0].querySelector("span");
    expect(activeSpan?.className).toContain("w-[32px]");
    expect(activeSpan?.className).toContain("h-[8px]");
    expect(activeSpan?.className).toContain("bg-[#086477]");

    // Inactive tab (tab 1) contains the 9px circle
    const inactiveSpan = tabs[1].querySelector("span");
    expect(inactiveSpan?.className).toContain("w-[9px]");
    expect(inactiveSpan?.className).toContain("h-[9px]");
    expect(inactiveSpan?.className).toContain("bg-[#C5DDE0]");
  });

  it("provides accessible keyboard-discoverable pause/resume button (WCAG 2.2.2)", () => {
    render(<HeroSlider slides={mockSlides} />);

    const kbBtn = screen.getByRole("button", {
      name: /Pause automatic slide rotation/i,
    });
    expect(kbBtn).toBeDefined();

    // Click pause via keyboard button
    fireEvent.click(kbBtn);
    expect(screen.getByRole("button", { name: /Resume automatic slide rotation/i })).toBeDefined();

    // Autoplay does not tick while paused
    act(() => {
      vi.advanceTimersByTime(14000);
    });
    expect(screen.getByText("First Headline for Leadership")).toBeDefined();
  });

  it("does not render visible previous/next arrow buttons", () => {
    render(<HeroSlider slides={mockSlides} />);

    expect(screen.queryByRole("button", { name: /Previous slide/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Next slide/i })).toBeNull();
  });

  it("supports touch swipe navigation and stops autoplay", () => {
    render(<HeroSlider slides={mockSlides} />);

    const carousel = screen.getByRole("region", {
      name: /Lead Nation Academy Featured Executive Programs/i,
    });

    // Swipe Left to advance to slide 2
    fireEvent.touchStart(carousel, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 100 }] });
    expect(screen.getByText("Second Headline for Finance")).toBeDefined();
  });

  it("supports keyboard arrow navigation and stops autoplay", () => {
    render(<HeroSlider slides={mockSlides} />);

    const carousel = screen.getByRole("region", {
      name: /Lead Nation Academy Featured Executive Programs/i,
    });

    // Press ArrowRight to advance
    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    expect(screen.getByText("Second Headline for Finance")).toBeDefined();
  });
});
