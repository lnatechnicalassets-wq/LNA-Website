import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { SiteFooter } from "./site-footer";
import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";
import RefundPolicyPage from "@/app/refund-policy/page";
import type { NavigationConfig, Organization } from "@/lib/content";

afterEach(() => {
  cleanup();
});

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
  phone: "+880 1326-760702",
  address: {
    street: "Level-5, House-57, Road No. 11, Banani",
    city: "Dhaka",
    postalCode: "1213",
    country: "Bangladesh",
  },
  businessHours: "Sat - Thu 9am - 6pm",
  provenance: {
    class: "A",
    verified: true,
    source: "Test org source",
    verifiedBy: "Project Owner",
    verifiedOn: "2026-11-11",
  },
};

describe("SiteFooter Component (WCAG 2.2 AA)", () => {
  it("renders contentinfo landmark, organization branding, phone, and Banani address", () => {
    render(<SiteFooter navigation={mockNav} organization={mockOrg} />);
    expect(screen.getByRole("contentinfo")).toBeDefined();
    expect(screen.getByRole("link", { name: /Lead Nation Academy Home/i })).toBeDefined();
    expect(screen.getByText("info@lnabd.org")).toBeDefined();
    const phoneLink = screen.getByRole("link", { name: "+880 1326-760702" });
    expect(phoneLink.getAttribute("href")).toBe("tel:+8801326760702");
    expect(screen.getByText("Level-5, House-57, Road No. 11, Banani, Dhaka 1213")).toBeDefined();
    expect(screen.queryByText(/Dhanmondi/i)).toBeNull();
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

  it("renders official Banani address and contact phone dynamically on Privacy, Terms, and Refund Policy pages", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByText("Level-5, House-57, Road No. 11, Banani, Dhaka - 1213, Bangladesh")
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "+880 1326-760702" }).getAttribute("href")).toBe(
      "tel:+8801326760702"
    );
    expect(screen.queryByText(/Tejgaon|1581-799666|1857-887968/i)).toBeNull();

    cleanup();
    render(<TermsPage />);
    expect(
      screen.getByText("Level-5, House-57, Road No. 11, Banani, Dhaka - 1213, Bangladesh")
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "+880 1326-760702" }).getAttribute("href")).toBe(
      "tel:+8801326760702"
    );
    expect(screen.queryByText(/Tejgaon|1581-799666|1857-887968/i)).toBeNull();

    cleanup();
    render(<RefundPolicyPage />);
    expect(screen.queryByText(/Dhanmondi/i)).toBeNull();
    expect(screen.getByText(/in-person executive sessions in Dhaka/i)).toBeDefined();
  });
});
