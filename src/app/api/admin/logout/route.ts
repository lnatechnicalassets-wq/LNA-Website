import { NextResponse, type NextRequest } from "next/server";
import { verifySameOriginRequest } from "@/server/security/origin";
import {
  createSupabaseServerClient,
  hasConfiguredSupabaseServerEnv,
} from "@/server/supabase/clients";

export async function POST(request: NextRequest) {
  const noStoreHeaders = { "Cache-Control": "no-store" };

  if (!verifySameOriginRequest(request)) {
    return NextResponse.json(
      {
        ok: false,
        code: "CSRF_ORIGIN_MISMATCH",
        message: "Cross-origin requests are not allowed.",
      },
      { status: 403, headers: noStoreHeaders }
    );
  }

  if (hasConfiguredSupabaseServerEnv()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Ensure client proceeds cleanly even if cookie session was already absent
    }
  }

  return NextResponse.json({ ok: true }, { status: 200, headers: noStoreHeaders });
}
