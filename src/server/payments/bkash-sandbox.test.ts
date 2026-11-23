// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { BkashTokenizedClient } from "./bkash";
import { SupabaseBkashTokenCache } from "./bkash-token-cache";
import type { SupabaseClient } from "@supabase/supabase-js";

beforeEach(() => {
  SupabaseBkashTokenCache.clearMemoryCacheForTesting();
});

const config = {
  apiVersion: "v2",
  baseUrl: "https://tokenized.sandbox.bka.sh/v2",
  appKey: "fixture-app-key",
  appSecret: "fixture-app-secret",
  username: "fixture-username",
  password: "fixture-password",
  mode: "0011",
};

const initiate = {
  attemptId: "attempt-no-1",
  tranId: "invoice-no-1",
  amountPoisha: 22500n,
  currency: "BDT" as const,
  payerReference: "LNA-2M4K-9P7Q",
  callbackUrl: "https://staging.example.com/api/payments/bkash/callback",
};

function mockCacheDatabase(
  run: (name: string, args: Record<string, unknown>) => { data: unknown; error?: unknown }
) {
  const rpc = vi.fn((name: string, args: Record<string, unknown>) => ({
    abortSignal: async () => run(name, args),
  }));
  return { rpc } as unknown as Pick<SupabaseClient, "rpc">;
}

it("reuses one Supabase token across v2 Create, Execute, and sandbox Refund clients", async () => {
  let cachedToken: unknown;
  const db = mockCacheDatabase((name, args) => {
    expect(args.p_merchant_key).toMatch(/^[0-9a-f]{64}$/);
    if (name === "bkash_acquire_gateway_token") {
      return { data: cachedToken ? { state: "cached", token: cachedToken } : { state: "grant" } };
    }
    expect(name).toBe("bkash_finish_gateway_token");
    expect(args.p_valid_for_ms).toBe(3_600_000);
    cachedToken = args.p_token;
    return { data: true };
  });
  const fetchImpl = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ id_token: "shared-token", expires_in: 3600 }))
    .mockResolvedValueOnce(
      Response.json({
        paymentId: "PAY-1",
        bkashURL: "https://sandbox.payment.bkash.com/?paymentId=PAY-1",
        signature: "checkout-signature",
      })
    )
    .mockResolvedValueOnce(
      Response.json({
        paymentId: "PAY-1",
        trxId: "TRX-1",
        merchantInvoiceNumber: "invoice-no-1",
        currency: "BDT",
        amount: "225.00",
        transactionStatus: "Completed",
      })
    )
    .mockResolvedValueOnce(
      Response.json({
        originalTrxId: "TRX-1",
        refundTrxId: "REFUND-1",
        currency: "BDT",
        refundAmount: "225.00",
        transactionStatus: "Completed",
      })
    );
  const client = () =>
    new BkashTokenizedClient({
      ...config,
      fetchImpl,
      tokenCache: new SupabaseBkashTokenCache(db, "fixture-merchant"),
    });

  expect(await client().initiateCheckout(initiate)).toMatchObject({
    paymentId: "PAY-1",
    callbackSignature: "checkout-signature",
    sandboxV2: true,
    rawRedacted: { signature: "[REDACTED]", bkashURL: "[REDACTED]" },
  });
  expect(await client().executePayment("PAY-1")).toMatchObject({
    paymentId: "PAY-1",
    trxId: "TRX-1",
    outcome: "completed",
    statusCode: "0000",
    amountPoisha: 22500n,
  });
  expect(await client().refundSandboxPayment("PAY-1", "TRX-1", 22500n)).toEqual({
    refundTrxId: "REFUND-1",
    amountPoisha: "22500",
  });

  expect(fetchImpl.mock.calls.map(([url]) => new URL(url).pathname)).toEqual([
    "/v2/tokenized-checkout/auth/grant-token",
    "/v2/tokenized-checkout/payment/create",
    "/v2/tokenized-checkout/payment/execute",
    "/v2/tokenized-checkout/refund/payment/transaction",
  ]);
  for (const [, request] of fetchImpl.mock.calls.slice(1)) {
    expect(new Headers(request.headers).get("authorization")).toBe("Bearer shared-token");
  }
  expect(JSON.parse(fetchImpl.mock.calls[2][1].body)).toEqual({ paymentId: "PAY-1" });
  expect(JSON.parse(fetchImpl.mock.calls[3][1].body)).toMatchObject({
    paymentId: "PAY-1",
    trxId: "TRX-1",
    refundAmount: "225.00",
  });
});

