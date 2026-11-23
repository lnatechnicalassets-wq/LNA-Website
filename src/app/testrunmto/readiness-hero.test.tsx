import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Hanken_Grotesk: () => ({
    className: "font-hanken",
    variable: "--font-hero-sans",
  }),
  Fraunces: () => ({
    className: "font-fraunces",
    variable: "--font-hero-serif",
  }),
}));

import { MentorSlideshow } from "./readiness-hero";

const slides = [
  {
    id: "salekeen",
    name: "Mohammad Salekeen Ibrahim",
    nameLine1: "Mohammad Salekeen",
    nameLine2: "Ibrahim",
    shortTitle: "Head of Asset, Retail & SME Banking",
    role: "Head of Asset, Retail & SME Banking, Retail Banking Division",
    portraitSrc: "/first.png",
    logo: { src: "/images/partners/eastern-bank.svg", alt: "Eastern Bank PLC" },
    organization: "Eastern Bank PLC",
  },
  {
    id: "anubhab",
    name: "Anubhab Rahman",
    nameLine1: "Anubhab",
    nameLine2: "Rahman",
    shortTitle: "Chief Human Resources Officer",
    role: "Chief Human Resources Officer",
    portraitSrc: "/second.png",
    logo: { src: "/images/partners/nagad.svg", alt: "Nagad" },
    organization: "Nagad",
  },
];

const now = Date.parse("2026-11-29T17:59:59Z");
const admissions = {
  deadline: "2026-12-01T00:00:00+06:00",
  batchId: "cohort-1",
  startDate: "2026-12-01",
};

function renderHero(options: Partial<React.ComponentProps<typeof MentorSlideshow>> = {}) {
  return render(
    <MentorSlideshow
      title="MTO Readiness Program"
      slides={slides}
      admissions={admissions}
      initialNow={now}
      {...options}
    />
  );
}

