import "server-only";
import { z } from "zod";
import { catalogStatuses, type CatalogSection } from "@/lib/admin-catalog";
import { editFields } from "@/lib/admin-catalog-edit";
import { AppError } from "@/lib/errors";
import { poishaToTakaString } from "@/lib/money";
import { createSupabaseAdminClient } from "@/server/supabase/clients";
import { catalogPoisha } from "./catalog";

const recordMeta = z.object({
  updated_at: z.string().datetime({ offset: true }),
  archived_at: z.string().nullable(),
});
const courseRecord = recordMeta.extend({
  status: catalogStatuses.courses,
  title: z.string(),
  subtitle: z.string(),
  category: z.string(),
  venue: z.string(),
  summary: z.string(),
  description: z.string(),
});
const batchRecord = recordMeta.extend({
  status: catalogStatuses.batches,
  name: z.string(),
  venue: z.string(),
  start_date: z.string().date(),
  end_date: z.string().date(),
  schedule_description: z.string(),
  capacity: z.number().int(),
  fee_poisha: catalogPoisha.transform(poishaToTakaString),
  discount_fee_poisha: catalogPoisha.transform(poishaToTakaString).nullable(),
});

export async function getCatalogEditRecord(section: CatalogSection, id: string) {
  const fields = editFields[section].map(({ name }) => name);
  const { data, error } = await createSupabaseAdminClient()
    .from(section)
    .select(["updated_at", "archived_at", "status", ...fields].join(","))
    .eq("id", id)
    .maybeSingle();

  if (!error && data === null) return null;
  const parsed = (section === "courses" ? courseRecord : batchRecord).safeParse(data);
  if (error || !parsed.success) {
    throw new AppError("Unable to load catalog record.", "ADMIN_CATALOG_UNAVAILABLE", 503);
  }

  const { status, archived_at, updated_at, ...values } = parsed.data;
  return {
    values: Object.fromEntries(
      Object.entries(values).map(([field, value]) => [field, value == null ? "" : String(value)])
    ),
    revision: updated_at,
    archived: status === "archived" || archived_at !== null,
  };
}
