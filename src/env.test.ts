// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { clientEnvSchema, getClientEnv } from "./env.client";
import { serverEnvSchema, getServerEnv } from "./server/env";
import { env } from "./env";

describe("Environment Configuration & Security Isolation (NFR-SEC-02)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("validates client environment variables correctly without server secrets", () => {
    const validClient = {
      NEXT_PUBLIC_APP_URL: "https://lnabd.org",
      NEXT_PUBLIC_SUPABASE_URL: "https://xyzcompany.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-12345",
      NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY: "site-key-123",
    };

    const parsed = clientEnvSchema.parse(validClient);
    expect(parsed.NEXT_PUBLIC_APP_URL).toBe("https://lnabd.org");
    expect(parsed.NEXT_PUBLIC_SUPABASE_URL).toBe("https://xyzcompany.supabase.co");

    // Proves client schema contains zero server secrets
    expect((parsed as Record<string, unknown>).SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect((parsed as Record<string, unknown>).BKASH_APP_SECRET).toBeUndefined();
    expect((parsed as Record<string, unknown>).APP_SECRET).toBeUndefined();
  });

  it("validates server environment variables in development with fallback defaults", () => {
    const validDev = {
      NODE_ENV: "development",
      APP_URL: "https://lnabd.org",
      APP_SECRET: "minimum_32_characters_secret_key_for_hmac_signing",
    };

    const parsed = serverEnvSchema.parse(validDev);
    expect(parsed.APP_SECRET).toBe("minimum_32_characters_secret_key_for_hmac_signing");
    expect(parsed.BKASH_API_VERSION).toBe("v1.2.0-beta");
    expect(parsed.BKASH_APP_KEY).toBeUndefined();
  });

  it("fails server validation when APP_SECRET is shorter than 32 characters", () => {
    const invalidServer = {
      NODE_ENV: "development",
      APP_SECRET: "too-short",
    };

    expect(() => serverEnvSchema.parse(invalidServer)).toThrow();
  });

  it("fails production validation when APP_SECRET uses an explicit dummy value", () => {
    const dummyProd = {
      NODE_ENV: "production",
      APP_URL: "https://lnabd.org",
      APP_SECRET: "dummy_secret_that_is_long_enough_32_chars_minimum",
    };

    expect(() => serverEnvSchema.parse(dummyProd)).toThrowError(/CRITICAL SECURITY FAILURE/);
  });

  it("fails production validation when enabled bKash credentials use dummy values", () => {
    const dummyBkashProd = {
      NODE_ENV: "production",
      APP_URL: "https://lnabd.org",
      APP_SECRET: "a_very_strong_production_hmac_key_min_32_chars_long",
      BKASH_APP_KEY: "dummy_bkash_merchant_key",
      BKASH_APP_SECRET: "live_secret",
      BKASH_USERNAME: "live_user",
      BKASH_PASSWORD: "live_password",
    };

    expect(() => serverEnvSchema.parse(dummyBkashProd)).toThrowError(/CRITICAL SECURITY FAILURE/);
  });

  it("passes production validation when live production secrets are supplied", () => {
    const validProd = {
      NODE_ENV: "production",
      APP_URL: "https://lnabd.org",
      APP_SECRET: "a_very_strong_production_hmac_key_min_32_chars_long",
      SUPABASE_SERVICE_ROLE_KEY: "real_production_supabase_key_12345",
      BKASH_APP_KEY: "live_bkash_merchant_key_9988",
      BKASH_APP_SECRET: "live_bkash_merchant_secret_7766",
      BKASH_USERNAME: "live_merchant_user",
      BKASH_PASSWORD: "live_merchant_password",
      BKASH_BASE_URL: "https://tokenized.pay.bka.sh",
      BKASH_API_VERSION: "v1.2.0-beta",
    };

    const parsed = serverEnvSchema.parse(validProd);
    expect(parsed.NODE_ENV).toBe("production");
    expect(parsed.APP_SECRET).toBe("a_very_strong_production_hmac_key_min_32_chars_long");
  });

  it("does not block builds when optional future-phase credentials are not yet configured", () => {
    const buildEnv = {
      NODE_ENV: "production",
      APP_URL: "https://lnabd.org",
    };

    // Should succeed because APP_SECRET defaults safely during build unless VERCEL=1 or explicit dummy
    const parsed = serverEnvSchema.parse(buildEnv);
    expect(parsed.BKASH_APP_KEY).toBeUndefined();
    expect(parsed.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(parsed.RESEND_API_KEY).toBeUndefined();
  });

  it("provides client variables through getClientEnv()", () => {
    const client = getClientEnv();
    expect(client.NEXT_PUBLIC_APP_URL).toBeDefined();
    expect(client.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
  });

  it("provides server variables through getServerEnv() in server context", () => {
    const server = getServerEnv();
    expect(server.NODE_ENV).toBeDefined();
    expect(server.APP_SECRET).toBeDefined();
  });

  it("allows client variables via unified env proxy", () => {
    expect(env.NEXT_PUBLIC_APP_URL).toBeDefined();
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
  });

  it("provides server variables via unified env proxy in server context", () => {
    expect(env.NODE_ENV).toBeDefined();
    expect(env.APP_SECRET).toBeDefined();
  });
});
