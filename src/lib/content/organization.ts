import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ProvenanceSchema } from "./provenance";

export const OrganizationSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().min(1),
  domain: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().min(1),
  }),
  businessHours: z.string().min(1),
  provenance: ProvenanceSchema,
});

export type Organization = z.infer<typeof OrganizationSchema>;

let cachedOrg: Organization | null = null;

/**
 * Loads and validates organization configuration from content/site/organization.json.
 * Components must import this helper instead of accessing /content directly (Rule R4).
 */
export function getOrganizationConfig(): Organization {
  const cacheEnabled = process.env.NODE_ENV !== "development";
  if (cacheEnabled && cachedOrg) {
    return cachedOrg;
  }

  const filePath = path.join(process.cwd(), "content", "site", "organization.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(`Organization configuration file not found at ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  const validated = OrganizationSchema.parse(parsed);

  if (cacheEnabled) {
    cachedOrg = validated;
  }
  return validated;
}
