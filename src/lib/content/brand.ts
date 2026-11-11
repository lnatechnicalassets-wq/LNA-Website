import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ProvenanceSchema } from "./provenance";

/**
 * Brand configuration schema.
 */
export const BrandConfigSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().min(1),
  tagline: z.string().min(1),
  provenance: ProvenanceSchema,
  logo: z.object({
    alt: z.string().min(1),
    monogram: z.string().min(1),
    crestSubtitle: z.string().min(1),
    badgeText: z.string().min(1),
  }),
  colors: z.object({
    primary: z.record(z.string()),
    accent: z.record(z.string()),
    surface: z.record(z.string()),
    border: z.record(z.string()),
    text: z.record(z.string()),
    status: z.object({
      success: z.object({
        bg: z.string(),
        border: z.string(),
        text: z.string(),
        solid: z.string(),
      }),
      warning: z.object({
        bg: z.string(),
        border: z.string(),
        text: z.string(),
        solid: z.string(),
      }),
      danger: z.object({
        bg: z.string(),
        border: z.string(),
        text: z.string(),
        solid: z.string(),
      }),
      info: z.object({
        bg: z.string(),
        border: z.string(),
        text: z.string(),
        solid: z.string(),
      }),
    }),
  }),
  typography: z.object({
    fontSans: z.string(),
    fontMono: z.string(),
    fontHeading: z.string(),
  }),
  radii: z.record(z.string()),
  shadows: z.record(z.string()),
});

export type BrandConfig = z.infer<typeof BrandConfigSchema>;

let cachedBrand: BrandConfig | null = null;

/**
 * Loads and validates brand configuration from content/site/brand.json.
 * Components must import this helper instead of accessing /content directly (Rule R4).
 */
export function getBrandConfig(): BrandConfig {
  const cacheEnabled = process.env.NODE_ENV !== "development";
  if (cacheEnabled && cachedBrand) {
    return cachedBrand;
  }

  const brandPath = path.join(process.cwd(), "content", "site", "brand.json");
  if (!fs.existsSync(brandPath)) {
    throw new Error(`Brand configuration file not found at ${brandPath}`);
  }

  const raw = fs.readFileSync(brandPath, "utf-8");
  const parsedJson = JSON.parse(raw);
  const validated = BrandConfigSchema.parse(parsedJson);

  if (cacheEnabled) {
    cachedBrand = validated;
  }
  return validated;
}
