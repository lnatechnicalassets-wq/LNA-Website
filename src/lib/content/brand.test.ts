// @vitest-environment node
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getBrandConfig, BrandConfigSchema } from "./brand";
import { loadBrandConfig, generateTokensCss } from "../../../scripts/generate-tokens.mjs";

describe("Brand Content Repository and Design Tokens (P2-T0 & P2-T1)", () => {
  it("loads and validates content/site/brand.json with valid schema", () => {
    const brand = loadBrandConfig();
    expect(brand.name).toBe("Lead Nation Academy");
    expect(brand.shortName).toBe("LNA");
    expect(brand.provenance.class).toBe("B");
    expect(brand.provenance.verified).toBe(false);
  });

  it("loads brand config through the safe @/lib/content repository abstraction (Rule R4)", () => {
    const brand = getBrandConfig();
    expect(brand).toBeDefined();
    expect(brand.colors.primary["800"]).toBe("#086477");
    expect(brand.colors.accent["600"]).toBe("#5da7b0");

    // Validate Zod schema conforms
    expect(() => BrandConfigSchema.parse(brand)).not.toThrow();
  });

  it("generates CSS containing required custom properties and Tailwind 4 @theme", () => {
    const brand = loadBrandConfig();
    const css = generateTokensCss(brand);

    expect(css).toContain(":root");
    expect(css).toContain("@theme");
    expect(css).toContain("--primary-800: #086477;");
    expect(css).toContain("--accent-600: #5da7b0;");
    expect(css).toContain("--color-primary-800: var(--primary-800);");
    expect(css).toContain("--color-status-success-bg: var(--status-success-bg);");
    expect(css).toContain("--radius-md: 0.375rem;");
  });

  it("ensures src/styles/tokens.css exists and is in sync with brand.json", () => {
    const tokensPath = path.resolve(__dirname, "../../styles/tokens.css");
    expect(fs.existsSync(tokensPath)).toBe(true);

    const brand = loadBrandConfig();
    const expectedCss = generateTokensCss(brand);
    const actualCss = fs.readFileSync(tokensPath, "utf-8");

    const normalize = (s: string) =>
      s.replace(/\r\n/g, "\n").replace(/'/g, '"').replace(/\s+/g, " ").trim();
    expect(normalize(actualCss)).toBe(normalize(expectedCss));
  });
});
