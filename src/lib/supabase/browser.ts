"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getRequiredBrowserSupabaseConfig } from "@/env.client";

/**
 * Browser-safe Supabase client using exclusively NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
 * Used exclusively by /admin/login and TOTP MFA challenge/enrollment flows.
 */
export function createSupabaseBrowserClient() {
  const { url, publishableKey } = getRequiredBrowserSupabaseConfig();
  return createBrowserClient(url, publishableKey);
}
