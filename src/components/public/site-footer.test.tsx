import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SiteFooter } from "./site-footer";
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
    navItems: [],
    cta: { label: "Enroll", href: "/courses" },
  },
  footer: {
    columns: [],
    bottomNote: "© 2026 Lead Nation Academy.",
    demoNotice: "Demo footer notice.",
  },
};

const mockOrg: Organization = {
  name: "Lead Nation Academy",
  shortName: "LNA",
  domain: "lnabd.org",
  email: "info@lnabd.org",
  phone: "+880 1700-000000",
  address: {
    street: "Dhanmondi Road 27",
    city: "Dhaka",
    postalCode: "1209",
    country: "Bangladesh",
  },
  businessHours: "Sat - Thu 9am - 6pm",
  provenance: {
    class: "B",
    verified: false,
    source: "Test org source",
    verifiedBy: null,
    verifiedOn: null,
  },
};

describe("SiteFooter Component (WCAG 2.2 AA)", () => {
  it("renders contentinfo landmark and organization branding", () => {
    render(<SiteFooter navigation={mockNav} organization={mockOrg} />);
    expect(screen.getByRole("contentinfo")).toBeDefined();
    expect(screen.getByRole("link", { name: /Lead Nation Academy Home/i })).toBeDefined();
    expect(screen.getByText("info@lnabd.org")).toBeDefined();
  });

  it("renders editorial navigation columns and CTA", () => {
    render(<SiteFooter navigation={mockNav} organization={mockOrg} />);
    expect(screen.getByRole("heading", { level: 2, name: /Ready for your/i })).toBeDefined();
    expect(screen.getByRole("heading", { level: 3, name: "Explore" })).toBeDefined();
    expect(screen.getByRole("heading", { level: 3, name: "Policies" })).toBeDefined();
    expect(screen.getByRole("heading", { level: 3, name: "Get in touch" })).toBeDefined();
    expect(screen.getByRole("link", { name: /Enroll Now/i })).toBeDefined();
    expect(screen.getByText(/All rights reserved/i)).toBeDefined();
  });
});
