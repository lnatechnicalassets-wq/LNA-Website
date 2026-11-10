import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getClientEnv } from "@/env.client";

function isDummySupabaseConfig(url: string | undefined, key: string | undefined): boolean {
  if (!url || !key) return true;
  const u = url.toLowerCase();
  const k = key.toLowerCase();
  return (
    u.includes("dummy.supabase.co") ||
    u.includes("your-project-id") ||
    k.includes("dummy") ||
    k.includes("your_supabase_")
  );
}

/**
 * Next.js 16 proxy (replaces legacy middleware) strictly scoped to /admin/**
 * to keep Supabase Auth SSR cookies refreshed without blocking public edge routes.
 * Authorization itself is always enforced server-side via requireStaff() (Rule R8).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const env = getClientEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey || isDummySupabaseConfig(supabaseUrl, supabaseKey)) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refreshes expired auth cookies cleanly; never trusts unverified cookies for authorization.
  await supabase.auth.getUser().catch(() => null);

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
