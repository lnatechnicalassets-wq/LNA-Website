import "server-only";
import { z } from "zod";

function isDummyOrPlaceholderSecret(value: string | undefined): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized.startsWith("dummy") ||
    normalized.includes("placeholder") ||
    normalized.startsWith("your_") ||
    normalized.startsWith("sb_secret_your_") ||
    normalized.startsWith("re_your_")
  );
}

/**
 * Server-only environment variables schema.
 * Protected by compile-time "server-only" boundary.
 * Never bundled into or accessible by client-side code.
 */
function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const val of values) {
    if (typeof val === "string" && val.trim().length > 0) {
      return val.trim();
    }
  }
  return undefined;
}

function isPlaceholderUrl(value: string | undefined): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized.includes("dummy.supabase.co") ||
    normalized.includes("your-project-id") ||
    normalized.includes("placeholder")
  );
}

/**
 * Normalizes PGW_* production merchant variables already present in .env.local
 * onto the canonical server-only BKASH_* fields without duplicating credentials
 * across environment files. Explicit BKASH_* values take precedence if set.
 */
function resolveBkashEnvAliases(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return input;
  }

  const raw = { ...(input as Record<string, string | undefined>) };

  const rawBaseOrRoot = firstNonEmpty(raw.BKASH_BASE_URL, raw.PGW_Production_API_Context_Root);
  let resolvedVersion = firstNonEmpty(raw.BKASH_API_VERSION);

  if (rawBaseOrRoot) {
    try {
      const parsed = new URL(rawBaseOrRoot);
      const pathSegments = parsed.pathname.split("/").filter(Boolean);
      raw.BKASH_BASE_URL = parsed.origin;
      if (!resolvedVersion && pathSegments.length > 0) {
        resolvedVersion = pathSegments.join("/");
      }
    } catch {
      raw.BKASH_BASE_URL = rawBaseOrRoot;
    }
  }

  if (resolvedVersion) {
    raw.BKASH_API_VERSION = resolvedVersion;
  }

  const appKey = firstNonEmpty(raw.BKASH_APP_KEY, raw.PGW_App_Key, raw.PGW_APP_KEY);
  const appSecret = firstNonEmpty(raw.BKASH_APP_SECRET, raw.PGW_App_Secret, raw.PGW_APP_SECRET);
  const username = firstNonEmpty(raw.BKASH_USERNAME, raw.PGW_Username, raw.PGW_USERNAME);
  const password = firstNonEmpty(raw.BKASH_PASSWORD, raw.PGW_Password, raw.PGW_PASSWORD);

  if (appKey !== undefined) raw.BKASH_APP_KEY = appKey;
  if (appSecret !== undefined) raw.BKASH_APP_SECRET = appSecret;
  if (username !== undefined) raw.BKASH_USERNAME = username;
  if (password !== undefined) raw.BKASH_PASSWORD = password;
  if (typeof raw.CRON_SECRET === "string" && raw.CRON_SECRET.trim() === "") {
    delete raw.CRON_SECRET;
  }

  return raw;
}

