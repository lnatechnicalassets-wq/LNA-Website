// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, vi } from "vitest";
import { getNavigationConfig, NavigationConfigSchema } from "./navigation";
import { getOrganizationConfig, OrganizationSchema } from "./organization";
import { getHomeRepository, JsonContentRepository } from "./repository";

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

  it("loads and validates official Banani address and phone in organization.json", () => {
    const org = getOrganizationConfig();
    expect(org).toBeDefined();
    expect(org.name).toBe("Lead Nation Academy");
    expect(org.email).toBe("info@lnabd.org");
    expect(org.phone).toBe("+880 1326-760702");
    expect(org.address.street).toBe("Level-5, House-57, Road No. 11, Banani");
    expect(org.address.city).toBe("Dhaka");
    expect(org.address.postalCode).toBe("1213");

    // Validate Zod schema conforms
    expect(() => OrganizationSchema.parse(org)).not.toThrow();
  });

  it("loads official Banani contact config with visible phone enabled", async () => {
    const contact = await getHomeRepository().getContactConfig();
    expect(contact.phone).toBe("+8801326760702");
    expect(contact.phoneDisplay).toBe("+880 1326-760702");
    expect(contact.officeAddress.line1).toBe("Level-5, House-57");
    expect(contact.officeAddress.line2).toBe("Road No. 11, Banani");
    expect(contact.officeAddress.city).toBe("Dhaka 1213");
    expect(contact.visibility.showPhone).toBe(true);
  });

  it("reloads updated contact JSON in development mode without holding stale in-memory cache", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lna-content-dev-cache-"));
    const homeDir = path.join(tmpDir, "home");
    fs.mkdirSync(homeDir, { recursive: true });

    const contactFile = path.join(homeDir, "contact.json");
    const baseContact = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "content", "home", "contact.json"), "utf-8")
    );
    fs.writeFileSync(
      contactFile,
      JSON.stringify({
        ...baseContact,
        officeAddress: {
          ...baseContact.officeAddress,
          line1: "Old Street 1",
        },
      })
    );

    vi.stubEnv("NODE_ENV", "development");
    try {
      const repo = new JsonContentRepository(tmpDir);
      const first = await repo.getContactConfig();
      expect(first.officeAddress.line1).toBe("Old Street 1");

      fs.writeFileSync(contactFile, JSON.stringify(baseContact));
      const second = await repo.getContactConfig();
      expect(second.officeAddress.line1).toBe("Level-5, House-57");
    } finally {
      vi.unstubAllEnvs();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
