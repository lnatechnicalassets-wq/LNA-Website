import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SkipLink } from "./skip-link";

describe("SkipLink Component (WCAG 2.2 AA 2.4.1 Bypass Blocks)", () => {
  it("renders with default href and text label", () => {
    render(<SkipLink />);
    const link = screen.getByRole("link", { name: /Skip to main content/i });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("#main-content");
    expect(link.className).toContain("sr-only");
    expect(link.className).toContain("focus:not-sr-only");
  });

  it("supports custom targetId and custom label", () => {
    render(<SkipLink targetId="custom-target" label="Skip to primary content" />);
    const link = screen.getByRole("link", { name: /Skip to primary content/i });
    expect(link.getAttribute("href")).toBe("#custom-target");
  });
});
