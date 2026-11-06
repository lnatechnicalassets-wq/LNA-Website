import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MentorProfilePage, { generateMetadata } from "./page";

// Mock next/navigation notFound
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

describe("MentorProfilePage", () => {
  it("renders mentor profile with approved CMS data", async () => {
    const Component = await MentorProfilePage({
      params: Promise.resolve({ slug: "mentor-leadership-lead" }),
    });
    render(Component);

    // Mentor name
    expect(screen.getByRole("heading", { level: 1, name: /Dr\. Tariq Rahman/i })).toBeDefined();

    // Designation and organization
    expect(screen.getByText(/Lead Faculty, Strategic Governance/i)).toBeDefined();
    expect(screen.getByText(/Corporate Governance Institute/i)).toBeDefined();

    // Back navigation link
    expect(screen.getByRole("link", { name: /return to course catalogue/i })).toBeDefined();

    // Associated course link
    expect(screen.getByText(/Executive Leadership & Strategic Governance/i)).toBeDefined();
  });

  it("generates correct metadata for valid mentor", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "mentor-leadership-lead" }),
    });

    expect(metadata.title).toContain("Dr. Tariq Rahman");
  });
});
