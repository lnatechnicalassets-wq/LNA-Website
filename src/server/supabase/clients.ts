import "server-only";
import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { getClientEnv } from "@/env.client";
import { parseCurrentServerEnv } from "@/server/env";
import { AppError } from "@/lib/errors";

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized.startsWith("dummy") ||
    normalized.includes("placeholder") ||
    normalized.includes("your_supabase_") ||
    normalized.includes("sb_secret_your_") ||
    normalized.includes("sb_publishable_your_") ||
    normalized.includes("your-project-id")
  );
}

/**
 * Checks whether Supabase public + server secret credentials are configured (non-placeholder).
 */
export function hasConfiguredSupabaseServerEnv(): boolean {
  const clientEnv = getClientEnv();
  const serverEnv = parseCurrentServerEnv();
  const url = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
  return (
    Boolean(url) &&
    !isPlaceholder(url) &&
    !url?.toLowerCase().includes("dummy.supabase.co") &&
    !isPlaceholder(clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) &&
    !isPlaceholder(serverEnv.SUPABASE_SECRET_KEY)
  );
}

/**
 * Creates a server-only Supabase admin client authenticated with SUPABASE_SECRET_KEY.
 * Strictly isolated to server modules; never disable session persistence warnings in browser bundles.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const clientEnv = getClientEnv();
  const serverEnv = parseCurrentServerEnv();

  if (!hasConfiguredSupabaseServerEnv() || !clientEnv.NEXT_PUBLIC_SUPABASE_URL) {
    throw new AppError(
      "Supabase server environment is not configured.",
      "SUPABASE_NOT_CONFIGURED",
      503
    );
  }

  return createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SECRET_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Creates a per-request Supabase SSR client bound to Next.js 16 async cookies() store.
 * Uses publishable key + user JWT cookies so RLS policies govern browser session access.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const clientEnv = getClientEnv();
  const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new AppError(
      "Supabase server authentication client is not configured.",
      "SUPABASE_NOT_CONFIGURED",
      503
    );
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Cookie mutation is unavailable during read-only Server Component renders;
          // src/middleware.ts handles session cookie refresh on /admin/** routes.
        }
      },
    },
  });
}
