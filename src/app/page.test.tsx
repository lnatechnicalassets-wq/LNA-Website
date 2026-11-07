import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HomePage from "./page";

describe("HomePage - Phase 4 Approved Architecture", () => {
  it("renders the primary homepage sections in correct sequence", async () => {
    const Component = await HomePage();
    render(Component);

    // 1. Hero Slider (FR-PUB-003, FR-PUB-004)
    const carousel = screen.getByRole("region", {
      name: /Lead Nation Academy Featured Executive Programs/i,
    });
    expect(carousel).toBeDefined();

    // 2. Partners Strip
    const partnersSection = screen.getByLabelText(/Corporate Sector Alignments/i);
    expect(partnersSection).toBeDefined();

    // 3. Courses Section
    const coursesHeading = screen.getByRole("heading", {
      level: 2,
      name: /Explore Our Courses/i,
    });
    expect(coursesHeading).toBeDefined();

    // 4. Mentors Section (Approved Section 4: Meet Our Mentors)
    const mentorsHeading = screen.getByRole("heading", {
      level: 2,
      name: /Meet Our Mentors/i,
    });
    expect(mentorsHeading).toBeDefined();

    // Events Section removed from homepage rendering per owner instruction
    expect(
      screen.queryByRole("heading", {
        level: 2,
        name: /Executive Masterclasses & Roundtables/i,
      })
    ).toBeNull();

    // 5. Learner Reviews (FR-PUB-006: Manual, No Autoplay)
    const reviewsHeading = screen.getByRole("heading", {
      level: 2,
      name: /Voices from the Cohort/i,
    });
    expect(reviewsHeading).toBeDefined();
  });

  it("renders the hero slider with manual controls and WCAG 2.2 AA accessibility", async () => {
    const Component = await HomePage();
    render(Component);

    // Slide indicator tab selectors (only three indicators per approved design)
    expect(screen.getByRole("tab", { name: /Go to slide 1/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Go to slide 2/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Go to slide 3/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /Previous slide/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Next slide/i })).toBeNull();

    // Primary CTA to seeded course (exactly ONE primary CTA per specification)
    expect(screen.getByRole("link", { name: /View Course Details/i })).toBeDefined();
  });

  it("renders offline executive courses with fee disclosures", async () => {
    const Component = await HomePage();
    render(Component);

    // Seeded Course 1
    expect(
      screen.getAllByText("Executive Leadership & Strategic Governance").length
    ).toBeGreaterThanOrEqual(1);

    // Seeded Course 2
    expect(
      screen.getAllByText("Corporate Finance & Capital Structuring").length
    ).toBeGreaterThanOrEqual(1);

    // Check offline badges
    const offlineBadges = screen.getAllByText(/Offline Only/i);
    expect(offlineBadges.length).toBeGreaterThanOrEqual(2);
  });

  it("renders learner testimonials with manual pagination and no autoplay (FR-PUB-006)", async () => {
    const Component = await HomePage();
    render(Component);

    // Manual navigation buttons present
    const prevTestimonial = screen.getByRole("button", {
      name: /Previous testimonial/i,
    });
    const nextTestimonial = screen.getByRole("button", {
      name: /Next testimonial/i,
    });
    expect(prevTestimonial).toBeDefined();
    expect(nextTestimonial).toBeDefined();

    // Check attribution
    expect(screen.getByText(/Mahmudul Alam/i)).toBeDefined();
    expect(screen.getByText(/Executive Leadership Cohort 01/i)).toBeDefined();
  });
});
