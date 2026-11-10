import { describe, it, expect, vi, afterEach } from "vitest";
import {
  BkashTokenizedClient,
  MockBkashClient,
  redactBkashPayload,
  signMockScenarioToken,
  verifyMockScenarioToken,
  getPaymentGatewayClient,
} from "./bkash";

describe("bKash gateway adapter (FR-PAY-004, FR-PAY-005)", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("redacts sensitive credentials and payer PII recursively", () => {
    const cleaned = redactBkashPayload({
      id_token: "secret-jwt",
      app_key: "key123",
      password: "pw",
      customerMsisdn: "01711223344",
      payerReference: "LNA-TEST-1234",
      email: "user@example.com",
      trxID: "TRX999",
      statusCode: "0000",
    });

    expect(cleaned.id_token).toBe("[REDACTED]");
    expect(cleaned.app_key).toBe("[REDACTED]");
    expect(cleaned.password).toBe("[REDACTED]");
    expect(cleaned.customerMsisdn).toBe("[REDACTED]");
    expect(cleaned.payerReference).toBe("[REDACTED]");
    expect(cleaned.email).toBe("[REDACTED]");
    expect(cleaned.trxID).toBe("TRX999");
    expect(cleaned.statusCode).toBe("0000");
  });

  it("executes tokenized grant -> create -> execute -> query flow with 401 token refresh retry", async () => {
    const fetchMock = vi
      .fn()
      // 1. grant token
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id_token: "tok-1", expires_in: 3600 }), { status: 200 })
      )
      // 2. create payment -> returns 401 to trigger refresh
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Expired" }), { status: 401 }))
      // 3. grant refreshed token
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id_token: "tok-2", expires_in: 3600 }), { status: 200 })
      )
      // 4. create retry -> succeeds
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paymentID: "PAY-100",
            bkashURL: "https://checkout.pay.bka.sh/v1/checkout/PAY-100",
            statusCode: "0000",
            statusMessage: "Successful",
          }),
          { status: 200 }
        )
      )
      // 5. execute payment
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paymentID: "PAY-100",
            trxID: "TRX-8899",
            merchantInvoiceNumber: "INV-001",
            amount: "7500.00",
            currency: "BDT",
            transactionStatus: "Completed",
            statusCode: "0000",
            statusMessage: "Successful",
          }),
          { status: 200 }
        )
      )
      // 6. query payment status
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paymentID: "PAY-100",
            trxID: "TRX-8899",
            merchantInvoiceNumber: "INV-001",
            amount: "7500.00",
            currency: "BDT",
            transactionStatus: "Completed",
            statusCode: "0000",
            statusMessage: "Successful",
            verificationStatus: "Completed",
          }),
          { status: 200 }
        )
      );

    const client = new BkashTokenizedClient({
      baseUrl: "https://tokenized.sandbox.bka.sh",
      apiVersion: "v1.2.0-beta",
      mode: "0011",
      appKey: "ak",
      appSecret: "as",
      username: "user",
      password: "pw",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const init = await client.initiateCheckout({
      attemptId: "att-1",
      tranId: "INV-001",
      amountPoisha: 750000n,
      currency: "BDT",
      payerReference: "LNA-ABCD-EFGH",
      callbackUrl: "https://lnabd.org/api/payments/bkash/callback",
    });

    expect(init.paymentId).toBe("PAY-100");
    expect(init.redirectUrl).toBe("https://checkout.pay.bka.sh/v1/checkout/PAY-100");

    const createCallBody = JSON.parse(String(fetchMock.mock.calls[3][1]?.body));
    expect(createCallBody).toMatchObject({
      mode: "0011",
      amount: "7500.00",
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: "INV-001",
    });

    const exec = await client.executePayment("PAY-100");
    expect(exec.outcome).toBe("completed");
    expect(exec.amountPoisha).toBe(750000n);
    expect(exec.trxId).toBe("TRX-8899");

    const query = await client.queryPaymentStatus("PAY-100");
    expect(query.transactionStatus).toBe("Completed");
    expect(query.amountPoisha).toBe(750000n);
  });

  it("leaves executePayment in pending state when bKash network times out", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id_token: "tok" }), { status: 200 }))
      .mockRejectedValueOnce(new Error("Request timed out"));

    const client = new BkashTokenizedClient({
      baseUrl: "https://tokenized.sandbox.bka.sh",
      apiVersion: "v1.2.0-beta",
      mode: "0011",
      appKey: "ak",
      appSecret: "as",
      username: "user",
      password: "pw",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const exec = await client.executePayment("PAY-TIMEOUT");
    expect(exec.outcome).toBe("pending");
    expect(exec.transactionStatus).toBe("Pending");
    expect(exec.statusCode).toBe("TIMEOUT");
  });

  it("rejects non-HTTPS redirect URLs from gateway create response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id_token: "tok" }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paymentID: "PAY-UNSAFE",
            bkashURL: "http://insecure.example.com/pay",
            statusCode: "0000",
          }),
          { status: 200 }
        )
      );

    const client = new BkashTokenizedClient({
      baseUrl: "https://tokenized.sandbox.bka.sh",
      apiVersion: "v1.2.0-beta",
      mode: "0011",
      appKey: "ak",
      appSecret: "as",
      username: "user",
      password: "pw",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(
      client.initiateCheckout({
        attemptId: "att-2",
        tranId: "INV-002",
        amountPoisha: 550000n,
        currency: "BDT",
        payerReference: "LNA-ABCD-1234",
        callbackUrl: "https://lnabd.org/api/payments/bkash/callback",
      })
    ).rejects.toThrow(/non-HTTPS/i);
  });

  it("enforces production block on MockBkashClient and closed checkout gate", () => {
    process.env.BKASH_CHECKOUT_MODE = "closed";
    expect(() => getPaymentGatewayClient()).toThrow(/currently closed/i);

    process.env = { ...process.env, NODE_ENV: "production" };
    expect(() => new MockBkashClient("http://localhost:3000")).toThrow(/cannot run in production/i);
  });

  it("verifies signed mock scenario tokens only in non-prod mock mode", () => {
    process.env = { ...process.env, NODE_ENV: "test", BKASH_CHECKOUT_MODE: "mock" };
    const sig = signMockScenarioToken("MOCKPAY-123", "amount_mismatch");
    expect(verifyMockScenarioToken(sig, "MOCKPAY-123")).toBe("amount_mismatch");
    expect(verifyMockScenarioToken(sig, "MOCKPAY-OTHER")).toBeNull();

    process.env = {
      ...process.env,
      NODE_ENV: "test",
      BKASH_CHECKOUT_MODE: "live",
      BKASH_APP_KEY: "test_app_key_val",
      BKASH_APP_SECRET: "test_app_secret_val",
      BKASH_USERNAME: "test_username_val",
      BKASH_PASSWORD: "test_password_val",
      SUPABASE_SECRET_KEY: "sb_secret_test_1234567890",
    };
    expect(verifyMockScenarioToken(sig, "MOCKPAY-123")).toBeNull();
  });

  it("rejects HTTP 200 /token/grant responses with non-0000 statusCode and supports verifyAuthentication()", async () => {
    const rejectedFetch = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id_token: "ignored",
          statusCode: "2001",
          statusMessage: "Invalid app_key or app_secret",
        }),
        { status: 200 }
      )
    );

    const rejectedClient = new BkashTokenizedClient({
      baseUrl: "https://tokenized.pay.bka.sh",
      apiVersion: "v1.2.0-beta",
      mode: "0011",
      appKey: "ak",
      appSecret: "as",
      username: "user",
      password: "pw",
      fetchImpl: rejectedFetch as unknown as typeof fetch,
    });

    await expect(rejectedClient.verifyAuthentication()).rejects.toMatchObject({
      code: "BKASH_AUTH_REJECTED",
    });

    const okFetch = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id_token: "live-token",
          expires_in: 3600,
          statusCode: "0000",
          statusMessage: "Successful",
        }),
        { status: 200 }
      )
    );

    const validClient = new BkashTokenizedClient({
      baseUrl: "https://tokenized.pay.bka.sh",
      apiVersion: "v1.2.0-beta",
      mode: "0011",
      appKey: "ak",
      appSecret: "as",
      username: "user",
      password: "pw",
      fetchImpl: okFetch as unknown as typeof fetch,
    });

    await expect(validClient.verifyAuthentication()).resolves.toEqual({
      ok: true,
      apiRoot: "https://tokenized.pay.bka.sh/v1.2.0-beta",
    });
  });

  it("rejects non-HTTPS localhost callback URLs when targeting live tokenized.pay.bka.sh", async () => {
    const fetchMock = vi.fn();
    const client = new BkashTokenizedClient({
      baseUrl: "https://tokenized.pay.bka.sh",
      apiVersion: "v1.2.0-beta",
      mode: "0011",
      appKey: "ak",
      appSecret: "as",
      username: "user",
      password: "pw",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(
      client.initiateCheckout({
        attemptId: "att-live-1",
        tranId: "INV-LIVE-001",
        amountPoisha: 750000n,
        currency: "BDT",
        payerReference: "LNA-2M4K-9P7Q",
        callbackUrl: "http://localhost:3000/api/payments/bkash/callback",
      })
    ).rejects.toMatchObject({
      code: "BKASH_INVALID_CALLBACK_URL",
      statusCode: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("distinguishes bKash decline status codes (2023) from recoverable pending status codes (2062)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id_token: "tok-1", expires_in: 3600 }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            statusCode: "2023",
            statusMessage: "Insufficient Balance",
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            statusCode: "2062",
            statusMessage: "The payment has already been completed",
          }),
          { status: 400 }
        )
      );

    const client = new BkashTokenizedClient({
      baseUrl: "https://tokenized.pay.bka.sh",
      apiVersion: "v1.2.0-beta",
      mode: "0011",
      appKey: "ak",
      appSecret: "as",
      username: "user",
      password: "pw",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const declined = await client.executePayment("PAY-DECLINE");
    expect(declined.outcome).toBe("failed");
    expect(declined.statusCode).toBe("2023");

    const alreadyDone = await client.executePayment("PAY-2062");
    expect(alreadyDone.outcome).toBe("pending");
    expect(alreadyDone.statusCode).toBe("2062");
  });
});
