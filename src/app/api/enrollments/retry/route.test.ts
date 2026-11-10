// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { AppError } from "@/lib/errors";

const mockGetEnrollmentRuntimeConfig = vi.fn();
const mockRetryEnrollmentCheckout = vi.fn();
const mockConsumeRateLimit = vi.fn();

vi.mock("@/server/enrollment/config", () => ({
  getEnrollmentRuntimeConfig: () => mockGetEnrollmentRuntimeConfig(),
}));

vi.mock("@/server/enrollment/service", () => ({
  retryEnrollmentCheckout: (...args: unknown[]) => mockRetryEnrollmentCheckout(...args),
}));

vi.mock("@/server/ratelimit/limiter", () => ({
  extractHashedClientIp: () => "hashed-ip-retry",
  consumeRateLimit: (...args: unknown[]) => mockConsumeRateLimit(...args),
}));

import { POST } from "./route";

describe("POST /api/enrollments/retry", () => {
  beforeEach(() => {
    mockGetEnrollmentRuntimeConfig.mockReturnValue({
      checkoutMode: "mock",
      submissionEnabled: true,
      statusLookupEnabled: true,
      isMockMode: true,
      bankTransferEnabled: false,
    });
    mockConsumeRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 14,
      resetAtMs: Date.now() + 60000,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects cross-origin POST with HTTP 403 and enforces checkout closed 503", async () => {
    const crossOrigin = new NextRequest("http://localhost:3000/api/enrollments/retry", {
      method: "POST",
      headers: { origin: "https://evil.example", "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect((await POST(crossOrigin)).status).toBe(403);

    mockGetEnrollmentRuntimeConfig.mockReturnValueOnce({
      checkoutMode: "closed",
      submissionEnabled: false,
      statusLookupEnabled: false,
      isMockMode: false,
      bankTransferEnabled: false,
    });
    const closedReq = new NextRequest("http://localhost:3000/api/enrollments/retry", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect((await POST(closedReq)).status).toBe(503);
  });

  it("propagates HOLD_EXPIRED (410) and returns fresh checkoutUrl on retry success", async () => {
    mockRetryEnrollmentCheckout.mockRejectedValueOnce(
      new AppError("Hold expired", "HOLD_EXPIRED", 410)
    );
    const expiredReq = new NextRequest("http://localhost:3000/api/enrollments/retry", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify({ applicationReference: "LNA-2M4K-9P7Q", outcomeToken: "tok" }),
    });
    const expiredRes = await POST(expiredReq);
    expect(expiredRes.status).toBe(410);

    mockRetryEnrollmentCheckout.mockResolvedValueOnce({
      applicationReference: "LNA-2M4K-9P7Q",
      checkoutUrl: "https://checkout.pay.bka.sh/v1/PAY-RETRY",
      holdExpiresAt: "2026-11-11T01:00:00Z",
      outcomeToken: "fresh-tok",
    });
    const okReq = new NextRequest("http://localhost:3000/api/enrollments/retry", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify({ applicationReference: "LNA-2M4K-9P7Q", outcomeToken: "tok" }),
    });
    const okRes = await POST(okReq);
    expect(okRes.status).toBe(200);
    expect(await okRes.json()).toMatchObject({
      ok: true,
      checkoutUrl: "https://checkout.pay.bka.sh/v1/PAY-RETRY",
    });
  });
});
