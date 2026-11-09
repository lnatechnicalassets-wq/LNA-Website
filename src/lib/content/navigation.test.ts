// @vitest-environment node
import { describe, it, expect } from "vitest";
import { getNavigationConfig, NavigationConfigSchema } from "./navigation";
import { getOrganizationConfig, OrganizationSchema } from "./organization";

describe("Navigation & Organization Content Repositories (P2-T3)", () => {
  it("loads and validates navigation.json against NavigationConfigSchema", () => {
    const nav = getNavigationConfig();
    expect(nav).toBeDefined();
    expect(nav.header.navItems.length).toBeGreaterThan(0);
    expect(nav.footer.columns.length).toBeGreaterThan(0);
    expect(nav.provenance.class).toBe("B");

    // Validate Zod schema conforms
    expect(() => NavigationConfigSchema.parse(nav)).not.toThrow();
  });

  it("loads and validates organization.json against OrganizationSchema", () => {
    const org = getOrganizationConfig();
    expect(org).toBeDefined();
    expect(org.name).toBe("Lead Nation Academy");
    expect(org.email).toBe("info@lnabd.org");
    expect(org.address.city).toBe("Dhaka");
    expect(["A", "B"]).toContain(org.provenance.class);

    // Validate Zod schema conforms
    expect(() => OrganizationSchema.parse(org)).not.toThrow();
  });
});
