import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HomePage from "./page";

describe("HomePage - Phase 2 Design System Showcase", () => {
  it("renders the primary Lead Nation Academy heading", () => {
    render(<HomePage />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeDefined();
    expect(heading.textContent).toContain("Lead Nation Academy");
  });

  it("renders the accessible demo logo emblem", () => {
    render(<HomePage />);
    const logoEmblem = screen.getByRole("img", { name: /Lead Nation Academy Emblem/i });
    expect(logoEmblem).toBeDefined();
  });

  it("renders all four semantic status indicators with explicit text labels (SRS 11.1)", () => {
    render(<HomePage />);
    expect(screen.getByText(/Active \/ Confirmed/i)).toBeDefined();
    expect(screen.getByText(/Seat Hold \(30 min\)/i)).toBeDefined();
    expect(screen.getByText(/Expired \/ Failed/i)).toBeDefined();
    expect(screen.getByText(/Offline Batch/i)).toBeDefined();
  });

  it("renders interactive action buttons with visible focusable attributes", () => {
    render(<HomePage />);
    const primaryBtn = screen.getByRole("button", { name: /Primary Action/i });
    const accentBtn = screen.getByRole("button", { name: /Accent Action/i });
    expect(primaryBtn).toBeDefined();
    expect(accentBtn).toBeDefined();
  });

  it("renders the design system token showcase sections", () => {
    render(<HomePage />);
    expect(screen.getByText(/1\. Brand Palette & Color Tokens/i)).toBeDefined();
    expect(screen.getByText(/2\. Semantic Status Indicators/i)).toBeDefined();
    expect(screen.getByText(/3\. Typography Scale & Surface Elevation/i)).toBeDefined();
    expect(screen.getByText(/4\. Responsive Breakpoint Adaptation/i)).toBeDefined();
  });
});