const baseServerEnvObject = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_URL: z.string().url().default("http://localhost:3000"),
    APP_SECRET: z
      .string()
      .min(32, "APP_SECRET must be at least 32 characters for secure HMAC")
      .default("development_secret_key_minimum_32_characters_long_for_hmac"),

    // Supabase Secret Key (Admin / Server-only)
    SUPABASE_SECRET_KEY: z.string().optional(),

    // bKash Gateway Credentials & Mode (ADR 0009 - Standardized BKASH_* Server-Only)
    BKASH_CHECKOUT_MODE: z.enum(["closed", "mock", "live"]).default("closed"),
    BKASH_APP_KEY: z.string().optional(),
    BKASH_APP_SECRET: z.string().optional(),
    BKASH_USERNAME: z.string().optional(),
    BKASH_PASSWORD: z.string().optional(),
    BKASH_BASE_URL: z.string().url().default("https://tokenized.sandbox.bka.sh"),
    BKASH_API_VERSION: z.string().min(1).default("v1.2.0-beta"),
    BKASH_MODE: z.string().min(1).default("0011"),

    // Optional Cron Secret for automated background payment reconciliation
    CRON_SECRET: z.string().min(32).optional(),

    // Optional explicit status lookup override (opens automatically in mock/live modes)
    STATUS_LOOKUP_ENABLED: z.enum(["true", "false"]).optional(),

    // Resend Transactional Email & Dispatch Mode
    EMAIL_DISPATCH_MODE: z.enum(["disabled", "mock", "live"]).default("disabled"),
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM_EMAIL: z.string().email().default("admissions@mail.lnabd.org"),
    RESEND_TO_EMAIL: z.string().email().default("info@lnabd.org"),

    // Upstash Redis (Distributed Rate Limiting)
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    // Cloudflare Turnstile Server Secret
    CLOUDFLARE_TURNSTILE_SECRET_KEY: z.string().default("1x0000000000000000000000000000000AA"),
  })
  .superRefine((data, ctx) => {
    // Reject mock modes unconditionally in production
    if (data.NODE_ENV === "production" && data.BKASH_CHECKOUT_MODE === "mock") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["BKASH_CHECKOUT_MODE"],
        message: "CRITICAL SECURITY FAILURE: Mock bKash checkout mode is forbidden in production.",
      });
    }

    if (data.NODE_ENV === "production" && data.EMAIL_DISPATCH_MODE === "mock") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["EMAIL_DISPATCH_MODE"],
        message: "CRITICAL SECURITY FAILURE: Mock email dispatch mode is forbidden in production.",
      });
    }

    // Live bKash checkout mode requires non-placeholder server credentials and Supabase secret key
    if (data.BKASH_CHECKOUT_MODE === "live") {
      const requiredLiveBkash: Array<[keyof typeof data, string | undefined]> = [
        ["BKASH_APP_KEY", data.BKASH_APP_KEY],
        ["BKASH_APP_SECRET", data.BKASH_APP_SECRET],
        ["BKASH_USERNAME", data.BKASH_USERNAME],
        ["BKASH_PASSWORD", data.BKASH_PASSWORD],
        ["SUPABASE_SECRET_KEY", data.SUPABASE_SECRET_KEY],
      ];

      for (const [field, val] of requiredLiveBkash) {
        if (isDummyOrPlaceholderSecret(val)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `CRITICAL SECURITY FAILURE: BKASH_CHECKOUT_MODE=live requires a valid ${String(field)}.`,
          });
        }
      }

      if (data.NODE_ENV === "production") {
        try {
          const parsedAppUrl = new URL(data.APP_URL);
          const isLocalhost =
            parsedAppUrl.hostname === "localhost" || parsedAppUrl.hostname === "127.0.0.1";
          if (parsedAppUrl.protocol !== "https:" || isLocalhost) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["APP_URL"],
              message:
                "CRITICAL SECURITY FAILURE: Live production bKash checkout requires an HTTPS non-localhost APP_URL for callback verification.",
            });
          }
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["APP_URL"],
            message: "Invalid APP_URL for live production checkout.",
          });
        }
      }
    }

    // Live email dispatch requires a valid non-placeholder RESEND_API_KEY
    if (data.EMAIL_DISPATCH_MODE === "live" && isDummyOrPlaceholderSecret(data.RESEND_API_KEY)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RESEND_API_KEY"],
        message: "CRITICAL SECURITY FAILURE: EMAIL_DISPATCH_MODE=live requires RESEND_API_KEY.",
      });
    }

    // Production Security Assertions:
    // Prevent insecure dummy or placeholder values when running in production
    if (data.NODE_ENV === "production") {
      if (data.APP_SECRET.startsWith("dummy") || data.APP_SECRET.includes("placeholder")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["APP_SECRET"],
          message:
            "CRITICAL SECURITY FAILURE: In production, APP_SECRET cannot use dummy or placeholder values.",
        });
      }

      if (
        data.SUPABASE_SECRET_KEY &&
        (data.SUPABASE_SECRET_KEY.startsWith("dummy") ||
          data.SUPABASE_SECRET_KEY.includes("placeholder"))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SUPABASE_SECRET_KEY"],
          message:
            "CRITICAL SECURITY FAILURE: In production, SUPABASE_SECRET_KEY cannot use dummy or placeholder values.",
        });
      }

      const bkashValues = [
        data.BKASH_APP_KEY,
        data.BKASH_APP_SECRET,
        data.BKASH_USERNAME,
        data.BKASH_PASSWORD,
      ];
      const hasDummyBkash = bkashValues.some(
        (val) => val && (val.includes("dummy") || val.includes("placeholder"))
      );
      if (hasDummyBkash) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["BKASH_APP_KEY"],
          message:
            "CRITICAL SECURITY FAILURE: In production, bKash credentials cannot use dummy placeholder values when enabled.",
        });
      }

      if (process.env.VERCEL === "1") {
        if (data.APP_SECRET === "development_secret_key_minimum_32_characters_long_for_hmac") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["APP_SECRET"],
            message:
              "CRITICAL SECURITY FAILURE: Production Vercel deployment requires a real cryptographically random APP_SECRET (min 32 chars).",
          });
        }
      }
    }
  });

export const serverEnvSchema = z.preprocess(resolveBkashEnvAliases, baseServerEnvObject);

export type ServerEnv = z.infer<typeof baseServerEnvObject>;

export interface BkashLiveReadiness {
  checkoutMode: ServerEnv["BKASH_CHECKOUT_MODE"];
  baseUrl: string;
  apiVersion: string;
  mode: string;
  isProductionGatewayUrl: boolean;
  hasAppKey: boolean;
  hasAppSecret: boolean;
  hasUsername: boolean;
  hasPassword: boolean;
  hasSupabaseSecretKey: boolean;
  hasNonDefaultAppSecret: boolean;
  hasHttpsCallbackOrigin: boolean;
  callbackOrigin: string;
  missingRequirements: string[];
  readyForLiveGrant: boolean;
  readyForLiveCheckout: boolean;
}