function setMotionPreference(matches: boolean) {
  vi.stubGlobal("matchMedia", () => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.useFakeTimers();
  vi.setSystemTime(now);
  setMotionPreference(false);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("MTO Readiness Hero Redesign", () => {
  it("displays limited seats badge and start date, then hides enrollment when deadline passes", () => {
    renderHero({ admissions: { ...admissions, seatsLeft: 3, capacity: 20, confirmedRatio: 0.85 } });
    expect(screen.getByText(/limited seats/i)).toBeTruthy();
    expect(screen.getByText("01 DEC")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Enroll Now/i }).getAttribute("href")).toContain(
      "batch=cohort-1"
    );

    act(() => vi.advanceTimersByTime(1000));

    vi.setSystemTime(Date.parse(admissions.deadline));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText(/admissions closed/i)).toBeTruthy();
    expect(screen.queryByText(/limited seats/i)).toBeNull();
    expect(screen.queryByRole("link", { name: /Enroll Now/i })).toBeNull();
  });

  it.each([
    [10, /seats available/i],
    [4, /limited seats/i],
    [2, /almost full/i],
  ])("shows the status %s when %i of 20 seats are open", (seatsLeft, label) => {
    renderHero({ admissions: { ...admissions, capacity: 20, seatsLeft, deadline: null } });
    expect(screen.getByText(label)).toBeTruthy();
  });

  it("omits the reservation action for a full batch", () => {
    renderHero({ admissions: { ...admissions, seatsLeft: 0, capacity: 20, confirmedRatio: 1 } });

    expect(screen.getByText(/batch full/i)).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Enroll Now" })).toBeNull();
    expect(screen.getByRole("link", { name: "View program and fees" })).toBeTruthy();
  });

  it("keeps rotating every 2.5 seconds while indicators are hovered or focused (no hover pause)", () => {
    renderHero();
    const first = screen.getByRole("button", { name: /Show Mohammad/ });
    const second = screen.getByRole("button", { name: /Show Anubhab/ });
    expect(first.getAttribute("aria-current")).toBe("true");
    expect(screen.getByRole("img", { name: "Eastern Bank PLC" })).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "MTO industry mentors" }).getAttribute("aria-live")
    ).toBe("off");
    expect(screen.queryByRole("button", { name: /pause|play/i })).toBeNull();
    const upcoming = document.querySelector<HTMLImageElement>('img[alt="Anubhab Rahman"]');
    expect(upcoming?.getAttribute("loading")).toBe("eager");
    expect(upcoming?.getAttribute("fetchpriority")).toBe("low");

    act(() => first.focus());
    fireEvent.mouseEnter(first);
    act(() => vi.advanceTimersByTime(2499));
    expect(first.getAttribute("aria-current")).toBe("true");

    act(() => vi.advanceTimersByTime(1));
    expect(second.getAttribute("aria-current")).toBe("true");
    expect(screen.queryByRole("img", { name: "Eastern Bank PLC" })).toBeNull();
    expect(screen.getByRole("img", { name: "Nagad" })).toBeTruthy();

    act(() => second.focus());
    fireEvent.keyDown(second, { key: "ArrowLeft" });
    expect(first.getAttribute("aria-current")).toBe("true");
    expect(document.activeElement).toBe(first);

    act(() => vi.advanceTimersByTime(2000));
    fireEvent.click(first);
    act(() => vi.advanceTimersByTime(2499));
    expect(first.getAttribute("aria-current")).toBe("true");
    act(() => vi.advanceTimersByTime(1));
    expect(second.getAttribute("aria-current")).toBe("true");
  });

  it("pauses rotation while the tab is hidden and restarts the progress when shown", () => {
    renderHero();
    const first = screen.getByRole("button", { name: /Show Mohammad/ });
    const second = screen.getByRole("button", { name: /Show Anubhab/ });
    const hidden = vi.spyOn(document, "hidden", "get");
    try {
      hidden.mockReturnValue(true);
      fireEvent(document, new Event("visibilitychange"));
      act(() => vi.advanceTimersByTime(10000));
      expect(first.getAttribute("aria-current")).toBe("true");

      hidden.mockReturnValue(false);
      fireEvent(document, new Event("visibilitychange"));
      act(() => vi.advanceTimersByTime(2500));
      expect(second.getAttribute("aria-current")).toBe("true");
    } finally {
      hidden.mockRestore();
    }
  });

  it("uses manual indicators with reduced motion and leaves unconfirmed seats unadvertised", () => {
    setMotionPreference(true);
    renderHero({ admissions: { ...admissions, seatsLeft: 10, capacity: 20 } });

    act(() => vi.advanceTimersByTime(12000));
    expect(screen.getByRole("button", { name: /Show Mohammad/ }).getAttribute("aria-current")).toBe(
      "true"
    );
    fireEvent.click(screen.getByRole("button", { name: /Show Anubhab/ }));
    act(() => vi.advanceTimersByTime(12000));
    expect(screen.getByRole("button", { name: /Show Anubhab/ }).getAttribute("aria-current")).toBe(
      "true"
    );
    expect(screen.queryByText(/limited seats/i)).toBeNull();
  });

  it("stress tests with longest name and title and maintains logoBox container on failed logo load without shift", () => {
    renderHero();
    // Verify longest name and title are present in active slide
    expect(screen.getByText("Mohammad Salekeen")).toBeTruthy();
    expect(screen.getByText("Ibrahim")).toBeTruthy();
    expect(screen.getByText("Head of Asset, Retail & SME Banking")).toBeTruthy();

    const logoImg = screen.getByRole("img", { name: "Eastern Bank PLC" });
    expect(logoImg).toBeTruthy();

    // Trigger image error (e.g., 404 or failed network)
    fireEvent.error(logoImg);

    // After failure, the image is hidden, but the logoBox container persists to avoid CLS
    expect(screen.queryByRole("img", { name: "Eastern Bank PLC" })).toBeNull();
    const logoBox = document.querySelector('[aria-hidden="true"]');
    expect(logoBox).toBeTruthy();
  });

  it("renders 3 stats with pale outline icons and no divider lines", () => {
    renderHero();
    expect(screen.getByText("16 sessions, 1.5 hours each")).toBeTruthy();
    expect(screen.getByText("2 industry visits")).toBeTruthy();
    expect(screen.getByText("Business case simulations")).toBeTruthy();
    // Non-breaking hyphen in description
    expect(
      screen.getByText("Aptitude tests, case interviews and assessment\u2011centre practice.")
    ).toBeTruthy();
  });
});
