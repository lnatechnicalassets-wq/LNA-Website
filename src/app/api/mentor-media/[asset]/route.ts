import { mentorMediaBucket, mentorMediaKey, mentorMediaPath } from "@/lib/mentor-media";
import { requireStaff } from "@/server/auth/require-staff";
import {
  createSupabaseAdminClient,
  hasConfiguredSupabaseServerEnv,
} from "@/server/supabase/clients";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const unavailable = (status: number) => new Response(null, { status, headers });

export async function GET(_request: Request, { params }: { params: Promise<{ asset: string }> }) {
  const { asset } = await params;
  if (!mentorMediaKey.test(asset) || !hasConfiguredSupabaseServerEnv()) return unavailable(404);

  const admin = createSupabaseAdminClient();
  const source = mentorMediaPath + asset;
  const reference = `portrait_src.eq.${source},company_logo_src.eq.${source}`;
  const { data: published, error } = await admin
    .from("mentors")
    .select("id")
    .or(reference)
    .eq("published", true)
    .eq("is_dev_fixture", false)
    .is("archived_at", null)
    .limit(1);
  if (error) return unavailable(503);

  if (!published.length) {
    try {
      await requireStaff("catalog:edit");
    } catch {
      return unavailable(404);
    }
    const { data: staffReference, error: staffError } = await admin
      .from("mentors")
      .select("id")
      .or(reference)
      .limit(1);
    if (staffError) return unavailable(503);
    if (!staffReference.length) return unavailable(404);
  }

  const { data, error: downloadError } = await admin.storage
    .from(mentorMediaBucket)
    .download(asset);
  if (downloadError || !data) return unavailable(404);
  return new Response(data, { headers: { ...headers, "Content-Type": "image/webp" } });
}
