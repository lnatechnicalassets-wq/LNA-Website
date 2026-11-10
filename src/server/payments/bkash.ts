import "server-only";
import { z } from "zod";
import { bdtStringToPoisha, poishaToBdtString } from "@/lib/money";
import { AppError } from "@/lib/errors";
import { parseCurrentServerEnv } from "@/server/env";
import { signHmacToken, verifyHmacToken } from "@/server/security/hmac";

export type MockBkashScenario =
  | "success"
  | "pending_timeout"
  | "amount_mismatch"
  | "currency_mismatch"
  | "gateway_failed";

export interface PaymentAttemptRecord {
  attemptId: string;
  tranId: string;
  amountPoisha: bigint;
  currency: "BDT";
  payerReference: string;
  callbackUrl: string;
}

export interface PaymentInitiationResult {
  paymentId: string;
  redirectUrl: string;
  rawRedacted: Record<string, unknown>;
}

export interface MockGatewayContext {
  tranId: string;
  amountPoisha: bigint;
  scenario?: MockBkashScenario;
}

export interface PaymentExecutionResult {
  paymentId: string;
  trxId: string | null;
  merchantInvoiceNumber: string | null;
  amountPoisha: bigint | null;
  currency: string | null;
  transactionStatus: string;
  statusCode: string;
  statusMessage: string;
  outcome: "completed" | "pending" | "failed";
  rawRedacted: Record<string, unknown>;
}

export interface PaymentStatusResult {
  paymentId: string;
  trxId: string | null;
  merchantInvoiceNumber: string | null;
  amountPoisha: bigint | null;
  currency: string | null;
  transactionStatus: string;
  statusCode: string;
  statusMessage: string;
  verificationStatus: string | null;
  rawRedacted: Record<string, unknown>;
}

export interface TransactionSearchResult {
  trxId: string;
  transactionStatus: string;
  amountPoisha: bigint | null;
  currency: string | null;
  merchantInvoiceNumber: string | null;
  statusCode: string;
  statusMessage: string;
  rawRedacted: Record<string, unknown>;
}

export interface PaymentGatewayClient {
  initiateCheckout(attempt: PaymentAttemptRecord): Promise<PaymentInitiationResult>;
  executePayment(paymentId: string, context?: MockGatewayContext): Promise<PaymentExecutionResult>;
  queryPaymentStatus(paymentId: string, context?: MockGatewayContext): Promise<PaymentStatusResult>;
  searchTransaction(trxId: string, context?: MockGatewayContext): Promise<TransactionSearchResult>;
}

const SENSITIVE_KEY_PATTERN =
  /(token|secret|password|app_key|authorization|pin|otp|msisdn|customermsisdn|payeraccount|payerreference|email|phone)/i;

/**
 * Redacts all sensitive credentials and payer identifiers before saving raw payloads in payment_events.
 */
export function redactBkashPayload(input: unknown): Record<string, unknown> {
  function sanitize(value: unknown, depth = 0): unknown {
    if (depth > 5) return "[TRUNCATED]";
    if (value === null || value === undefined) return null;
    if (typeof value === "bigint") return value.toString();
    if (typeof value !== "object") return value;
    if (Array.isArray(value)) {
      return value.slice(0, 20).map((item) => sanitize(item, depth + 1));
    }

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = sanitize(v, depth + 1);
      }
    }
    return out;
  }

  const cleaned = sanitize(input);
  if (cleaned && typeof cleaned === "object" && !Array.isArray(cleaned)) {
    return cleaned as Record<string, unknown>;
  }
  return { value: cleaned };
}

function parseOptionalPoisha(raw: unknown): bigint | null {
  if (raw === undefined || raw === null) return null;
  const text = String(raw).trim();
  if (!text) return null;
  try {
    return bdtStringToPoisha(text);
  } catch {
    return null;
  }
}

export interface BkashClientConfig {
  baseUrl: string;
  apiVersion: string;
  mode: string;
  appKey: string;
  appSecret: string;
  username: string;
  password: string;
  fetchImpl?: typeof fetch;
}

const grantResponseSchema = z.object({
  id_token: z.string().min(1),
  expires_in: z.union([z.number(), z.string()]).optional(),
  statusCode: z.string().optional(),
  statusMessage: z.string().optional(),
});

