import "server-only";
import { z } from "zod";

/**
 * Server-only environment variables schema.
 * Protected by compile-time "server-only" boundary.
 * Never bundled into or accessible by client-side code.
 */
export const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_URL: z.string().url().default("http://localhost:3000"),
    APP_SECRET: z
      .string()
      .min(32, "APP_SECRET must be at least 32 characters for secure HMAC")
      .default("development_secret_key_minimum_32_characters_long_for_hmac"),

    // Supabase Service Role Key (Admin / Server-only)
    // Optional in Phase 1 scaffold; required in Phase 5+ database migrations
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

    // bKash Gateway Credentials (ADR 0009 - Server-Only)
    // Optional in Phase 1 scaffold; required in Phase 10 payment integration
    BKASH_APP_KEY: z.string().optional(),
    BKASH_APP_SECRET: z.string().optional(),
    BKASH_USERNAME: z.string().optional(),
    BKASH_PASSWORD: z.string().optional(),
    BKASH_BASE_URL: z.string().url().default("https://tokenized.sandbox.bka.sh"),
    BKASH_API_VERSION: z.string().default("v1.2.0-beta"),

    // Resend Transactional Email (Phase 10+)
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM_EMAIL: z.string().email().default("admissions@mail.lnabd.org"),
    RESEND_TO_EMAIL: z.string().email().default("info@lnabd.org"),

    // Upstash Redis (Phase 6+ Rate Limiting)
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    // Cloudflare Turnstile Server Secret (Phase 8+)
    CLOUDFLARE_TURNSTILE_SECRET_KEY: z.string().default("1x0000000000000000000000000000000AA"),
  })
  .superRefine((data, ctx) => {
    // Production Security Assertions:
    // Prevent insecure dummy or placeholder values when running in production
    if (data.NODE_ENV === "production") {
      // APP_SECRET must never be an explicit dummy string in production
      if (data.APP_SECRET.startsWith("dummy") || data.APP_SECRET.includes("placeholder")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["APP_SECRET"],
          message:
            "CRITICAL SECURITY FAILURE: In production, APP_SECRET cannot use dummy or placeholder values.",
        });
      }

      // If bKash gateway integration is enabled in production, it cannot use dummy credentials
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

      // If live production deployment on Vercel, enforce production secret presence
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

export type ServerEnv = z.infer<typeof serverEnvSchema>;

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
