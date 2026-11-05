import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
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

describe("HeroSlider Component (FR-PUB-003, FR-PUB-004, WCAG 2.2 AA)", () => {
  it("renders active slide with headline, description, and CTAs", () => {
    render(<HeroSlider slides={mockSlides} />);

    expect(screen.getByText("First Headline for Leadership")).toBeDefined();
    expect(
      screen.getAllByText("Description of the leadership course.").length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: /View Details/i })).toBeDefined();
  });

  it("navigates slides on indicator click", () => {
    render(<HeroSlider slides={mockSlides} />);

    const slide2Tab = screen.getByRole("tab", { name: /Go to slide 2: Corporate Finance/i });
    fireEvent.click(slide2Tab);

    // Slide 2 is now active
    expect(screen.getByText("Second Headline for Finance")).toBeDefined();

    const slide1Tab = screen.getByRole("tab", { name: /Go to slide 1: Executive Leadership/i });
    fireEvent.click(slide1Tab);

    // Back to Slide 1
    expect(screen.getByText("First Headline for Leadership")).toBeDefined();
  });

  it("does not render visible previous/next arrow buttons (indicators only)", () => {
    render(<HeroSlider slides={mockSlides} />);

    expect(screen.queryByRole("button", { name: /Previous slide/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Next slide/i })).toBeNull();
  });

  it("supports touch swipe navigation for manual advancement", () => {
    render(<HeroSlider slides={mockSlides} />);

    const carousel = screen.getByRole("region", {
      name: /Lead Nation Academy Featured Executive Programs/i,
    });

    // Swipe Left to advance to slide 2
    fireEvent.touchStart(carousel, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 100 }] });
    expect(screen.getByText("Second Headline for Finance")).toBeDefined();

    // Swipe Right to go back to slide 1
    fireEvent.touchStart(carousel, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 200 }] });
    expect(screen.getByText("First Headline for Leadership")).toBeDefined();
  });

  it("supports keyboard arrow navigation", () => {
    render(<HeroSlider slides={mockSlides} />);

    const carousel = screen.getByRole("region", {
      name: /Lead Nation Academy Featured Executive Programs/i,
    });

    // Press ArrowRight to advance
    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    expect(screen.getByText("Second Headline for Finance")).toBeDefined();

    // Press ArrowLeft to go back
    fireEvent.keyDown(carousel, { key: "ArrowLeft" });
    expect(screen.getByText("First Headline for Leadership")).toBeDefined();
  });

  it("renders dot indicators allowing direct slide selection", () => {
    render(<HeroSlider slides={mockSlides} />);

    const slide3Indicator = screen.getByRole("tab", { name: /Go to slide 3: All Programs/i });
    fireEvent.click(slide3Indicator);

    expect(screen.getByText("Third Headline for All Programs")).toBeDefined();
  });
});
