"use server";

import { z } from "zod";
import { purgeImpact, purgeKind, type PurgeImpact, type PurgeKind } from "@/lib/admin-record-purge";
import { requireSuperAdmin } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

export async function loadPurgeImpact(kind: PurgeKind, id: string): Promise<PurgeImpact> {
  const staff = await requireSuperAdmin("enrollments:manage");
  if (!purgeKind.safeParse(kind).success || !z.string().uuid().safeParse(id).success) {
    return { status: "not_found" };
  }
  const { data, error } = await createSupabaseAdminClient().rpc("preview_staff_record_purge", {
    p_actor: staff.userId,
    p_kind: kind,
    p_id: id,
  });
  const parsed = purgeImpact.safeParse(data);
  return !error && parsed.success ? parsed.data : { status: "unavailable" };
}
