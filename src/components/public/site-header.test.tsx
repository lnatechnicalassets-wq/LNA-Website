import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SiteHeader } from "./site-header";
import type { NavigationConfig, Organization } from "@/lib/content";

const mockNav: NavigationConfig = {
  provenance: {
    class: "B",
    verified: false,
    source: "Test navigation source",
    verifiedBy: null,
    verifiedOn: null,
  },
  header: {
    navItems: [
      { label: "Courses", href: "/courses" },
      { label: "About", href: "/about" },
      { label: "Status", href: "/status" },
    ],
    cta: { label: "Browse Courses", href: "/courses" },
  },
  footer: {
    columns: [],
    bottomNote: "Test footer note",
    demoNotice: "Test demo notice",
  },
};

const mockOrg: Organization = {
  name: "Lead Nation Academy",
  shortName: "LNA",
  domain: "lnabd.org",
  email: "info@lnabd.org",
  phone: "+880 1700-000000",
  address: {
    street: "Road 27",
    city: "Dhaka",
    postalCode: "1209",
    country: "Bangladesh",
  },
  businessHours: "9am - 6pm",
  provenance: {
    class: "B",
    verified: false,
    source: "Test org source",
    verifiedBy: null,
    verifiedOn: null,
  },
};

describe("SiteHeader Component (WCAG 2.2 AA)", () => {
  it("renders banner landmark and organization branding", () => {
    render(<SiteHeader navigation={mockNav} organization={mockOrg} />);
    expect(screen.getByRole("banner")).toBeDefined();
    expect(screen.getByRole("link", { name: /Lead Nation Academy Home/i })).toBeDefined();
  });

  it("renders desktop navigation links and CTA", () => {
    render(<SiteHeader navigation={mockNav} organization={mockOrg} />);
    expect(screen.getByRole("link", { name: "Courses" })).toBeDefined();
    expect(screen.getByRole("link", { name: "About" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Status" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Browse Courses" })).toBeDefined();
  });

  it("renders mobile menu trigger with aria-label and aria-expanded", () => {
    render(<SiteHeader navigation={mockNav} organization={mockOrg} />);
    const trigger = screen.getByRole("button", { name: /Open Navigation Menu/i });
    expect(trigger).toBeDefined();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });
});
