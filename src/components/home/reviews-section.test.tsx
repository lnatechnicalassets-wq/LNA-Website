import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ReviewsSection } from "./reviews-section";
import type { Review } from "@/lib/content";
import { DEFAULT_IRGP_DATA } from "@/lib/content";

const mockReviews: Review[] = [
  {
    id: "review-01",
    quote:
      "The IRGP gave me hands-on learning, real industry exposure, and the confidence to apply my skills in a professional environment.",
    author: "Farzana Yasmin",
    designation: "IRGP Participant",
    company: "Apex Footwear",
    program: "Industry Readiness Graduate Program (IRGP)",
    cohort: "Cohort 1",
    portraitSrc: "/images/learner-farzana.jpg",
    rating: 4.8,
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
      "LNA's practical, job-focused training gave me the confidence and skills to land my first full-time role.",
    author: "Nusrat Jahan",
    designation: "Management Trainee",
    company: "City Bank",
    program: "MTO Readiness Program",
    cohort: "MTO Cohort 04",
    portraitSrc: "/images/learner-nusrat.jpg",
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
      "The hands-on frameworks and case studies completely shifted how I approach product discovery and stakeholder alignment.",
    author: "Tanvir Ahmed",
    designation: "Product Operations Analyst",
    company: "Pathao",
    program: "Product & Growth Masterclass",
    cohort: "Product Cohort 02",
    portraitSrc: "/images/learner-tanvir.jpg",
    rating: 4.9,
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
];

describe("ReviewsSection (Section 5: Real Learning. Real Impact.)", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders heading, IRGP overview card, 2x2 gallery, testimonial card, outcomes strip, and community banner", () => {
    render(<ReviewsSection reviews={mockReviews} irgpData={DEFAULT_IRGP_DATA} />);

    // Header & Eyebrow
    expect(screen.getByText(/Our Impact/i)).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: /Real Learning/i })).toBeDefined();
    expect(screen.getByText(/Real Impact\./i)).toBeDefined();
    expect(
      screen.getByText(
        /Explore the Industry Readiness Graduate Program \(IRGP\) and hear directly/i
      )
    ).toBeDefined();

    // Zone 1: IRGP Overview Card
    expect(screen.getByText("FEATURED SUCCESS STORY")).toBeDefined();
    expect(screen.getByText("Completed Program")).toBeDefined();
    expect(screen.getByText("Industry Readiness Graduate Program (IRGP)")).toBeDefined();
    expect(screen.getAllByText(/Cohort 1/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("button", {
        name: /Explore details of Industry Readiness Graduate Program/i,
      })
    ).toBeDefined();

    // Zone 2: 2x2 Gallery
    expect(screen.getByLabelText(/IRGP Program Photo Gallery/i)).toBeDefined();
    expect(screen.getByText("Skill Development Session")).toBeDefined();
    expect(screen.getByText("Team Project & Practice")).toBeDefined();
    expect(screen.getByText("Mentor-Led Discussion")).toBeDefined();
    expect(screen.getByText("Program Completion")).toBeDefined();

    // Zone 3: Testimonial Card with "Learner Voices"
    expect(screen.getByText("Learner Voices")).toBeDefined();
    expect(screen.getAllByText(/4.8\/5/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Farzana Yasmin")).toBeDefined();
    expect(screen.getByText(/IRGP Participant/i)).toBeDefined();

    // Outcomes Strip with honest informational states (no unverified numbers)
    expect(screen.getByLabelText("IRGP Program Outcomes")).toBeDefined();
    expect(screen.getByText("IRGP PROGRAM OUTCOMES")).toBeDefined();
    expect(screen.getByText("Cohort Status")).toBeDefined();
    expect(screen.getByText("Inaugural Cohort")).toBeDefined();
    expect(screen.getByText("Career Tracking")).toBeDefined();
    expect(screen.getByText("Audit in Progress")).toBeDefined();
    expect(screen.getByText("Program Evaluation")).toBeDefined();
    expect(screen.getByText("Evaluation Pending")).toBeDefined();

    // Community Banner
    expect(screen.getByText(/Join a growing community of/i)).toBeDefined();
    expect(
      screen.getByRole("button", { name: /Join the Lead Nation Academy community/i })
    ).toBeDefined();
  });

  it("opens IRGP story modal when clicking 'Explore the IRGP Story' CTA", () => {
    render(<ReviewsSection reviews={mockReviews} irgpData={DEFAULT_IRGP_DATA} />);

    const ctaBtn = screen.getByRole("button", {
      name: /Explore details of Industry Readiness Graduate Program/i,
    });
    fireEvent.click(ctaBtn);

    // Modal dialog opens
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Program Overview")).toBeDefined();
    expect(screen.getByText("Training Experience & Key Activities")).toBeDefined();
    expect(screen.getByText("Skill Development Workshops")).toBeDefined();
    expect(screen.getByText("Collaborative Team Projects")).toBeDefined();
    expect(screen.getByRole("button", { name: /Explore Current Courses/i })).toBeDefined();
  });

  it("opens photo gallery lightbox when clicking any gallery photo", () => {
    render(<ReviewsSection reviews={mockReviews} irgpData={DEFAULT_IRGP_DATA} />);

    // Click on Photo 1 (Skill Development)
    const photo1 = screen.getByLabelText(/Open photo 1 of 4: Skill Development Session/i);
    fireEvent.click(photo1);

    // Lightbox dialog should open
    expect(screen.getByRole("dialog", { name: /Photo Gallery Lightbox/i })).toBeDefined();
    expect(screen.getByText("1 / 4")).toBeDefined();
    expect(screen.getByText("Executive Skill Development")).toBeDefined();

    // Navigate to next photo via keyboard ArrowRight
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("2 / 4")).toBeDefined();
    expect(screen.getByText("Collaborative Team Projects")).toBeDefined();

    // Navigate to prev photo via keyboard ArrowLeft
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText("1 / 4")).toBeDefined();

    // Dismiss with Escape key
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /Photo Gallery Lightbox/i })).toBeNull();
  });

  it("advances testimonial on next arrow click and wraps on previous arrow click", () => {
    render(<ReviewsSection reviews={mockReviews} irgpData={DEFAULT_IRGP_DATA} />);

    const nextBtn = screen.getByRole("button", { name: /^Next testimonial$/i });
    const prevBtn = screen.getByRole("button", { name: /^Previous testimonial$/i });

    // Initial: Farzana Yasmin
    expect(screen.getByText("Farzana Yasmin")).toBeDefined();

    // Click Next -> Nusrat Jahan
    fireEvent.click(nextBtn);
    expect(screen.getByText("Nusrat Jahan")).toBeDefined();
    expect(screen.getByText(/MTO Readiness Program/i)).toBeDefined();

    // Click Prev -> back to Farzana Yasmin
    fireEvent.click(prevBtn);
    expect(screen.getByText("Farzana Yasmin")).toBeDefined();

    // Click Prev again -> wraps to Tanvir Ahmed (last item)
    fireEvent.click(prevBtn);
    expect(screen.getByText("Tanvir Ahmed")).toBeDefined();
    expect(screen.getByText(/Product & Growth Masterclass/i)).toBeDefined();
  });

  it("navigates directly when clicking pagination tabs", () => {
    render(<ReviewsSection reviews={mockReviews} irgpData={DEFAULT_IRGP_DATA} />);

    const tab2 = screen.getByRole("tab", { name: /Go to testimonial 2: Nusrat Jahan/i });
    fireEvent.click(tab2);
    expect(screen.getByText("Nusrat Jahan")).toBeDefined();

    const tab3 = screen.getByRole("tab", { name: /Go to testimonial 3: Tanvir Ahmed/i });
    fireEvent.click(tab3);
    expect(screen.getByText("Tanvir Ahmed")).toBeDefined();
  });

  it("automatically advances after configured duration using fake timers", () => {
    vi.useFakeTimers();
    render(<ReviewsSection reviews={mockReviews} irgpData={DEFAULT_IRGP_DATA} />);

    // Initial: Farzana Yasmin
    expect(screen.getByText("Farzana Yasmin")).toBeDefined();

    // Advance 180,000ms (3 minutes)
    act(() => {
      vi.advanceTimersByTime(180000);
    });

    // Should have advanced to Nusrat Jahan
    expect(screen.getByText("Nusrat Jahan")).toBeDefined();

    // Advance another 180,000ms -> Tanvir Ahmed
    act(() => {
      vi.advanceTimersByTime(180000);
    });
    expect(screen.getByText("Tanvir Ahmed")).toBeDefined();
  });

  it("pauses rotation on hover and resumes when mouse leaves", () => {
    vi.useFakeTimers();
    render(<ReviewsSection reviews={mockReviews} irgpData={DEFAULT_IRGP_DATA} />);

    const carousel = screen.getByRole("region", { name: /Learner Testimonials/i });

    // Initial: Farzana Yasmin
    expect(screen.getByText("Farzana Yasmin")).toBeDefined();

    // Advance 60,000ms (1 minute)
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    // Mouse enters -> pauses
    act(() => {
      fireEvent.mouseEnter(carousel);
    });

    // Advance 200,000ms while hovered -> should NOT advance because it's paused!
    act(() => {
      vi.advanceTimersByTime(200000);
    });
    expect(screen.getByText("Farzana Yasmin")).toBeDefined();

    // Mouse leaves -> resumes with remaining time (~120,000ms)
    act(() => {
      fireEvent.mouseLeave(carousel);
    });

    // Advance remaining 120,000ms -> now advances to Nusrat Jahan!
    act(() => {
      vi.advanceTimersByTime(120000);
    });
    expect(screen.getByText("Nusrat Jahan")).toBeDefined();
  });

  it("preserves strict testimonial identity and portraits across transitions", () => {
    render(<ReviewsSection reviews={mockReviews} irgpData={DEFAULT_IRGP_DATA} />);

    // Review 1: Farzana Yasmin
    const farzanaImg = screen.getByAltText("Farzana Yasmin") as HTMLImageElement;
    expect(farzanaImg.src).toContain("learner-farzana.jpg");
    expect(screen.getByText("Farzana Yasmin")).toBeDefined();

    // Navigate to Review 2: Nusrat Jahan
    const tab2 = screen.getByRole("tab", { name: /Go to testimonial 2: Nusrat Jahan/i });
    fireEvent.click(tab2);

    const nusratImg = screen.getByAltText("Nusrat Jahan") as HTMLImageElement;
    expect(nusratImg.src).toContain("learner-nusrat.jpg");
    expect(screen.getByText("Nusrat Jahan")).toBeDefined();
    expect(screen.getByText(/MTO Readiness Program/i)).toBeDefined();

    // Navigate to Review 3: Tanvir Ahmed
    const tab3 = screen.getByRole("tab", { name: /Go to testimonial 3: Tanvir Ahmed/i });
    fireEvent.click(tab3);

    const tanvirImg = screen.getByAltText("Tanvir Ahmed") as HTMLImageElement;
    expect(tanvirImg.src).toContain("learner-tanvir.jpg");
    expect(screen.getByText("Tanvir Ahmed")).toBeDefined();
    expect(screen.getByText(/Product & Growth Masterclass/i)).toBeDefined();
  });

  it("renders metric tooltips on outcomes strip", () => {
    render(<ReviewsSection reviews={mockReviews} irgpData={DEFAULT_IRGP_DATA} />);

    const careerProgressInfoBtn = screen.getByRole("button", {
      name: /About Career Tracking/i,
    });
    expect(careerProgressInfoBtn).toBeDefined();

    // Click opens tooltip
    fireEvent.click(careerProgressInfoBtn);
    expect(screen.getByRole("tooltip")).toBeDefined();
    expect(screen.getByText(/Post-program graduate employment transitions/i)).toBeDefined();
  });
});