const createResponseSchema = z.object({
  paymentID: z.string().min(1),
  bkashURL: z.string().url(),
  statusCode: z.string().optional(),
  statusMessage: z.string().optional(),
  merchantInvoiceNumber: z.string().optional(),
});

interface TokenCacheEntry {
  token: string;
  expiresAtMs: number;
}

export class BkashTokenizedClient implements PaymentGatewayClient {
  private readonly apiRoot: string;
  private readonly config: BkashClientConfig;
  private readonly fetchImpl: typeof fetch;
  private tokenCache: TokenCacheEntry | null = null;
  private tokenInFlight: Promise<string> | null = null;

  constructor(config: BkashClientConfig) {
    this.config = config;
    this.fetchImpl = config.fetchImpl ?? fetch;

    const trimmedBase = config.baseUrl.replace(/\/+$/, "");
    const cleanVersion = config.apiVersion.replace(/^\/+|\/+$/g, "");
    this.apiRoot = trimmedBase.endsWith(`/${cleanVersion}`)
      ? trimmedBase
      : `${trimmedBase}/${cleanVersion}`;
  }

  private isProductionGatewayHost(): boolean {
    try {
      return new URL(this.apiRoot).hostname.toLowerCase() === "tokenized.pay.bka.sh";
    } catch {
      return false;
    }
  }

