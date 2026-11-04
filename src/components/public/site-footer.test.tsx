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
    columns: [
      {
        title: "Programs",
        links: [{ label: "Executive Track", href: "/courses" }],
      },
      {
        title: "Support",
        links: [{ label: "Helpdesk", href: "/help" }],
      },
    ],
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
  it("renders contentinfo landmark and organization address", () => {
    render(<SiteFooter navigation={mockNav} organization={mockOrg} />);
    expect(screen.getByRole("contentinfo")).toBeDefined();
    expect(screen.getByText(/Dhanmondi Road 27, Dhaka - 1209, Bangladesh/i)).toBeDefined();
    expect(screen.getByText("+880 1700-000000")).toBeDefined();
    expect(screen.getByText("info@lnabd.org")).toBeDefined();
  });

  it("renders navigation columns and legal/demo notices", () => {
    render(<SiteFooter navigation={mockNav} organization={mockOrg} />);
    expect(screen.getByRole("heading", { level: 4, name: "Programs" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Executive Track" })).toBeDefined();
    expect(screen.getByRole("heading", { level: 4, name: "Support" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Helpdesk" })).toBeDefined();
    expect(screen.getByText(/© 2026 Lead Nation Academy\./i)).toBeDefined();
    expect(screen.getByText(/Demo footer notice\./i)).toBeDefined();
  });
});
