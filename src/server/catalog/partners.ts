import "server-only";
import { cache } from "react";
import { z } from "zod";
import { getHomeRepository, PartnerSchema, type Partner } from "@/lib/content";
import {
  createSupabaseAdminClient,
  hasConfiguredSupabaseServerEnv,
} from "@/server/supabase/clients";

const partnerRecord = z.object({
  id: z.string(),
  name: z.string(),
  sector: z.string(),
  logo_src: z.string().nullable(),
  display_order: z.number().int(),
  published: z.boolean(),
  updated_at: z.string(),
  provenance: z.unknown(),
});
export type PartnerRecord = z.infer<typeof partnerRecord>;
const columns = "id,name,sector,logo_src,display_order,published,updated_at,provenance";

export async function listStaffPartners(): Promise<PartnerRecord[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("website_partners")
    .select(columns)
    .order("display_order")
    .order("id")
    .limit(250);
  if (error) throw new Error("Partner management unavailable");
  return z.array(partnerRecord).parse(data);
}

export const getPublicPartners = cache(async (): Promise<Partner[]> => {
  if (!hasConfiguredSupabaseServerEnv()) return getHomeRepository().getPartners();
  const { data, error } = await createSupabaseAdminClient()
    .from("website_partners")
    .select(columns)
    .eq("published", true)
    .order("display_order")
    .order("id")
    .limit(250);
  // Keep the existing public partner list only while upgrading the pre-M28 schema.
  if (error?.code === "42P01" || error?.code === "PGRST205")
    return getHomeRepository().getPartners();
  if (error || !data) return [];
  return data.flatMap((row) => {
    const record = partnerRecord.safeParse(row);
    if (!record.success) return [];
    const value = record.data;
    const partner = PartnerSchema.safeParse({
      id: value.id,
      name: value.name,
      sector: value.sector,
      logoSrc: value.logo_src,
      order: value.display_order,
      isPlaceholder: false,
      provenance: value.provenance,
    });
    return partner.success ? [partner.data] : [];
  });
});
