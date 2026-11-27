"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/server/auth/require-staff";
import { listMentorAssets } from "@/server/admin/people";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

const inputSchema = z.object({
  id: z
    .string()
    .regex(/^partner-[a-z0-9-]{1,100}$/)
    .or(z.literal("")),
  revision: z.string().datetime({ offset: true }).or(z.literal("")),
  name: z.string().trim().min(2).max(120),
  sector: z.string().trim().min(2).max(160),
  logo: z.string().max(240),
  order: z.coerce.number().int().min(0).max(9999),
  published: z.boolean(),
  attested: z.literal("on"),
});
const page = "/admin/website/partners";
export async function savePartner(form: FormData): Promise<void> {
  const staff = await requireStaff("cms:edit");
  const input = inputSchema.safeParse({
    id: form.get("id"),
    revision: form.get("revision"),
    name: form.get("name"),
    sector: form.get("sector"),
    logo: form.get("logo"),
    order: form.get("order"),
    published: form.get("published") === "on",
    attested: form.get("attested"),
  });
  if (!input.success || Boolean(input.data.id) !== Boolean(input.data.revision))
    redirect(`${page}?result=invalid`);
  const value = input.data;
  if (value.logo && !(await listMentorAssets()).logos.includes(value.logo))
    redirect(`${page}?result=invalid`);
  const { data, error } = await createSupabaseAdminClient().rpc("save_staff_partner", {
    p_actor: staff.userId,
    p_id: value.id || null,
    p_revision: value.revision || null,
    p_name: value.name,
    p_sector: value.sector,
    p_logo: value.logo || null,
    p_order: value.order,
    p_published: value.published,
    p_attested: true,
  });
  if (error || data !== "OK") redirect(`${page}?result=${data === "STALE" ? "stale" : "failed"}`);
  revalidatePath(page);
  revalidatePath("/");
  redirect(`${page}?result=saved`);
}
