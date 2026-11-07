import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ReviewsSection } from "./reviews-section";
import type { Review } from "@/lib/content";

const mockReviews: Review[] = [
  {
    id: "review-01",
    quote:
      "LNA's practical, job-focused training gave me the confidence and skills to land my first full-time role.",
    author: "Nusrat Jahan",
    designation: "Management Trainee",
    company: "City Bank",
    program: "MTO Readiness Program",
    cohort: "MTO Cohort 04",
    portraitSrc: "/images/learner-nusrat.jpg",
    rating: 5,
    order: 1,
    isPlaceholder: true,
    provenance: {
      class: "B",
      verified: false,
      source: "Test fixture",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
  {
    id: "review-02",
    quote:
      "The hands-on frameworks and case studies completely shifted how I approach product discovery and stakeholder alignment.",
    author: "Tanvir Ahmed",
    designation: "Product Operations Analyst",
    company: "Pathao",
    program: "Product & Growth Masterclass",
    cohort: "Product Cohort 02",
    portraitSrc: "/images/learner-tanvir.jpg",
    rating: 5,
    order: 2,
    isPlaceholder: true,
    provenance: {
      class: "B",
      verified: false,
      source: "Test fixture",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
  {
    id: "review-03",
    quote:
      "Learning directly from senior marketing directors who navigate the Bangladesh market daily made every session invaluable.",
    author: "Sadia Afrin",
    designation: "Associate Brand Strategist",
    company: "Apex Footwear",
    program: "Strategic Brand Marketing",
    cohort: "Marketing Cohort 03",
    portraitSrc: "/images/learner-sadia.jpg",
    rating: 5,
    order: 3,
    isPlaceholder: true,
    provenance: {
      class: "B",
      verified: false,
      source: "Test fixture",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
  {
    id: "review-04",
    quote:
      "The offline boardroom case discussions provided actionable frameworks we immediately integrated into our executive strategic planning cycle.",
    author: "Mahmudul Alam",
    designation: "Director of Operations",
    company: "Leading Telecommunications Group",
    program: "Executive Leadership & Governance",
    cohort: "Executive Leadership Cohort 01",
    portraitSrc: "/images/learner-mahmudul.jpg",
    rating: 5,
    order: 4,
    isPlaceholder: true,
    provenance: {
      class: "B",
      verified: false,
      source: "Test fixture",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
  {
    id: "review-05",
    quote:
      "The financial statement engineering and M&A modeling modules offered practical depth tailored specifically to Bangladesh's banking and regulatory environment.",
    author: "Farzana Yasmin",
    designation: "Head of Corporate Treasury",
    company: "Tier-1 Commercial Bank",
    program: "Corporate Finance & Capital Structuring",
    cohort: "Corporate Finance Cohort 01",
    portraitSrc: "/images/learner-farzana.jpg",
    rating: 5,
    order: 5,
    isPlaceholder: true,
    provenance: {
      class: "B",
      verified: false,
      source: "Test fixture",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
];

describe("ReviewsSection - Section 5 Premium Glass Testimonial Carousel", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders editorial introduction, metrics, and community banner with approved typography", () => {
    render(<ReviewsSection reviews={mockReviews} />);

    // Eyebrow & Heading
    expect(screen.getByText(/Words from Our Learners/i)).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: /Real Learning/i })).toBeDefined();
    expect(screen.getByText(/Real Impact/i)).toBeDefined();

    // 3 Metrics
    expect(screen.getByText("5,000+")).toBeDefined();
    expect(screen.getByText(/Learners Trained/i)).toBeDefined();
    expect(screen.getByText("84%")).toBeDefined();
    expect(screen.getByText(/Career Progress/i)).toBeDefined();
    expect(screen.getByText("4.8/5")).toBeDefined();
    expect(screen.getByText(/Learner Rating/i)).toBeDefined();

    // Primary CTA
    expect(screen.getByRole("button", { name: /See more learner success stories/i })).toBeDefined();

    // Active Card content
    expect(screen.getAllByText(/Nusrat Jahan/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/MTO Readiness Program/i)).toBeDefined();
    expect(screen.getByText(/Management Trainee at City Bank/i)).toBeDefined();

    // Supporting Preview cards
    expect(screen.getByLabelText(/Preview next: Tanvir Ahmed/i)).toBeDefined();
    expect(screen.getByLabelText(/Preview previous: Farzana Yasmin/i)).toBeDefined();

    // Community banner
    expect(screen.getByText(/Join a growing community of/i)).toBeDefined();
    expect(
      screen.getByRole("button", { name: /Join the Lead Nation Academy community/i })
    ).toBeDefined();
  });

  it("advances active review on next arrow click and wraps on previous arrow click", () => {
    render(<ReviewsSection reviews={mockReviews} />);

    const nextBtn = screen.getByRole("button", { name: /^Next testimonial$/i });
    const prevBtn = screen.getByRole("button", { name: /^Previous testimonial$/i });

    // Click Next -> Tanvir Ahmed (review 2)
    fireEvent.click(nextBtn);
    expect(screen.getAllByText(/Tanvir Ahmed/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Product & Growth Masterclass/i)).toBeDefined();

    // Click Prev -> back to Nusrat Jahan (review 1)
    fireEvent.click(prevBtn);
    expect(screen.getAllByText(/Nusrat Jahan/i).length).toBeGreaterThanOrEqual(1);

    // Click Prev again -> wraps to Farzana Yasmin (review 5)
    fireEvent.click(prevBtn);
    expect(screen.getAllByText(/Farzana Yasmin/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Corporate Finance & Capital Structuring/i)).toBeDefined();
  });

  it("navigates directly when clicking supporting preview card or pagination tab", () => {
    render(<ReviewsSection reviews={mockReviews} />);

    // Click right preview card -> Tanvir Ahmed
    const rightPreview = screen.getByLabelText(/Preview next: Tanvir Ahmed/i);
    fireEvent.click(rightPreview);
    expect(screen.getAllByText(/Tanvir Ahmed/i).length).toBeGreaterThanOrEqual(1);

    // Click pagination dot 1 -> Nusrat Jahan
    const tab1 = screen.getByRole("tab", { name: /Go to testimonial 1: Nusrat Jahan/i });
    fireEvent.click(tab1);
    expect(screen.getAllByText(/Nusrat Jahan/i).length).toBeGreaterThanOrEqual(1);
  });

  it("automatically advances after 4 seconds of settled display and resets after manual click", () => {
    vi.useFakeTimers();
    render(<ReviewsSection reviews={mockReviews} />);

    // Initial state: Nusrat Jahan
    expect(screen.getAllByText(/Nusrat Jahan/i).length).toBeGreaterThanOrEqual(1);

    // Advance 4800ms (750ms transition + 4000ms idle display)
    act(() => {
      vi.advanceTimersByTime(4800);
    });

    // Should have advanced to Tanvir Ahmed
    expect(screen.getAllByText(/Tanvir Ahmed/i).length).toBeGreaterThanOrEqual(1);

    // Advance another 4800ms -> Sadia Afrin
    act(() => {
      vi.advanceTimersByTime(4800);
    });
    expect(screen.getAllByText(/Sadia Afrin/i).length).toBeGreaterThanOrEqual(1);

    // Perform manual navigation back to Nusrat Jahan
    const prevBtn = screen.getByRole("button", { name: /^Previous testimonial$/i });
    act(() => {
      fireEvent.click(prevBtn);
    });
    expect(screen.getAllByText(/Tanvir Ahmed/i).length).toBeGreaterThanOrEqual(1);

    // Autoplay should NOT be frozen: advance 4800ms and verify it resumes
    act(() => {
      vi.advanceTimersByTime(4800);
    });
    expect(screen.getAllByText(/Sadia Afrin/i).length).toBeGreaterThanOrEqual(1);
  });

  it("opens the success stories modal when clicking See More Success Stories CTA", () => {
    render(<ReviewsSection reviews={mockReviews} />);

    const ctaBtn = screen.getByRole("button", { name: /See more learner success stories/i });
    fireEvent.click(ctaBtn);

    // Modal dialog opens
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Learner Success Stories")).toBeDefined();
    expect(screen.getByText(/Read comprehensive feedback from professionals/i)).toBeDefined();

    // Contains testimonials list
    expect(screen.getAllByText(/City Bank/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Pathao/i).length).toBeGreaterThanOrEqual(1);
  });

  it("supports keyboard navigation with arrow keys and Space pause toggle", () => {
    render(<ReviewsSection reviews={mockReviews} />);

    const carouselRegion = screen.getByRole("region", { name: /Learner Reviews Carousel/i });

    // Arrow Right navigates forward
    fireEvent.keyDown(carouselRegion, { key: "ArrowRight" });
    expect(screen.getAllByText(/Tanvir Ahmed/i).length).toBeGreaterThanOrEqual(1);

    // Arrow Left navigates backward
    fireEvent.keyDown(carouselRegion, { key: "ArrowLeft" });
    expect(screen.getAllByText(/Nusrat Jahan/i).length).toBeGreaterThanOrEqual(1);

    // Space toggles pause state
    fireEvent.keyDown(carouselRegion, { key: " " });
    expect(screen.getByText(/Testimonial autoplay paused/i)).toBeDefined();

    // Space toggles resume state
    fireEvent.keyDown(carouselRegion, { key: " " });
    expect(screen.getByText(/Testimonial autoplay resumed/i)).toBeDefined();
  });

  it("preserves strict testimonial identity and ensures correct portrait mapping across all transitions", () => {
    render(<ReviewsSection reviews={mockReviews} />);

    // Testimonial 1: Nusrat Jahan
    const nusratImg = screen.getByAltText("Nusrat Jahan") as HTMLImageElement;
    expect(nusratImg.src).toContain("learner-nusrat.jpg");
    expect(screen.getAllByText("Nusrat Jahan").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Management Trainee at City Bank/i)).toBeDefined();

    // Navigate to Testimonial 4: Mahmudul Alam
    const tab4 = screen.getByRole("tab", { name: /Go to testimonial 4: Mahmudul Alam/i });
    fireEvent.click(tab4);

    const mahmudulImg = screen.getByAltText("Mahmudul Alam") as HTMLImageElement;
    expect(mahmudulImg.src).toContain("learner-mahmudul.jpg");
    expect(mahmudulImg.src).not.toContain("mentor-anisur");
    expect(screen.getAllByText("Mahmudul Alam").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Director of Operations at Leading Telecommunications Group/i)
    ).toBeDefined();

    // Navigate to Testimonial 5: Farzana Yasmin
    const tab5 = screen.getByRole("tab", { name: /Go to testimonial 5: Farzana Yasmin/i });
    fireEvent.click(tab5);

    const farzanaImg = screen.getByAltText("Farzana Yasmin") as HTMLImageElement;
    expect(farzanaImg.src).toContain("learner-farzana.jpg");
    expect(screen.getAllByText("Farzana Yasmin").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Head of Corporate Treasury at Tier-1 Commercial Bank/i)).toBeDefined();
  });
});
