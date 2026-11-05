import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PartnersSection } from "./partners-section";
import type { Partner } from "@/lib/content";

const mockPartners: Partner[] = [
  {
    id: "partner-banking",
    name: "Apex Financial",
    sector: "Banking & Capital Markets",
    badgeText: "Demo Wordmark",
    isPlaceholder: true,
    order: 1,
    provenance: {
      class: "B",
      verified: false,
      source: "Mock Seed",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
  {
    id: "partner-rmg",
    name: "Crestline Enterprise",
    sector: "Industrial & Manufacturing",
    badgeText: "Demo Wordmark",
    isPlaceholder: true,
    order: 2,
    provenance: {
      class: "B",
      verified: false,
      source: "Mock Seed",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
  {
    id: "partner-telecom",
    name: "Telenex Global",
    sector: "Telecommunications & Infra",
    badgeText: "Demo Wordmark",
    isPlaceholder: true,
    order: 3,
    provenance: {
      class: "B",
      verified: false,
      source: "Mock Seed",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
];

describe("PartnersSection Component (Continuous Motion, Minimal Institutional, WCAG 2.2 AA)", () => {
  it("renders centered 'Our Partners' heading and partner wordmarks without prominent visible icon", () => {
    render(<PartnersSection partners={mockPartners} />);

    expect(screen.getByRole("heading", { level: 2, name: /Our Partners/i })).toBeDefined();
    expect(screen.getAllByText(/APEX/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CRESTLINE/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/TELENEX/i).length).toBeGreaterThan(0);
  });

  it("toggles marquee animation with accessible keyboard button and touch track click (WCAG 2.2.2)", () => {
    render(<PartnersSection partners={mockPartners} />);

    // 1. Keyboard-discoverable toggle button
    const kbButton = screen.getByRole("button", {
      name: /Pause partner logos movement/i,
    });
    expect(kbButton).toBeDefined();

    fireEvent.click(kbButton);
    expect(screen.getByRole("button", { name: /Resume partner logos movement/i })).toBeDefined();

    // 2. Track click toggle for touch users
    const track = screen.getByRole("region", {
      name: /Partner organizations/i,
    });
    fireEvent.click(track);
    expect(screen.getByRole("button", { name: /Pause partner logos movement/i })).toBeDefined();
  });

  it("identifies demonstration wordmarks accessibly (Rule R15)", () => {
    render(<PartnersSection partners={mockPartners} />);

    const demoLabels = screen.getAllByText(/Demonstration Wordmark/i);
    expect(demoLabels.length).toBeGreaterThan(0);
  });

  it("returns null when partners array is empty", () => {
    const { container } = render(<PartnersSection partners={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
