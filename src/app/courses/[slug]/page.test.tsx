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
      params: Promise.resolve({ slug: "mto-readiness" }),
    });
    render(Component);

    // Course title
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /MTO Readiness Program/i,
      })
    ).toBeDefined();

    // Category and status
    expect(screen.getByText(/Career Readiness/i)).toBeDefined();
    expect(screen.getByText(/Open for Enrollment/i)).toBeDefined();

    // Formatted fee (Rule R5)
    expect(screen.getByText(/BDT 7,500/i)).toBeDefined();
  });

  it("generates correct metadata for valid course", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "mto-readiness" }),
    });

    expect(metadata.title).toContain("MTO Readiness Program");
  });

  it("generates static parameters for catalog courses", async () => {
    const params = await generateStaticParams();
    expect(params.length).toBe(2);
    expect(params.map((p) => p.slug)).toContain("mto-readiness");
    expect(params.map((p) => p.slug)).toContain("irgp");
  });
});
