import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { dispatchEmailOutboxById } from "@/server/email/resend";
import { parseCurrentServerEnv } from "@/server/env";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const headers = { "Cache-Control": "no-store" };
export async function GET(request: Request) {
  try {
    const env = parseCurrentServerEnv();
    const token = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
    if (
      !env.CRON_SECRET ||
      !token ||
      !timingSafeEqual(
        createHash("sha256").update(token).digest(),
        createHash("sha256").update(env.CRON_SECRET).digest()
      )
    ) {
      return NextResponse.json({ ok: false }, { status: 401, headers });
    }
    if (env.EMAIL_DISPATCH_MODE !== "live")
      return NextResponse.json({ ok: true, skipped: true }, { headers });
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("list_due_confirmation_emails", { p_limit: 8 });
    if (error || !Array.isArray(data))
      return NextResponse.json({ ok: false }, { status: 503, headers });
    let accepted = 0;
    // Limit concurrent requests to avoid unnecessary provider throttling and long cron invocations.
    for (let i = 0; i < data.length; i += 2) {
      const results = await Promise.all(
        data
          .slice(i, i + 2)
          .map((id) =>
            dispatchEmailOutboxById(String(id), { adminOverride: admin }).catch(() => null)
          )
      );
      accepted += results.filter((result) => result?.sent).length;
    }
    return NextResponse.json({ ok: true, checked: data.length, accepted }, { headers });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers });
  }
}