/**
 * Returns non-secret operational diagnostics for live bKash PGW readiness.
 * Never returns API keys, secrets, usernames, or passwords.
 */
export function getBkashLiveReadiness(
  envSource: Record<string, string | undefined> = process.env
): BkashLiveReadiness {
  const aliased = resolveBkashEnvAliases(envSource) as Record<string, string | undefined>;
  const rawMode = aliased.BKASH_CHECKOUT_MODE;
  const checkoutMode: ServerEnv["BKASH_CHECKOUT_MODE"] =
    rawMode === "live" || rawMode === "mock" ? rawMode : "closed";

  const baseUrl = (aliased.BKASH_BASE_URL || "https://tokenized.sandbox.bka.sh").replace(
    /\/+$/,
    ""
  );
  const apiVersion = (aliased.BKASH_API_VERSION || "v1.2.0-beta").replace(/^\/+|\/+$/g, "");
  const mode = aliased.BKASH_MODE || "0011";
  const callbackOrigin = (aliased.APP_URL || "http://localhost:3000").replace(/\/+$/, "");

  const hasAppKey = !isDummyOrPlaceholderSecret(aliased.BKASH_APP_KEY);
  const hasAppSecret = !isDummyOrPlaceholderSecret(aliased.BKASH_APP_SECRET);
  const hasUsername = !isDummyOrPlaceholderSecret(aliased.BKASH_USERNAME);
  const hasPassword = !isDummyOrPlaceholderSecret(aliased.BKASH_PASSWORD);
  const hasSupabaseSecretKey = !isDummyOrPlaceholderSecret(aliased.SUPABASE_SECRET_KEY);
  const hasNonDefaultAppSecret =
    Boolean(aliased.APP_SECRET) &&
    !isDummyOrPlaceholderSecret(aliased.APP_SECRET) &&
    aliased.APP_SECRET !== "development_secret_key_minimum_32_characters_long_for_hmac" &&
    (aliased.APP_SECRET?.length ?? 0) >= 32;

  let isProductionGatewayUrl = false;
  try {
    const parsedGateway = new URL(baseUrl);
    isProductionGatewayUrl = parsedGateway.hostname === "tokenized.pay.bka.sh";
  } catch {
    isProductionGatewayUrl = false;
  }

  let hasHttpsCallbackOrigin = false;
  try {
    const parsedCallback = new URL(callbackOrigin);
    hasHttpsCallbackOrigin =
      parsedCallback.protocol === "https:" &&
      parsedCallback.hostname !== "localhost" &&
      parsedCallback.hostname !== "127.0.0.1" &&
      !isPlaceholderUrl(callbackOrigin);
  } catch {
    hasHttpsCallbackOrigin = false;
  }

  const missingRequirements: string[] = [];
  if (!hasAppKey) missingRequirements.push("BKASH_APP_KEY");
  if (!hasAppSecret) missingRequirements.push("BKASH_APP_SECRET");
  if (!hasUsername) missingRequirements.push("BKASH_USERNAME");
  if (!hasPassword) missingRequirements.push("BKASH_PASSWORD");
  if (!hasSupabaseSecretKey) missingRequirements.push("SUPABASE_SECRET_KEY");
  if (!hasNonDefaultAppSecret) missingRequirements.push("APP_SECRET");
  if (!hasHttpsCallbackOrigin) missingRequirements.push("APP_URL (https:// non-localhost)");

  const readyForLiveGrant = hasAppKey && hasAppSecret && hasUsername && hasPassword;
  const readyForLiveCheckout =
    readyForLiveGrant && hasSupabaseSecretKey && hasNonDefaultAppSecret && hasHttpsCallbackOrigin;

  return {
    checkoutMode,
    baseUrl,
    apiVersion,
    mode,
    isProductionGatewayUrl,
    hasAppKey,
    hasAppSecret,
    hasUsername,
    hasPassword,
    hasSupabaseSecretKey,
    hasNonDefaultAppSecret,
    hasHttpsCallbackOrigin,
    callbackOrigin,
    missingRequirements,
    readyForLiveGrant,
    readyForLiveCheckout,
  };
}

/**
 * Validates server environment variables against schema.
 */
export function validateServerEnvironment(
  envSource: Record<string, string | undefined> = process.env
): ServerEnv {
  const result = serverEnvSchema.safeParse(envSource);
  if (!result.success) {
    throw new Error(
      `Invalid server environment variables: ${JSON.stringify(result.error.format())}`
    );
  }
  return result.data;
}

export const serverEnv: ServerEnv = validateServerEnvironment();

/**
 * Accessor for validated server-only environment variables.
 * Protected by compile-time "server-only" boundary.
 */
export function getServerEnv(): ServerEnv {
  return serverEnv;
}

/**
 * Dynamically re-parses process.env (useful in tests that toggle env modes per request).
 */
export function parseCurrentServerEnv(): ServerEnv {
  return validateServerEnvironment(process.env);
}
