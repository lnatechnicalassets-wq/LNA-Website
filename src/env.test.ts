// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  clientEnvSchema,
  getClientEnv,
  getRequiredBrowserSupabaseConfig,
  validateClientEnvironment,
} from "./env.client";
import { serverEnvSchema, getServerEnv, getBkashLiveReadiness } from "./server/env";
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
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key_12345",
      NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY: "site-key-123",
      SUPABASE_SECRET_KEY: "sb_secret_must_never_leak_to_client_schema",
    };

    const parsed = clientEnvSchema.parse(validClient);
    expect(parsed.NEXT_PUBLIC_APP_URL).toBe("https://lnabd.org");
    expect(parsed.NEXT_PUBLIC_SUPABASE_URL).toBe("https://xyzcompany.supabase.co");
    expect(parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe("sb_publishable_test_key_12345");

    // Proves client schema strips and excludes all server secrets
    expect((parsed as Record<string, unknown>).SUPABASE_SECRET_KEY).toBeUndefined();
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
    expect(parsed.BKASH_CHECKOUT_MODE).toBe("closed");
    expect(parsed.EMAIL_DISPATCH_MODE).toBe("disabled");
    expect(parsed.BKASH_APP_KEY).toBeUndefined();
  });

  it("rejects mock checkout and mock email modes in production", () => {
    expect(() =>
      serverEnvSchema.parse({
        NODE_ENV: "production",
        APP_URL: "https://lnabd.org",
        APP_SECRET: "a_very_strong_production_hmac_key_min_32_chars_long",
        BKASH_CHECKOUT_MODE: "mock",
      })
    ).toThrowError(/CRITICAL SECURITY FAILURE/);

    expect(() =>
      serverEnvSchema.parse({
        NODE_ENV: "production",
        APP_URL: "https://lnabd.org",
        APP_SECRET: "a_very_strong_production_hmac_key_min_32_chars_long",
        EMAIL_DISPATCH_MODE: "mock",
      })
    ).toThrowError(/CRITICAL SECURITY FAILURE/);
  });

  it("rejects live bKash checkout unless required credentials and SUPABASE_SECRET_KEY are present", () => {
    expect(() =>
      serverEnvSchema.parse({
        NODE_ENV: "production",
        APP_URL: "https://lnabd.org",
        APP_SECRET: "a_very_strong_production_hmac_key_min_32_chars_long",
        BKASH_CHECKOUT_MODE: "live",
        BKASH_APP_KEY: "live_app_key",
        BKASH_APP_SECRET: "live_app_secret",
      })
    ).toThrowError(/CRITICAL SECURITY FAILURE/);

    expect(() =>
      serverEnvSchema.parse({
        NODE_ENV: "development",
        APP_URL: "http://localhost:3000",
        BKASH_CHECKOUT_MODE: "live",
        BKASH_APP_KEY: "your_bkash_merchant_app_key",
        BKASH_APP_SECRET: "live_secret",
        BKASH_USERNAME: "live_user",
        BKASH_PASSWORD: "live_password",
        SUPABASE_SECRET_KEY: "sb_secret_live_key",
      })
    ).toThrowError(/CRITICAL SECURITY FAILURE/);
  });

  it("rejects live email dispatch mode without a real RESEND_API_KEY", () => {
    expect(() =>
      serverEnvSchema.parse({
        NODE_ENV: "production",
        APP_URL: "https://lnabd.org",
        APP_SECRET: "a_very_strong_production_hmac_key_min_32_chars_long",
        EMAIL_DISPATCH_MODE: "live",
      })
    ).toThrowError(/CRITICAL SECURITY FAILURE/);
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

  it("fails production validation when SUPABASE_SECRET_KEY uses an explicit dummy value", () => {
    const dummySupabaseProd = {
      NODE_ENV: "production",
      APP_URL: "https://lnabd.org",
      APP_SECRET: "a_very_strong_production_hmac_key_min_32_chars_long",
      SUPABASE_SECRET_KEY: "dummy_supabase_secret_key",
    };

    expect(() => serverEnvSchema.parse(dummySupabaseProd)).toThrowError(
      /CRITICAL SECURITY FAILURE/
    );
  });

  it("passes production validation when live production secrets are supplied", () => {
    const validProd = {
      NODE_ENV: "production",
      APP_URL: "https://lnabd.org",
      APP_SECRET: "a_very_strong_production_hmac_key_min_32_chars_long",
      SUPABASE_SECRET_KEY: "sb_secret_real_production_supabase_key_12345",
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
    expect(parsed.SUPABASE_SECRET_KEY).toBe("sb_secret_real_production_supabase_key_12345");
  });

  it("does not block builds when optional future-phase credentials are not yet configured", () => {
    const buildEnv = {
      NODE_ENV: "production",
      APP_URL: "https://lnabd.org",
    };

    // Should succeed because APP_SECRET defaults safely during build unless VERCEL=1 or explicit dummy
    const parsed = serverEnvSchema.parse(buildEnv);
    expect(parsed.BKASH_APP_KEY).toBeUndefined();
    expect(parsed.SUPABASE_SECRET_KEY).toBeUndefined();
    expect(parsed.RESEND_API_KEY).toBeUndefined();
  });

  it("never injects a dummy.supabase.co fallback when Supabase client vars are unset", () => {
    const cleanEnv: NodeJS.ProcessEnv = { ...process.env };
    delete cleanEnv.NEXT_PUBLIC_SUPABASE_URL;
    delete cleanEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const validated = validateClientEnvironment({
      NEXT_PUBLIC_APP_URL: cleanEnv.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_SUPABASE_URL: cleanEnv.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: cleanEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });

    expect(validated.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
    expect(validated.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBeUndefined();

    expect(() =>
      getRequiredBrowserSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
      })
    ).toThrowError(/NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);

    expect(() =>
      getRequiredBrowserSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://dummy.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "dummy_supabase_publishable_key",
      })
    ).toThrowError(/NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });

  it("resolves configured Supabase browser credentials cleanly through static client env reads", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projectref.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_valid_key";

    const mod = await import("./env.client");
    expect(mod.getClientEnv().NEXT_PUBLIC_SUPABASE_URL).toBe("https://projectref.supabase.co");
    expect(mod.getRequiredBrowserSupabaseConfig()).toEqual({
      url: "https://projectref.supabase.co",
      publishableKey: "sb_publishable_test_valid_key",
    });
  });

  it("provides client variables through getClientEnv()", () => {
    const client = getClientEnv();
    expect(client.NEXT_PUBLIC_APP_URL).toBeDefined();
    expect(client.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY).toBeDefined();
  });

  it("provides server variables through getServerEnv() in server context", () => {
    const server = getServerEnv();
    expect(server.NODE_ENV).toBeDefined();
    expect(server.APP_SECRET).toBeDefined();
  });

  it("allows client variables via unified env proxy", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projectref.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_valid_key";
    const { env: freshEnv } = await import("./env");
    expect(freshEnv.NEXT_PUBLIC_APP_URL).toBeDefined();
    expect(freshEnv.NEXT_PUBLIC_SUPABASE_URL).toBe("https://projectref.supabase.co");
  });

  it("provides server variables via unified env proxy in server context", () => {
    expect(env.NODE_ENV).toBeDefined();
    expect(env.APP_SECRET).toBeDefined();
  });

  it("maps PGW_* production merchant env variables onto canonical BKASH_* fields without duplication", () => {
    const mapped = serverEnvSchema.parse({
      NODE_ENV: "development",
      APP_URL: "http://localhost:3000",
      APP_SECRET: "a_very_strong_secret_key_min_32_chars_long_1234",
      PGW_Production_API_Context_Root: "https://tokenized.pay.bka.sh/v1.2.0-beta",
      PGW_App_Key: "pgw_app_key_value",
      PGW_App_Secret: "pgw_app_secret_value",
      CRON_SECRET: "",
    });

    expect(mapped.BKASH_BASE_URL).toBe("https://tokenized.pay.bka.sh");
    expect(mapped.BKASH_API_VERSION).toBe("v1.2.0-beta");
    expect(mapped.BKASH_APP_KEY).toBe("pgw_app_key_value");
    expect(mapped.BKASH_APP_SECRET).toBe("pgw_app_secret_value");
    expect(mapped.BKASH_USERNAME).toBeUndefined();
    expect(mapped.BKASH_PASSWORD).toBeUndefined();
    expect(mapped.CRON_SECRET).toBeUndefined();

    const overridden = serverEnvSchema.parse({
      NODE_ENV: "development",
      PGW_Production_API_Context_Root: "https://tokenized.pay.bka.sh/v1.2.0-beta",
      PGW_App_Key: "pgw_app_key_value",
      BKASH_APP_KEY: "explicit_bkash_key",
      BKASH_BASE_URL: "https://tokenized.sandbox.bka.sh",
      BKASH_API_VERSION: "v1.2.0-beta",
    });

    expect(overridden.BKASH_BASE_URL).toBe("https://tokenized.sandbox.bka.sh");
    expect(overridden.BKASH_APP_KEY).toBe("explicit_bkash_key");
  });

  it("rejects live production bKash checkout with http or localhost APP_URL and reports non-secret readiness", () => {
    expect(() =>
      serverEnvSchema.parse({
        NODE_ENV: "production",
        APP_URL: "http://localhost:3000",
        APP_SECRET: "a_very_strong_production_hmac_key_min_32_chars_long",
        SUPABASE_SECRET_KEY: "sb_secret_live_key_123456",
        BKASH_CHECKOUT_MODE: "live",
        PGW_Production_API_Context_Root: "https://tokenized.pay.bka.sh/v1.2.0-beta",
        PGW_App_Key: "live_app_key",
        PGW_App_Secret: "live_app_secret",
        BKASH_USERNAME: "live_user",
        BKASH_PASSWORD: "live_password",
      })
    ).toThrowError(/CRITICAL SECURITY FAILURE/);

    const secretAppKey = "super_secret_pgw_key_never_leak";
    const secretAppSecret = "super_secret_pgw_secret_never_leak";
    const readiness = getBkashLiveReadiness({
      NODE_ENV: "development",
      BKASH_CHECKOUT_MODE: "closed",
      PGW_Production_API_Context_Root: "https://tokenized.pay.bka.sh/v1.2.0-beta",
      PGW_App_Key: secretAppKey,
      PGW_App_Secret: secretAppSecret,
      SUPABASE_SECRET_KEY: "sb_secret_live_key_123456",
      APP_SECRET: "custom_random_32_char_secret_key_abcdef",
      APP_URL: "http://localhost:3000",
    });

    expect(readiness).toEqual({
      checkoutMode: "closed",
      baseUrl: "https://tokenized.pay.bka.sh",
      apiVersion: "v1.2.0-beta",
      mode: "0011",
      isProductionGatewayUrl: true,
      hasAppKey: true,
      hasAppSecret: true,
      hasUsername: false,
      hasPassword: false,
      hasSupabaseSecretKey: true,
      hasNonDefaultAppSecret: true,
      hasHttpsCallbackOrigin: false,
      callbackOrigin: "http://localhost:3000",
      missingRequirements: ["BKASH_USERNAME", "BKASH_PASSWORD", "APP_URL (https:// non-localhost)"],
      readyForLiveGrant: false,
      readyForLiveCheckout: false,
    });
    expect(JSON.stringify(readiness)).not.toContain(secretAppKey);
    expect(JSON.stringify(readiness)).not.toContain(secretAppSecret);
  });
});
