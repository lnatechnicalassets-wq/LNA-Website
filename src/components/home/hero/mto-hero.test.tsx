import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MtoHero } from "./mto-hero";
import type { MtoHeroCourse } from "@/server/catalog/mto-hero";

const mockProgram: MtoHeroCourse = {
  copy: {
    eyebrow: "Management Trainee Officer Program",
    eyebrowParts: ["MANAGEMENT TRAINEE", "OFFICER PROGRAM"],
    headline: ["MTO", "Readiness"],
    subtitleParts: ["Mentor-led preparation", "for future MTOs"],
    description: "Mentor-led preparation for future MTOs",
    visits: "2 industry visits",
    mentor: "Industry mentor",
    program: "View Program",
    enroll: "Enroll Now",
    closed: "Enrollment unavailable",
    limited: "Limited Time",
    countdownLabel: "Admissions Close In",
  },
  programHref: "/courses/mto-readiness",
  enrollHref: "/enroll?course=mto-readiness&batch=batch-mto-2026-01",
  limited: true,
  deadline: "2026-12-01T23:59:59+06:00",
  stats: ["16 Sessions (1.5h each)", "2 industry visits", "BDT 7,500"],
  roster: [
    {
      id: "mentor-manik",
      name: "Md. Manik Hossain",
      role: "Head of HR Strategy & OD",
      organization: "Nagad Ltd.",
      portrait: "/images/mentors/manik.png",
      logo: { src: "/images/partners/nagad.png", alt: "Nagad Ltd." },
    },
  ],
};

describe("MtoHero Component", () => {
  it("renders the eyebrow with two lines and teal rule", () => {
    render(<MtoHero program={mockProgram} />);
    expect(screen.getByText("MANAGEMENT TRAINEE")).toBeDefined();
    expect(screen.getByText(/OFFICER PROGRAM/)).toBeDefined();
  });

  it("renders the headline with MTO and READINESS elements", () => {
    render(<MtoHero program={mockProgram} />);
    const heading = screen.getByRole("heading", { level: 1, name: /MTO Readiness/i });
    expect(heading).toBeDefined();
    expect(screen.getByText("MTO")).toBeDefined();
    expect(screen.getByText("Readiness")).toBeDefined();
  });

  it("renders the subtitle with intended two-part structure", () => {
    render(<MtoHero program={mockProgram} />);
    expect(screen.getByText("Mentor-led preparation")).toBeDefined();
    expect(screen.getByText("for future MTOs")).toBeDefined();
  });

  it("formats the facts row with bold first value and regular duration", () => {
    const { container } = render(<MtoHero program={mockProgram} />);
    expect(screen.getByText("16 sessions")).toBeDefined();
    expect(screen.getByText("· 1.5 hours each")).toBeDefined();
    expect(screen.getByText("2 industry visits")).toBeDefined();
    expect(screen.getByText("BDT 7,500")).toBeDefined();
    const feeItem = container.querySelector('[data-fee="true"]');
    expect(feeItem).toBeDefined();
    expect(feeItem?.textContent).toContain("BDT 7,500");
  });

  it("renders the View Program link pointing to the MTO course page", () => {
    render(<MtoHero program={mockProgram} />);
    const link = screen.getByRole("link", { name: /View Program/i });
    expect(link.getAttribute("href")).toBe("/courses/mto-readiness");
  });

  it("renders the mentor spotlight with Industry Mentor, Manik name, role, and organization", () => {
    const { container } = render(<MtoHero program={mockProgram} />);
    expect(screen.getByText("Admissions Close In")).toBeDefined();
    expect(screen.getByText("Industry mentor")).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: "Md. Manik Hossain" })).toBeDefined();
    expect(screen.getByText("Head of HR Strategy & OD")).toBeDefined();
    expect(screen.getByText("Nagad Ltd.")).toBeDefined();

    const portraitSlide = container.querySelector('[data-mentor="mentor-manik"]');
    expect(portraitSlide).toBeDefined();
  });

  it("renders the Enroll Now action with Limited Time badge when open", () => {
    render(<MtoHero program={mockProgram} />);
    const enrollLink = screen.getByRole("link", { name: /Enroll Now/i });
    expect(enrollLink.getAttribute("href")).toBe(mockProgram.enrollHref);
    expect(screen.getByText("Limited Time")).toBeDefined();
  });

  it("renders the closed message when enrollment is not available", () => {
    render(<MtoHero program={{ ...mockProgram, enrollHref: null }} />);
    expect(screen.getByText("Enrollment unavailable")).toBeDefined();
    expect(screen.queryByRole("link", { name: /Enroll Now/i })).toBeNull();
  });
});
