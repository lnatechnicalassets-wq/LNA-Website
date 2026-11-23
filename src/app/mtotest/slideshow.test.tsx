import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MentorSlideshow } from "./slideshow";

const initialNow = Date.parse("2026-11-22T04:00:00Z");
const slides = [
  {
    id: "first",
    name: "First mentor",
    role: "Industry Mentor",
    organization: "LNA",
    portraitSrc: "/one.png",
  },
  {
    id: "second",
    name: "Second mentor",
    role: "Industry Mentor",
    organization: "LNA",
    portraitSrc: "/two.png",
  },
];

function renderPreview(
  overrides: Partial<React.ComponentProps<typeof MentorSlideshow>["admissions"]> = {}
) {
  return render(
    <MentorSlideshow
      title="MTO Readiness Program"
      slides={slides}
      admissions={{ deadline: null, batchId: "mto-preview", ...overrides }}
      initialNow={initialNow}
    />
  );
}

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.useFakeTimers();
  vi.setSystemTime(initialNow);
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Glass Sweep preview", () => {
  it("exposes a route-specific animation target and switches the visible portrait manually", () => {
    const { container } = renderPreview();
    expect(screen.getByRole("heading", { name: "MTO Readiness Program" }).id).toBe(
      "mtotest-glass-title"
    );
    act(() => vi.advanceTimersByTime(7000));
    expect(
      container.querySelector("[data-mentor]:not([hidden])")?.getAttribute("data-mentor")
    ).toBe("first");
    fireEvent.click(screen.getByRole("button", { name: "Next mentor" }));
    expect(screen.getByText("Second mentor")).toBeTruthy();
    expect(
      container.querySelector("[data-mentor]:not([hidden])")?.getAttribute("data-mentor")
    ).toBe("second");
  });

  it("uses the batch enrollment link and only shows urgency when supplied", () => {
    renderPreview();
    expect(screen.getByRole("link", { name: "Enroll now" }).getAttribute("href")).toContain(
      "batch=mto-preview"
    );
    expect(screen.queryByText("Limited seats")).toBeNull();
  });

  it("removes enrollment when the batch closes", () => {
    renderPreview({ deadline: new Date(initialNow + 1000).toISOString(), limited: true });
    expect(screen.getByText("Limited seats")).toBeTruthy();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("Admissions closed")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Enroll now" })).toBeNull();
  });
});
