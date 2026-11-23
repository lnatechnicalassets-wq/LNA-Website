// @vitest-environment node
import { describe, expect, it } from "vitest";
import { BkashTokenizedClient } from "./bkash";
import { SupabaseBkashTokenCache } from "./bkash-token-cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import fs from "node:fs";

function loadLocalEnv(): Record<string, string> {
  try {
    const envContent = fs.readFileSync(".env.local", "utf8");
    const env: Record<string, string> = {};
    for (const line of envContent.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
    }
    return env;
  } catch {
    return {};
  }
}

describe("bKash Live Sandbox UAT Verification", () => {
  const env = loadLocalEnv();
  const appKey = env.BKASH_APP_KEY || env.BKASH_CHECKOUT_URL_APP_KEY;
  const appSecret = env.BKASH_APP_SECRET || env.BKASH_CHECKOUT_URL_APP_SECRET;
  const username = env.BKASH_USERNAME || env.BKASH_CHECKOUT_URL_USER_NAME;
  const password = env.BKASH_PASSWORD || env.BKASH_CHECKOUT_URL_PASSWORD;

  const hasCredentials = Boolean(appKey && appSecret && username && password);

  it.runIf(hasCredentials)(
    "successfully grants token and initiates checkout URL on live bKash sandbox even when DB cache RPC is unmigrated",
    async () => {
      // Mock DB that returns PGRST202 (representing unmigrated database)
      const mockDb: Pick<SupabaseClient, "rpc"> = {
        rpc: (() => ({
          abortSignal: async () => ({
            data: null,
            error: {
              code: "PGRST202",
              message: "Could not find the function public.bkash_acquire_gateway_token in the schema cache",
            },
          }),
        })) as unknown as Pick<SupabaseClient, "rpc">["rpc"],
      };

      const cache = new SupabaseBkashTokenCache(mockDb, "live-test-merchant");
      const client = new BkashTokenizedClient({
        baseUrl: "https://tokenized.sandbox.bka.sh/v2",
        apiVersion: "v2",
        mode: "0011",
        appKey: appKey!,
        appSecret: appSecret!,
        username: username!,
        password: password!,
        tokenCache: cache,
      });

      // 1. Initial checkout initiation
      const initResult = await client.initiateCheckout({
        attemptId: "uat-attempt-1",
        tranId: "LNA-UAT-INV-01",
        amountPoisha: 750000n, // BDT 7,500.00
        currency: "BDT",
        payerReference: "LNA-2M4K-9P7Q",
        callbackUrl: "https://staging.lnabd.org/api/payments/bkash/callback",
      });

      expect(initResult.paymentId).toMatch(/^TR[0-9A-Za-z]+$/);
      expect(initResult.redirectUrl).toMatch(/^https:\/\/sandbox\.payment\.bkash\.com\/\?paymentId=/);
      expect(initResult.callbackSignature).toBeDefined();
      expect(initResult.sandboxV2).toBe(true);

      // 2. Second checkout initiation (verifies cached token reuse)
      const secondResult = await client.initiateCheckout({
        attemptId: "uat-attempt-2",
        tranId: "LNA-UAT-INV-02",
        amountPoisha: 750000n,
        currency: "BDT",
        payerReference: "LNA-2M4K-9P7Q",
        callbackUrl: "https://staging.lnabd.org/api/payments/bkash/callback",
      });

      expect(secondResult.paymentId).toMatch(/^TR[0-9A-Za-z]+$/);
      expect(secondResult.paymentId).not.toBe(initResult.paymentId);

      // 3. Query payment status on freshly initiated session
      const queryResult = await client.queryPaymentStatus(initResult.paymentId);
      expect(queryResult.paymentId).toBe(initResult.paymentId);
      expect(queryResult.transactionStatus).toBe("Initiated");
      expect(queryResult.amountPoisha).toBe(750000n);
      expect(queryResult.currency).toBe("BDT");
      expect(queryResult.merchantInvoiceNumber).toBe("LNA-UAT-INV-01");
    },
    15_000
  );
});