  private async getIdToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.tokenCache && Date.now() < this.tokenCache.expiresAtMs) {
      return this.tokenCache.token;
    }

    if (!forceRefresh && this.tokenInFlight) {
      return this.tokenInFlight;
    }

    const refreshPromise = (async () => {
      const res = await this.fetchImpl(`${this.apiRoot}/tokenized/checkout/token/grant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          username: this.config.username,
          password: this.config.password,
        },
        body: JSON.stringify({
          app_key: this.config.appKey,
          app_secret: this.config.appSecret,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });

      const raw = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      const gatewayStatusCode =
        raw && typeof raw.statusCode === "string" ? raw.statusCode.trim() : null;

      if (!res.ok) {
        throw new AppError("Unable to authenticate with bKash gateway.", "BKASH_AUTH_FAILED", 502, {
          httpStatus: res.status,
          gatewayStatusCode,
        });
      }

      if (gatewayStatusCode && gatewayStatusCode !== "0000") {
        throw new AppError("bKash gateway rejected authentication.", "BKASH_AUTH_REJECTED", 502, {
          gatewayStatusCode,
        });
      }

      const parsed = grantResponseSchema.safeParse(raw);
      if (!parsed.success) {
        throw new AppError("Invalid token grant response from bKash.", "BKASH_AUTH_INVALID", 502, {
          gatewayStatusCode,
        });
      }

      const rawExpiresSec =
        typeof parsed.data.expires_in === "number"
          ? parsed.data.expires_in
          : typeof parsed.data.expires_in === "string"
            ? Number.parseInt(parsed.data.expires_in, 10)
            : 3600;
      const ttlMs =
        Number.isFinite(rawExpiresSec) && rawExpiresSec > 0
          ? Math.min(45 * 60 * 1000, Math.max(60, rawExpiresSec - 120) * 1000)
          : 45 * 60 * 1000;

      this.tokenCache = {
        token: parsed.data.id_token,
        expiresAtMs: Date.now() + ttlMs,
      };
      return parsed.data.id_token;
    })();

    this.tokenInFlight = refreshPromise;
    try {
      return await refreshPromise;
    } finally {
      if (this.tokenInFlight === refreshPromise) {
        this.tokenInFlight = null;
      }
    }
  }

  /**
   * Verifies live Tokenized Checkout /token/grant authentication cleanly without initiating a payment.
   */
  async verifyAuthentication(): Promise<{ ok: true; apiRoot: string }> {
    await this.getIdToken(true);
    return { ok: true, apiRoot: this.apiRoot };
  }

  private async postAuthenticated(
    endpointPath: string,
    payload: Record<string, unknown>,
    retried = false
  ): Promise<Response> {
    const token = await this.getIdToken(retried);
    const res = await this.fetchImpl(`${this.apiRoot}${endpointPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: token,
        "x-app-key": this.config.appKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 401 && !retried) {
      this.tokenCache = null;
      return this.postAuthenticated(endpointPath, payload, true);
    }
    return res;
  }

  async initiateCheckout(attempt: PaymentAttemptRecord): Promise<PaymentInitiationResult> {
    if (attempt.amountPoisha <= 0n || attempt.currency !== "BDT") {
      throw new AppError(
        "Invalid payment attempt currency or amount.",
        "INVALID_PAYMENT_ATTEMPT",
        400
      );
    }

    let parsedCallback: URL;
    try {
      parsedCallback = new URL(attempt.callbackUrl);
    } catch {
      throw new AppError(
        "Configured bKash callback URL is invalid.",
        "BKASH_INVALID_CALLBACK_URL",
        400
      );
    }

    if (this.isProductionGatewayHost() || process.env.NODE_ENV === "production") {
      const host = parsedCallback.hostname.toLowerCase();
      if (parsedCallback.protocol !== "https:" || host === "localhost" || host === "127.0.0.1") {
        throw new AppError(
          "Live bKash checkout requires a public HTTPS callback URL.",
          "BKASH_INVALID_CALLBACK_URL",
          400
        );
      }
    }

    const res = await this.postAuthenticated("/tokenized/checkout/create", {
      mode: this.config.mode || "0011",
      payerReference: attempt.payerReference,
      callbackURL: parsedCallback.toString(),
      merchantInvoiceNumber: attempt.tranId,
      amount: poishaToBdtString(attempt.amountPoisha),
      currency: "BDT",
      intent: "sale",
    });

    const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const gatewayStatusCode = typeof raw.statusCode === "string" ? raw.statusCode.trim() : null;
    if (!res.ok) {
      throw new AppError("bKash checkout session creation failed.", "BKASH_CREATE_FAILED", 502, {
        httpStatus: res.status,
        gatewayStatusCode,
      });
    }

    const parsed = createResponseSchema.safeParse(raw);
    if (!parsed.success || (parsed.data.statusCode && parsed.data.statusCode !== "0000")) {
      throw new AppError(
        "bKash returned an invalid checkout creation payload.",
        "BKASH_CREATE_INVALID",
        502,
        { gatewayStatusCode }
      );
    }

    const checkoutUrl = new URL(parsed.data.bkashURL);
    if (checkoutUrl.protocol !== "https:") {
      throw new AppError("Unsafe non-HTTPS bKash redirect URL rejected.", "BKASH_UNSAFE_URL", 502);
    }

    return {
      paymentId: parsed.data.paymentID,
      redirectUrl: checkoutUrl.toString(),
      rawRedacted: redactBkashPayload(raw),
    };
  }

  async executePayment(paymentId: string): Promise<PaymentExecutionResult> {
    try {
      const res = await this.postAuthenticated("/tokenized/checkout/execute", {
        paymentID: paymentId,
      });

      const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const gatewayStatusCode = String(raw.statusCode ?? res.status).trim();
        const isTransientOrAlreadyDone =
          gatewayStatusCode === "2062" ||
          res.status >= 500 ||
          res.status === 429 ||
          res.status === 408;

        return {
          paymentId,
          trxId: null,
          merchantInvoiceNumber: null,
          amountPoisha: null,
          currency: null,
          transactionStatus: "Pending",
          statusCode: gatewayStatusCode,
          statusMessage: String(raw.statusMessage ?? "Gateway execute returned non-200 status"),
          outcome: isTransientOrAlreadyDone ? "pending" : "failed",
          rawRedacted: redactBkashPayload(raw),
        };
      }

      const transactionStatus = String(raw.transactionStatus ?? "").trim();
      const statusCode = String(raw.statusCode ?? "").trim();
      const statusMessage = String(raw.statusMessage ?? "").trim();
      const amountPoisha = parseOptionalPoisha(raw.amount);

      let outcome: "completed" | "pending" | "failed" = "pending";
      if (transactionStatus === "Completed" && statusCode === "0000") {
        outcome = "completed";
      } else if (
        statusCode === "2062" ||
        statusCode === "9999" ||
        statusCode === "PENDING" ||
        statusCode === "TIMEOUT" ||
        transactionStatus === "Pending"
      ) {
        // 2062 (already completed) or pending/ambiguous state must be confirmed via queryPaymentStatus
        outcome = "pending";
      } else if (
        transactionStatus === "Cancelled" ||
        transactionStatus === "Failed" ||
        (statusCode !== "" && statusCode !== "0000")
      ) {
        outcome = "failed";
      }

      return {
        paymentId: String(raw.paymentID ?? paymentId),
        trxId: raw.trxID ? String(raw.trxID) : null,
        merchantInvoiceNumber: raw.merchantInvoiceNumber ? String(raw.merchantInvoiceNumber) : null,
        amountPoisha,
        currency: raw.currency ? String(raw.currency) : null,
        transactionStatus,
        statusCode,
        statusMessage,
        outcome,
        rawRedacted: redactBkashPayload(raw),
      };
    } catch {
      // Timeout or network interruption during execute MUST leave payment in pending state
      return {
        paymentId,
        trxId: null,
        merchantInvoiceNumber: null,
        amountPoisha: null,
        currency: null,
        transactionStatus: "Pending",
        statusCode: "TIMEOUT",
        statusMessage: "Execute request timed out; awaiting verification query",
        outcome: "pending",
        rawRedacted: { statusCode: "TIMEOUT" },
      };
    }
  }

  async queryPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    const res = await this.postAuthenticated("/tokenized/checkout/payment/status", {
      paymentID: paymentId,
    });
    const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return {
        paymentId,
        trxId: null,
        merchantInvoiceNumber: null,
        amountPoisha: null,
        currency: null,
        transactionStatus: "Pending",
        statusCode: String(raw.statusCode ?? res.status),
        statusMessage: String(raw.statusMessage ?? "Payment status query unavailable"),
        verificationStatus: raw.verificationStatus ? String(raw.verificationStatus) : null,
        rawRedacted: redactBkashPayload(raw),
      };
    }

    return {
      paymentId: String(raw.paymentID ?? paymentId),
      trxId: raw.trxID ? String(raw.trxID) : null,
      merchantInvoiceNumber: raw.merchantInvoiceNumber ? String(raw.merchantInvoiceNumber) : null,
      amountPoisha: parseOptionalPoisha(raw.amount),
      currency: raw.currency ? String(raw.currency) : null,
      transactionStatus: String(raw.transactionStatus ?? "Unknown"),
      statusCode: String(raw.statusCode ?? ""),
      statusMessage: String(raw.statusMessage ?? ""),
      verificationStatus: raw.verificationStatus ? String(raw.verificationStatus) : null,
      rawRedacted: redactBkashPayload(raw),
    };
  }

  async searchTransaction(trxId: string): Promise<TransactionSearchResult> {
    const res = await this.postAuthenticated("/tokenized/checkout/general/searchTransaction", {
      trxID: trxId,
    });
    const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new AppError("bKash searchTransaction request failed.", "BKASH_SEARCH_FAILED", 502);
    }

    return {
      trxId: String(raw.trxID ?? trxId),
      transactionStatus: String(raw.transactionStatus ?? "Unknown"),
      amountPoisha: parseOptionalPoisha(raw.amount),
      currency: raw.currency ? String(raw.currency) : null,
      merchantInvoiceNumber: raw.merchantInvoiceNumber ? String(raw.merchantInvoiceNumber) : null,
      statusCode: String(raw.statusCode ?? ""),
      statusMessage: String(raw.statusMessage ?? ""),
      rawRedacted: redactBkashPayload(raw),
    };
  }
}

