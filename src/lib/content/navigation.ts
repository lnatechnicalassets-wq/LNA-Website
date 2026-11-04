import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ProvenanceSchema } from "./provenance";

export const NavItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  description: z.string().optional(),
});

export const FooterColumnSchema = z.object({
  title: z.string().min(1),
  links: z.array(NavItemSchema),
});

export const NavigationConfigSchema = z.object({
  provenance: ProvenanceSchema,
  header: z.object({
    navItems: z.array(NavItemSchema),
    cta: NavItemSchema,
  }),
  footer: z.object({
    columns: z.array(FooterColumnSchema),
    bottomNote: z.string().min(1),
    demoNotice: z.string().min(1),
  }),
});

export type NavItem = z.infer<typeof NavItemSchema>;
export type FooterColumn = z.infer<typeof FooterColumnSchema>;
export type NavigationConfig = z.infer<typeof NavigationConfigSchema>;

let cachedNav: NavigationConfig | null = null;

/**
 * Loads and validates navigation configuration from content/site/navigation.json.
 * Components must import this helper instead of accessing /content directly (Rule R4).
 */
export function getNavigationConfig(): NavigationConfig {
  if (cachedNav) {
    return cachedNav;
  }

  const filePath = path.join(process.cwd(), "content", "site", "navigation.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(`Navigation configuration file not found at ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  const validated = NavigationConfigSchema.parse(parsed);

  cachedNav = validated;
  return validated;
}