it("classifies null Execute as missing and preserves the English message on a returned error", async () => {
  const fetchImpl = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ id_token: "test-token", expires_in: 3600 }))
    .mockResolvedValueOnce(Response.json(null))
    .mockResolvedValueOnce(
      Response.json(
        {
          errorCode: "2062",
          errorMessageEn: "Payment already completed.",
          transactionStatus: "Pending",
        },
        { status: 409 }
      )
    )
    .mockResolvedValueOnce(new Response("Explicit upstream failure", { status: 502 }));
  const client = new BkashTokenizedClient({ ...config, fetchImpl });

  await expect(client.executePayment("PAY-1")).resolves.toMatchObject({
    outcome: "pending",
    statusCode: "TIMEOUT",
  });
  await expect(client.executePayment("PAY-2")).resolves.toMatchObject({
    outcome: "failed",
    statusCode: "2062",
    statusMessage: "Payment already completed.",
  });
  await expect(client.executePayment("PAY-3")).resolves.toMatchObject({ outcome: "failed" });
});

it("rejects when token grant rate limit is reached", async () => {
  const db = mockCacheDatabase(() => ({ data: { state: "limited" } }));
  const grant = vi.fn();
  await expect(
    new SupabaseBkashTokenCache(db, "fixture-merchant").getOrGrant(grant)
  ).rejects.toMatchObject({ code: "BKASH_AUTH_LIMITED", statusCode: 429 });
  expect(grant).not.toHaveBeenCalled();
});

it("falls back gracefully to memory cache when database token cache RPC is missing or fails (PGRST202)", async () => {
  const db = mockCacheDatabase(() => ({
    data: null,
    error: { code: "PGRST202", message: "function not found" },
  }));
  const grant = vi.fn().mockResolvedValue({
    token: "fallback-token",
    expiresAtMs: Date.now() + 60_000,
    validForMs: 60_000,
  });

  const cache = new SupabaseBkashTokenCache(db, "fallback-merchant");
  const token1 = await cache.getOrGrant(grant);
  expect(token1).toBe("fallback-token");
  expect(grant).toHaveBeenCalledTimes(1);

  // Subsequent call within validity reuses the memory token without hitting grant again
  const token2 = await cache.getOrGrant(grant);
  expect(token2).toBe("fallback-token");
  expect(grant).toHaveBeenCalledTimes(1);
});

it("lets a concurrent server wait for the first server to finish Grant", async () => {
  let owner: unknown;
  let token: unknown;
  const db = mockCacheDatabase((name, args) => {
    if (name === "bkash_finish_gateway_token") {
      expect(args.p_owner).toBe(owner);
      token = args.p_token;
      return { data: true };
    }
    if (token) return { data: { state: "cached", token } };
    if (owner) return { data: { state: "wait" } };
    owner = args.p_owner;
    return { data: { state: "grant" } };
  });
  const grant = vi.fn().mockResolvedValue({
    token: "shared-token",
    expiresAtMs: Date.now() + 60_000,
    validForMs: 60_000,
  });
  const cache = () => new SupabaseBkashTokenCache(db, "fixture-merchant");
  await expect(
    Promise.all([cache().getOrGrant(grant), cache().getOrGrant(grant)])
  ).resolves.toEqual(["shared-token", "shared-token"]);
  expect(grant).toHaveBeenCalledTimes(1);
});

it("releases a failed Grant lease without exposing the token or bypassing the quota", async () => {
  const db = mockCacheDatabase((name, args) => {
    if (name === "bkash_acquire_gateway_token") return { data: { state: "grant" } };
    expect(args).toMatchObject({ p_token: null, p_valid_for_ms: 0 });
    return { data: false };
  });
  const error = new Error("Grant timed out");
  await expect(
    new SupabaseBkashTokenCache(db, "fixture-merchant").getOrGrant(vi.fn().mockRejectedValue(error))
  ).rejects.toBe(error);
  expect(db.rpc).toHaveBeenCalledTimes(2);
});