export interface SignedMockCheckoutTokenPayload {
  paymentId: string;
  attemptId: string;
  tranId: string;
  amountPoisha: string;
  callbackUrl: string;
  [key: string]: unknown;
}

export interface SignedMockScenarioTokenPayload {
  paymentId: string;
  scenario: MockBkashScenario;
  [key: string]: unknown;
}

export function signMockScenarioToken(
  paymentId: string,
  scenario: MockBkashScenario,
  ttlSeconds = 3600
): string {
  return signHmacToken<SignedMockScenarioTokenPayload>({ paymentId, scenario }, ttlSeconds);
}

export function verifyMockScenarioToken(
  token: string | null | undefined,
  expectedPaymentId: string
): MockBkashScenario | null {
  if (!token) return null;
  const env = parseCurrentServerEnv();
  if (env.NODE_ENV === "production" || env.BKASH_CHECKOUT_MODE !== "mock") {
    return null;
  }
  const verified = verifyHmacToken<SignedMockScenarioTokenPayload>(token);
  if (!verified || verified.paymentId !== expectedPaymentId) {
    return null;
  }
  return verified.scenario;
}

/**
 * Stateless HMAC-backed mock bKash client strictly gated out of production.
 */
export class MockBkashClient implements PaymentGatewayClient {
  private readonly appOrigin: string;

