import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CourseDetailPage, { generateMetadata, generateStaticParams } from "./page";

// Mock next/navigation notFound
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

describe("CourseDetailPage", () => {
  it("renders course details with approved CMS data", async () => {
    const Component = await CourseDetailPage({
      params: Promise.resolve({ slug: "data-analytics" }),
    });
    render(Component);

    // Course title
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Data Analytics & Business Intelligence/i,
      })
    ).toBeDefined();

    // Category and status
    expect(screen.getByText(/Skill Development/i)).toBeDefined();
    expect(screen.getByText(/Open for Enrollment/i)).toBeDefined();

    // Formatted fee (Rule R5)
    expect(screen.getByText(/BDT 6,500/i)).toBeDefined();

    // Modules
    expect(screen.getByText(/Curriculum Structure/i)).toBeDefined();
    expect(screen.getByText(/Data Engineering & Dashboard Architecture/i)).toBeDefined();

    // Learning outcomes
    expect(screen.getByText(/Work with real enterprise datasets/i)).toBeDefined();

    // Assigned mentors link to mentor profile
    const mentorLink = screen.getByRole("link", {
      name: /view faculty profile of tahmid ahmed/i,
    });
    expect(mentorLink).toBeDefined();
    expect(mentorLink.getAttribute("href")).toBe("/mentors/mentor-da-01");
  });

  it("generates correct metadata for valid course", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "data-analytics" }),
    });

    expect(metadata.title).toContain("Data Analytics & Business Intelligence");
  });

  it("generates static parameters for all 6 catalog courses", async () => {
    const params = await generateStaticParams();
    expect(params.length).toBe(6);
    expect(params.map((p) => p.slug)).toContain("data-analytics");
    expect(params.map((p) => p.slug)).toContain("executive-leadership");
  });
});
