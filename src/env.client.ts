import { z } from "zod";
import { AppError } from "@/lib/errors";

/**
 * Client-safe environment variables schema.
 * All variables MUST be prefixed with NEXT_PUBLIC_.
 * Safe to import and evaluate in both client and server contexts.
 * Contains ZERO server secrets or backend credentials.
 */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY: z.string().default("1x00000000000000000000AA"),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Explicit static property reads are mandatory for Next.js client bundling:
 * passing bare `process.env` in browser chunks evaluates as `{}` because Next.js
 * only inlines static `process.env.NEXT_PUBLIC_*` member expressions.
 */
function readStaticClientEnv(): Record<string, string | undefined> {
  return {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || undefined,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || undefined,
    NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY:
      process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || undefined,
  };
}

export function validateClientEnvironment(
  envSource: Record<string, string | undefined> = readStaticClientEnv()
): ClientEnv {
  const parsed = clientEnvSchema.safeParse(envSource);
  if (!parsed.success) {
    throw new Error(
      `Invalid client environment variables: ${JSON.stringify(parsed.error.format())}`
    );
  }
  return parsed.data;
}

export const clientEnv: ClientEnv = validateClientEnvironment();

/**
 * Accessor for validated client environment variables.
 * Safe to call from any client component, hook, or server component.
 */
export function getClientEnv(): ClientEnv {
  return clientEnv;
}

function isPlaceholderBrowserSupabaseValue(value: string | undefined): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized.includes("dummy.supabase.co") ||
    normalized.includes("your-project-id") ||
    normalized.startsWith("dummy") ||
    normalized.includes("placeholder") ||
    normalized.includes("your_supabase_") ||
    normalized.includes("sb_publishable_your_")
  );
}

/**
 * Resolves and validates required browser Supabase Auth configuration with zero dummy fallbacks.
 * Throws a clear configuration error naming missing variable(s) without exposing key values.
 */
export function getRequiredBrowserSupabaseConfig(
  envOverride?: Pick<ClientEnv, "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY">
): { url: string; publishableKey: string } {
  const resolved = envOverride ?? validateClientEnvironment();
  const url = resolved.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = resolved.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  const missingOrPlaceholder: string[] = [];
  if (isPlaceholderBrowserSupabaseValue(url)) {
    missingOrPlaceholder.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (isPlaceholderBrowserSupabaseValue(publishableKey)) {
    missingOrPlaceholder.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  if (missingOrPlaceholder.length > 0 || !url || !publishableKey) {
    throw new AppError(
      `Supabase browser authentication is not configured: set valid ${missingOrPlaceholder.join(" and ")} in environment variables and restart the dev server.`,
      "SUPABASE_NOT_CONFIGURED",
      500
    );
  }

  return { url, publishableKey };
}