  constructor(appOrigin: string) {
    if (process.env.NODE_ENV === "production") {
      throw new AppError(
        "Mock bKash client cannot run in production.",
        "MOCK_FORBIDDEN_IN_PROD",
        500
      );
    }
    this.appOrigin = appOrigin.replace(/\/+$/, "");
  }

  async initiateCheckout(attempt: PaymentAttemptRecord): Promise<PaymentInitiationResult> {
    if (attempt.amountPoisha <= 0n || attempt.currency !== "BDT") {
      throw new AppError(
        "Invalid payment attempt currency or amount.",
        "INVALID_PAYMENT_ATTEMPT",
        400
      );
    }

    const shortId = attempt.attemptId.replace(/-/g, "").slice(0, 12).toUpperCase();
    const paymentId = `MOCKPAY-${shortId}`;

    const token = signHmacToken<SignedMockCheckoutTokenPayload>(
      {
        paymentId,
        attemptId: attempt.attemptId,
        tranId: attempt.tranId,
        amountPoisha: attempt.amountPoisha.toString(),
        callbackUrl: attempt.callbackUrl,
      },
      1800
    );

    const redirectUrl = `${this.appOrigin}/api/payments/bkash/mock-checkout?token=${encodeURIComponent(token)}`;
    return {
      paymentId,
      redirectUrl,
      rawRedacted: {
        mode: "mock",
        paymentID: paymentId,
        merchantInvoiceNumber: attempt.tranId,
        statusCode: "0000",
        statusMessage: "Successful",
      },
    };
  }

  async executePayment(
    paymentId: string,
    context?: MockGatewayContext
  ): Promise<PaymentExecutionResult> {
    const scenario = context?.scenario ?? "success";
    const expectedPoisha = context?.amountPoisha ?? 750000n;
    const tranId = context?.tranId ?? "MOCK-INV";
    const trxSuffix = paymentId
      .replace(/[^A-Z0-9]/gi, "")
      .slice(-8)
      .toUpperCase();
    const trxId = `MOCKTRX${trxSuffix}`;

    if (scenario === "pending_timeout") {
      return {
        paymentId,
        trxId: null,
        merchantInvoiceNumber: tranId,
        amountPoisha: expectedPoisha,
        currency: "BDT",
        transactionStatus: "Pending",
        statusCode: "TIMEOUT",
        statusMessage: "Simulated bKash execute timeout",
        outcome: "pending",
        rawRedacted: { mock: true, scenario, transactionStatus: "Pending" },
      };
    }

    if (scenario === "gateway_failed") {
      return {
        paymentId,
        trxId: null,
        merchantInvoiceNumber: tranId,
        amountPoisha: expectedPoisha,
        currency: "BDT",
        transactionStatus: "Failed",
        statusCode: "2029",
        statusMessage: "Simulated gateway decline",
        outcome: "failed",
        rawRedacted: { mock: true, scenario, transactionStatus: "Failed", statusCode: "2029" },
      };
    }

    const returnedPoisha = scenario === "amount_mismatch" ? expectedPoisha + 100n : expectedPoisha;
    const returnedCurrency = scenario === "currency_mismatch" ? "USD" : "BDT";

    return {
      paymentId,
      trxId,
      merchantInvoiceNumber: tranId,
      amountPoisha: returnedPoisha,
      currency: returnedCurrency,
      transactionStatus: "Completed",
      statusCode: "0000",
      statusMessage: "Successful",
      outcome: "completed",
      rawRedacted: {
        mock: true,
        scenario,
        paymentID: paymentId,
        trxID: trxId,
        amount: poishaToBdtString(returnedPoisha),
        currency: returnedCurrency,
        statusCode: "0000",
        transactionStatus: "Completed",
      },
    };
  }

