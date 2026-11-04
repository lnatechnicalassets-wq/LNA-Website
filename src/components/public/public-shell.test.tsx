import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PublicShell } from "./public-shell";
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
    navItems: [{ label: "Courses", href: "/courses" }],
    cta: { label: "Browse", href: "/courses" },
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

describe("PublicShell Component (WCAG 2.2 AA)", () => {
  it("renders skip link, header, main landmark with id, and footer", () => {
    render(
      <PublicShell navigationOverride={mockNav} organizationOverride={mockOrg}>
        <div>Main Page Content</div>
      </PublicShell>
    );

    // Skip link
    expect(screen.getByRole("link", { name: /Skip to main content/i })).toBeDefined();

    // Banner landmark (header)
    expect(screen.getByRole("banner")).toBeDefined();

    // Main landmark with id="main-content"
    const main = screen.getByRole("main");
    expect(main).toBeDefined();
    expect(main.id).toBe("main-content");
    expect(screen.getByText("Main Page Content")).toBeDefined();

    // Contentinfo landmark (footer)
    expect(screen.getByRole("contentinfo")).toBeDefined();
  });
});
