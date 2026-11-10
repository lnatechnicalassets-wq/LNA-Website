import "server-only";
import { getClientEnv } from "@/env.client";
import { getServerEnv } from "@/server/env";
import { AppError } from "@/lib/errors";

export interface SupabaseConnectionReport {
  ok: boolean;
  host: string;
  authHealthy: boolean;
  authVersion: string | null;
  publishableKeyAccepted: boolean;
  secretKeyAccepted: boolean;
  exposedPublicTables: string[];
}

export interface SupabaseProbeOptions {
  fetchImpl?: typeof fetch;
  clientEnv?: {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  };
  serverEnv?: {
    SUPABASE_SECRET_KEY?: string;
  };
}

function isPlaceholderValue(value: string | undefined): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized.startsWith("dummy") ||
    normalized.includes("placeholder") ||
    normalized.includes("your_supabase_")
  );
}

/**
 * Verifies live HTTP connectivity and key acceptance for the configured Supabase project.
 * Keeps SUPABASE_SECRET_KEY strictly on the server and never includes any credentials in return values or errors.
 */
export async function verifySupabaseConnection(
  options: SupabaseProbeOptions = {}
): Promise<SupabaseConnectionReport> {
  const clientEnv = options.clientEnv ?? getClientEnv();
  const serverEnv = options.serverEnv ?? getServerEnv();
  const fetchFn = options.fetchImpl ?? fetch;

  const rawUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = serverEnv.SUPABASE_SECRET_KEY;

  if (
    !rawUrl ||
    !publishableKey ||
    !secretKey ||
    isPlaceholderValue(rawUrl) ||
    rawUrl.includes("dummy.supabase.co") ||
    isPlaceholderValue(publishableKey) ||
    isPlaceholderValue(secretKey)
  ) {
    throw new AppError(
      "Supabase environment variables are missing or still set to placeholders.",
      "SUPABASE_NOT_CONFIGURED",
      500
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new AppError("Invalid Supabase project URL configuration.", "SUPABASE_INVALID_URL", 500);
  }

  const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;

  try {
    const [authRes, pubProbeRes, secRootRes] = await Promise.all([
      fetchFn(`${baseUrl}/auth/v1/health`, {
        method: "GET",
        headers: { apikey: publishableKey },
        cache: "no-store",
      }),
      fetchFn(`${baseUrl}/rest/v1/__lna_connection_probe?select=*`, {
        method: "GET",
        headers: { apikey: publishableKey },
        cache: "no-store",
      }),
      fetchFn(`${baseUrl}/rest/v1/`, {
        method: "GET",
        headers: {
          apikey: secretKey!,
          Accept: "application/openapi+json",
        },
        cache: "no-store",
      }),
    ]);

    const authJson = (await authRes.json().catch(() => null)) as {
      name?: string;
      version?: string;
    } | null;

    // For PostgREST w/ sb_publishable_*: 404 (PGRST205 missing probe table) or 200 proves key authentication succeeded.
    const pubProbeBody = (await pubProbeRes.json().catch(() => null)) as { code?: string } | null;
    const publishableKeyAccepted =
      pubProbeRes.status === 200 ||
      (pubProbeRes.status === 404 && pubProbeBody?.code === "PGRST205");

    const secSpec = (await secRootRes.json().catch(() => null)) as {
      definitions?: Record<string, unknown>;
    } | null;
    const secretKeyAccepted = secRootRes.status === 200;
    const exposedPublicTables =
      secretKeyAccepted && secSpec?.definitions ? Object.keys(secSpec.definitions).sort() : [];

    const authHealthy = authRes.status === 200;
    const ok = authHealthy && publishableKeyAccepted && secretKeyAccepted;

    return {
      ok,
      host: parsedUrl.host,
      authHealthy,
      authVersion: authJson?.version ?? null,
      publishableKeyAccepted,
      secretKeyAccepted,
      exposedPublicTables,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      "Unable to reach configured Supabase project endpoints.",
      "SUPABASE_CONNECTION_FAILED",
      502
    );
  }
}
