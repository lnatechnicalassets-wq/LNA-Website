import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "./badge";

describe("Badge Primitive (SRS 11.1 Color + Text Pairs)", () => {
  it("renders with default styling and text content", () => {
    render(<Badge>Verified</Badge>);
    const badge = screen.getByText("Verified");
    expect(badge).toBeDefined();
    expect(badge.className).toContain("bg-surface-muted");
  });

  it("renders status variants correctly", () => {
    const { rerender } = render(<Badge variant="success">Confirmed</Badge>);
    expect(screen.getByText("Confirmed").className).toContain("bg-status-success-bg");

    rerender(<Badge variant="warning">Pending</Badge>);
    expect(screen.getByText("Pending").className).toContain("bg-status-warning-bg");

    rerender(<Badge variant="danger">Failed</Badge>);
    expect(screen.getByText("Failed").className).toContain("bg-status-danger-bg");
  });

  it("renders with dot indicator when dot prop is enabled", () => {
    const { container } = render(
      <Badge variant="success" dot>
        Active Batch
      </Badge>
    );
    const dot = container.querySelector('span[aria-hidden="true"]');
    expect(dot).not.toBeNull();
    expect(dot?.className).toContain("rounded-full");
  });
});

