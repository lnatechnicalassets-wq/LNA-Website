// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { MockBkashClient } from "@/server/payments/bkash";
import { GET } from "./route";

describe("GET /api/payments/bkash/mock-checkout", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns 404 when BKASH_CHECKOUT_MODE is closed or live", async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "development",
      BKASH_CHECKOUT_MODE: "closed",
      APP_SECRET: "test_secret_key_for_hmac_tokens_minimum_32_characters",
    };

    const closedRes = await GET(
      new NextRequest("http://localhost:3000/api/payments/bkash/mock-checkout?token=abc")
    );
    expect(closedRes.status).toBe(404);

    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      BKASH_CHECKOUT_MODE: "closed",
      APP_SECRET: "prod_secret_key_for_hmac_tokens_minimum_32_characters",
    };

    const prodRes = await GET(
      new NextRequest("https://lnabd.org/api/payments/bkash/mock-checkout?token=abc")
    );
    expect(prodRes.status).toBe(404);
  });

  it("returns 400 for invalid token and renders signed simulator actions in mock mode", async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "development",
      APP_URL: "http://localhost:3000",
      APP_SECRET: "test_secret_key_for_hmac_tokens_minimum_32_characters",
      BKASH_CHECKOUT_MODE: "mock",
      EMAIL_DISPATCH_MODE: "disabled",
    };

    const badRes = await GET(
      new NextRequest("http://localhost:3000/api/payments/bkash/mock-checkout?token=tampered")
    );
    expect(badRes.status).toBe(400);

    const mockClient = new MockBkashClient("http://localhost:3000");
    const init = await mockClient.initiateCheckout({
      attemptId: "11111111-2222-3333-4444-555555555555",
      tranId: "TXN-MOCK-1",
      amountPoisha: 750000n,
      currency: "BDT",
      payerReference: "LNA-2M4K-9P7Q",
      callbackUrl: "http://localhost:3000/api/payments/bkash/callback",
    });

    const okRes = await GET(new NextRequest(init.redirectUrl));
    expect(okRes.status).toBe(200);
    expect(okRes.headers.get("cache-control")).toBe("no-store");
    const html = await okRes.text();
    expect(html).toContain("BDT 7500.00");
    expect(html).toContain("TXN-MOCK-1");
    expect(html).toContain("Simulate Success (Verified Completed)");
    expect(html).toContain("Simulate User Cancel (Retains Hold)");
    expect(html).toContain("Simulate Failure Callback (Retains Hold)");
    expect(html).toContain("status=success&amp;mockSig=");
  });
});
