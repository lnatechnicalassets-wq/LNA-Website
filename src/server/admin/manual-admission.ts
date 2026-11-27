import "server-only";
import { z } from "zod";
import { catalogRecordId, catalogStatuses } from "@/lib/admin-catalog";
import { isBatchIntakeAllowed } from "@/lib/batch-intake";
import { AppError } from "@/lib/errors";
import { createSupabaseAdminClient } from "@/server/supabase/clients";
import { catalogPoisha } from "./catalog";

const dateTime = z.string().datetime({ offset: true });
const batchSelection =
  "id,course_id,name,start_date,status,archived_at,enrollment_opens_at,enrollment_closes_at,updated_at,fee_poisha,discount_fee_poisha,courses!inner(slug,title,status,archived_at)";
const intakeSelection = `${batchSelection},accept_applications` as const;
const batchRecord = z.object({
  id: catalogRecordId,
  course_id: catalogRecordId,
  name: z.string(),
  start_date: z.string().date(),
  status: catalogStatuses.batches,
  archived_at: dateTime.nullable(),
  accept_applications: z.boolean().nullable().optional(),
  enrollment_opens_at: dateTime.nullable(),
  enrollment_closes_at: dateTime.nullable(),
  updated_at: dateTime,
  fee_poisha: catalogPoisha,
  discount_fee_poisha: catalogPoisha.nullable(),
  courses: z.object({
    slug: z.string(),
    title: z.string(),
    status: catalogStatuses.courses,
    archived_at: dateTime.nullable(),
  }),
});

function toAdmissionBatch(batch: z.infer<typeof batchRecord>, now: number) {
  return {
    ...batch,
    feePoisha: batch.discount_fee_poisha ?? batch.fee_poisha,
    isOpen:
      batch.courses.status === "published" &&
      !batch.courses.archived_at &&
      isBatchIntakeAllowed(
        {
          status: batch.status,
          acceptApplications: batch.accept_applications,
          archivedAt: batch.archived_at,
          opensAt: batch.enrollment_opens_at,
          closesAt: batch.enrollment_closes_at,
        },
        true,
        now
      ),
  };
}

export async function getManualAdmissionBatch(batchId: string) {
  const client = createSupabaseAdminClient();
  const load = (withIntake: boolean) =>
    client
      .from("batches")
      .select(withIntake ? intakeSelection : batchSelection)
      .eq("id", batchId)
      .maybeSingle();
  const initial = await load(true);
  const { data, error } = initial.error?.code === "42703" ? await load(false) : initial;
  if (!error && data === null) return null;
  const parsed = batchRecord.safeParse(data);
  if (error || !parsed.success)
    throw new AppError("Unable to load the batch.", "ADMIN_CATALOG_UNAVAILABLE", 503);
  return toAdmissionBatch(parsed.data, Date.now());
}

export async function listOpenManualAdmissionBatches() {
  const client = createSupabaseAdminClient();
  const now = Date.now();
  const pageSize = 500;
  const batches: ReturnType<typeof toAdmissionBatch>[] = [];
  let withIntake = true;

  for (let offset = 0; ; offset += pageSize) {
    const load = () => {
      let query = client.from("batches").select(withIntake ? intakeSelection : batchSelection);
      query = withIntake
        ? query.in("status", ["upcoming", "open_for_enrollment", "in_progress"])
        : query.eq("status", "open_for_enrollment");
      return query
        .is("archived_at", null)
        .eq("courses.status", "published")
        .is("courses.archived_at", null)
        .order("start_date", { ascending: false })
        .order("id")
        .range(offset, offset + pageSize - 1);
    };
    let response = await load();
    if (offset === 0 && response.error?.code === "42703") {
      withIntake = false;
      response = await load();
    }
    const { data, error } = response;
    const parsed = z.array(batchRecord).safeParse(data);
    if (error || !parsed.success)
      throw new AppError("Unable to load open batches.", "ADMIN_CATALOG_UNAVAILABLE", 503);

    batches.push(
      ...parsed.data.map((batch) => toAdmissionBatch(batch, now)).filter((batch) => batch.isOpen)
    );
    if (parsed.data.length < pageSize) return batches;
  }
}