  async queryPaymentStatus(
    paymentId: string,
    context?: MockGatewayContext
  ): Promise<PaymentStatusResult> {
    const scenario = context?.scenario ?? "success";
    const expectedPoisha = context?.amountPoisha ?? 750000n;
    const tranId = context?.tranId ?? "MOCK-INV";
    const trxSuffix = paymentId
      .replace(/[^A-Z0-9]/gi, "")
      .slice(-8)
      .toUpperCase();
    const trxId = `MOCKTRX${trxSuffix}`;

    if (scenario === "pending_timeout") {
      return {
        paymentId,
        trxId: null,
        merchantInvoiceNumber: tranId,
        amountPoisha: expectedPoisha,
        currency: "BDT",
        transactionStatus: "Pending",
        statusCode: "PENDING",
        statusMessage: "Simulated payment pending gateway confirmation",
        verificationStatus: "Incomplete",
        rawRedacted: { mock: true, scenario, transactionStatus: "Pending" },
      };
    }

    if (scenario === "gateway_failed") {
      return {
        paymentId,
        trxId: null,
        merchantInvoiceNumber: tranId,
        amountPoisha: expectedPoisha,
        currency: "BDT",
        transactionStatus: "Cancelled",
        statusCode: "2029",
        statusMessage: "Simulated gateway failure",
        verificationStatus: "Failed",
        rawRedacted: { mock: true, scenario, transactionStatus: "Cancelled" },
      };
    }

    const returnedPoisha = scenario === "amount_mismatch" ? expectedPoisha + 100n : expectedPoisha;
    const returnedCurrency = scenario === "currency_mismatch" ? "USD" : "BDT";

    return {
      paymentId,
      trxId,
      merchantInvoiceNumber: tranId,
      amountPoisha: returnedPoisha,
      currency: returnedCurrency,
      transactionStatus: "Completed",
      statusCode: "0000",
      statusMessage: "Successful",
      verificationStatus: "Completed",
      rawRedacted: {
        mock: true,
        scenario,
        paymentID: paymentId,
        trxID: trxId,
        amount: poishaToBdtString(returnedPoisha),
        currency: returnedCurrency,
        statusCode: "0000",
        transactionStatus: "Completed",
      },
    };
  }

  async searchTransaction(
    trxId: string,
    context?: MockGatewayContext
  ): Promise<TransactionSearchResult> {
    const expectedPoisha = context?.amountPoisha ?? 750000n;
    return {
      trxId,
      transactionStatus: "Completed",
      amountPoisha: expectedPoisha,
      currency: "BDT",
      merchantInvoiceNumber: context?.tranId ?? null,
      statusCode: "0000",
      statusMessage: "Successful",
      rawRedacted: { mock: true, trxID: trxId, transactionStatus: "Completed", statusCode: "0000" },
    };
  }
}

export function createLiveBkashClientFromEnv(): BkashTokenizedClient {
  const env = parseCurrentServerEnv();
  if (!env.BKASH_APP_KEY || !env.BKASH_APP_SECRET || !env.BKASH_USERNAME || !env.BKASH_PASSWORD) {
    throw new AppError(
      "bKash live credentials are incomplete on the server.",
      "BKASH_CREDENTIALS_MISSING",
      503
    );
  }

  return new BkashTokenizedClient({
    baseUrl: env.BKASH_BASE_URL,
    apiVersion: env.BKASH_API_VERSION,
    mode: env.BKASH_MODE,
    appKey: env.BKASH_APP_KEY,
    appSecret: env.BKASH_APP_SECRET,
    username: env.BKASH_USERNAME,
    password: env.BKASH_PASSWORD,
  });
}

export function getPaymentGatewayClient(originOverride?: string): PaymentGatewayClient {
  const env = parseCurrentServerEnv();
  if (env.BKASH_CHECKOUT_MODE === "closed") {
    throw new AppError("Online enrollment checkout is currently closed.", "CHECKOUT_CLOSED", 503);
  }

  if (env.BKASH_CHECKOUT_MODE === "mock") {
    if (env.NODE_ENV === "production") {
      throw new AppError(
        "Mock bKash mode is forbidden in production.",
        "MOCK_FORBIDDEN_IN_PROD",
        500
      );
    }
    return new MockBkashClient(originOverride ?? env.APP_URL);
  }

  return createLiveBkashClientFromEnv();
}
