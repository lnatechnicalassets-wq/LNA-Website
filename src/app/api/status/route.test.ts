// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetEnrollmentRuntimeConfig = vi.fn();
const mockLookupEnrollmentStatus = vi.fn();
const mockConsumeRateLimit = vi.fn();

vi.mock("@/server/enrollment/config", () => ({
  getEnrollmentRuntimeConfig: () => mockGetEnrollmentRuntimeConfig(),
}));

vi.mock("@/server/enrollment/service", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    lookupEnrollmentStatus: (...args: unknown[]) => mockLookupEnrollmentStatus(...args),
  };
});

vi.mock("@/server/ratelimit/limiter", () => ({
  extractHashedClientIp: () => "hashed-ip-status",
  consumeRateLimit: (...args: unknown[]) => mockConsumeRateLimit(...args),
}));

import { POST } from "./route";

describe("POST /api/status", () => {
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
      remaining: 24,
      resetAtMs: Date.now() + 60000,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects cross-origin POST requests with HTTP 403", async () => {
    const req = new NextRequest("http://localhost:3000/api/status", {
      method: "POST",
      headers: {
        origin: "https://attacker.example",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        applicationId: "LNA-2M4K-9P7Q",
        verificationType: "email",
        contactValue: "user@example.com",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("returns HTTP 503 when status lookup is disabled and 429 when rate limited", async () => {
    mockGetEnrollmentRuntimeConfig.mockReturnValueOnce({
      checkoutMode: "closed",
      submissionEnabled: false,
      statusLookupEnabled: false,
      isMockMode: false,
      bankTransferEnabled: false,
    });

    const disabledReq = new NextRequest("http://localhost:3000/api/status", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const disabledRes = await POST(disabledReq);
    expect(disabledRes.status).toBe(503);

    mockConsumeRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetAtMs: Date.now() + 60000,
    });
    const limitedReq = new NextRequest("http://localhost:3000/api/status", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const limitedRes = await POST(limitedReq);
    expect(limitedRes.status).toBe(429);
  });

  it("returns uniform null result without leaking PII when lookup returns null or safe summary", async () => {
    mockLookupEnrollmentStatus.mockResolvedValueOnce(null);

    const notFoundReq = new NextRequest("http://localhost:3000/api/status", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify({
        applicationId: "LNA-2M4K-9P7Q",
        verificationType: "email",
        contactValue: "wrong@example.com",
      }),
    });
    const notFoundRes = await POST(notFoundReq);
    expect(notFoundRes.status).toBe(200);
    expect(await notFoundRes.json()).toEqual({ ok: true, found: false, result: null });

    mockLookupEnrollmentStatus.mockResolvedValueOnce({
      applicationReference: "LNA-2M4K-9P7Q",
      fullName: "Nadia Sultana",
      courseTitle: "MTO Readiness Program",
      batchName: "MTO Cohort 1",
      paymentMethod: "bkash",
      status: "Enrollment confirmed",
    });

    const foundReq = new NextRequest("http://localhost:3000/api/status", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify({
        applicationId: "LNA-2M4K-9P7Q",
        verificationType: "phone",
        contactValue: "01711223344",
      }),
    });
    const foundRes = await POST(foundReq);
    expect(foundRes.status).toBe(200);
    const json = await foundRes.json();
    expect(json).toMatchObject({
      ok: true,
      found: true,
      result: {
        applicationReference: "LNA-2M4K-9P7Q",
        status: "Enrollment confirmed",
      },
    });
  });
});
