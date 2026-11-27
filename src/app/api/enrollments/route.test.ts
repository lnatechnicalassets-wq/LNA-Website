// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { AppError } from "@/lib/errors";

const mockGetEnrollmentRuntimeConfig = vi.fn();
const mockStartEnrollmentCheckout = vi.fn();
const mockSubmitManualBkashEnrollment = vi.fn();
const mockConsumeRateLimit = vi.fn();
const mockGetEnrollmentConfig = vi.fn();

vi.mock("@/server/enrollment/config", () => ({
  getEnrollmentRuntimeConfig: () => mockGetEnrollmentRuntimeConfig(),
}));

vi.mock("@/server/enrollment/service", () => ({
  submitManualBkashEnrollment: (...args: unknown[]) => mockSubmitManualBkashEnrollment(...args),
  startEnrollmentCheckout: (...args: unknown[]) => mockStartEnrollmentCheckout(...args),
}));

vi.mock("@/server/ratelimit/limiter", () => ({
  extractHashedClientIp: () => "hashed-ip-1",
  consumeRateLimit: (...args: unknown[]) => mockConsumeRateLimit(...args),
}));

const mockQuestionVersions = vi.fn();
vi.mock("@/server/enrollment/program-questions", () => ({
  loadProgramQuestionSets: async () => ({
    ...mockGetEnrollmentConfig(),
    programQuestionVersions: mockQuestionVersions(),
  }),
}));

import { POST } from "./route";

describe("POST /api/enrollments", () => {
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
    mockQuestionVersions.mockReturnValue({ "mto-readiness": 0 });
    mockGetEnrollmentConfig.mockReturnValue({
      programQuestions: {
        "mto-readiness": [{ id: "university", label: "University", type: "text", required: true }],
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects stale question versions before starting payment", async () => {
    mockQuestionVersions.mockReturnValue({ "mto-readiness": 2 });
    const request = new NextRequest("http://localhost:3000/api/enrollments", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify({
        courseId: "mto-readiness",
        email: "learner@example.com",
        questionVersion: 1,
        expectedPayablePoisha: 750000,
        policyAccepted: true,
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "STALE_APPLICATION_QUESTIONS" });
    expect(mockStartEnrollmentCheckout).not.toHaveBeenCalled();
    expect(mockSubmitManualBkashEnrollment).not.toHaveBeenCalled();
  });

  it("requires explicit fee and policy confirmation before submission", async () => {
    const makeRequest = (body: Record<string, unknown>) =>
      new NextRequest("http://localhost:3000/api/enrollments", {
        method: "POST",
        headers: { origin: "http://localhost:3000", "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    expect(await (await POST(makeRequest({}))).json()).toMatchObject({
      code: "FEE_CONFIRMATION_REQUIRED",
    });
    expect(await (await POST(makeRequest({ expectedPayablePoisha: 750000 }))).json()).toMatchObject(
      { code: "POLICY_ACCEPTANCE_REQUIRED" }
    );
    expect(mockStartEnrollmentCheckout).not.toHaveBeenCalled();
  });

  it("routes a free registration to the checked no-gateway path even when paid checkout is closed", async () => {
    mockGetEnrollmentRuntimeConfig.mockReturnValue({
      checkoutMode: "closed",
      submissionEnabled: false,
    });
    mockSubmitManualBkashEnrollment.mockResolvedValueOnce({
      isFree: true,
      status: "confirmed",
      applicationReference: "LNA-2M4K-9P7Q",
    });
    const body = { courseId: "free-workshop", expectedPayablePoisha: 0, policyAccepted: true };
    const request = new NextRequest("http://localhost:3000/api/enrollments", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    expect((await POST(request)).status).toBe(200);
    expect(mockSubmitManualBkashEnrollment).toHaveBeenCalledWith(body, {
      programQuestionsSnapshot: [],
      expectedPayablePoisha: 0,
    });
    expect(mockStartEnrollmentCheckout).not.toHaveBeenCalled();
  });

  it("rejects cross-origin POST requests with HTTP 403 CSRF_ORIGIN_MISMATCH", async () => {
    const req = new NextRequest("http://localhost:3000/api/enrollments", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const json = await res.json();
    expect(json.code).toBe("CSRF_ORIGIN_MISMATCH");
  });

  it("returns HTTP 503 CHECKOUT_CLOSED when checkout is closed", async () => {
    mockGetEnrollmentRuntimeConfig.mockReturnValue({
      checkoutMode: "closed",
      submissionEnabled: false,
      statusLookupEnabled: false,
      isMockMode: false,
      bankTransferEnabled: false,
    });

    const req = new NextRequest("http://localhost:3000/api/enrollments", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.code).toBe("CHECKOUT_CLOSED");
  });

  it("accepts applicant bKash proof with hosted checkout closed", async () => {
    mockGetEnrollmentRuntimeConfig.mockReturnValue({
      checkoutMode: "closed",
      manualPaymentEnabled: true,
      submissionEnabled: true,
    });
    mockSubmitManualBkashEnrollment.mockResolvedValueOnce({
      isFree: false,
      applicationReference: "LNA-2M4K-9P7Q",
      status: "pending",
    });
    const body = {
      email: "nadia@example.com",
      courseId: "mto-readiness",
      transactionId: "BK15A2H90X",
      expectedPayablePoisha: 750000,
      policyAccepted: true,
      answers: { university: "DU" },
    };
    const req = new NextRequest("http://localhost:3000/api/enrollments", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      isFree: false,
      applicationReference: "LNA-2M4K-9P7Q",
      status: "pending",
    });
    expect(mockSubmitManualBkashEnrollment).toHaveBeenCalledWith(body, {
      expectedPayablePoisha: 750000,
      programQuestionsSnapshot: [
        { id: "university", label: "University", type: "text", required: true },
      ],
    });
    expect(mockStartEnrollmentCheckout).not.toHaveBeenCalled();
  });

  it("enforces IP rate limiting with HTTP 429 RATE_LIMITED", async () => {
    mockConsumeRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetAtMs: Date.now() + 60000,
    });

    const req = new NextRequest("http://localhost:3000/api/enrollments", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: "learner@example.com", courseId: "mto-readiness" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.code).toBe("RATE_LIMITED");
  });

  it("passes program question snapshot to startEnrollmentCheckout and propagates AppError HTTP codes", async () => {
    mockStartEnrollmentCheckout.mockRejectedValueOnce(
      new AppError("Duplicate enrollment", "DUPLICATE_ENROLLMENT", 409)
    );

    const dupReq = new NextRequest("http://localhost:3000/api/enrollments", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        courseId: "mto-readiness",
        batchId: "batch-mto-1",
        fullName: "Nadia",
        email: "nadia@example.com",
        whatsapp: "01711223344",
        answers: { university: "DU" },
        expectedPayablePoisha: 750000,
        policyAccepted: true,
      }),
    });

    const dupRes = await POST(dupReq);
    expect(dupRes.status).toBe(409);
    expect(await dupRes.json()).toMatchObject({ ok: false, code: "DUPLICATE_ENROLLMENT" });

    mockStartEnrollmentCheckout.mockResolvedValueOnce({
      isFree: false,
      applicationReference: "LNA-2M4K-9P7Q",
      status: "pending",
      checkoutUrl: "https://checkout.pay.bka.sh/v1/PAY-1",
      holdExpiresAt: "2026-11-11T01:00:00Z",
      outcomeToken: "signed-token",
    });

    const okReq = new NextRequest("http://localhost:3000/api/enrollments", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        courseId: "mto-readiness",
        batchId: "batch-mto-1",
        fullName: "Nadia",
        email: "nadia@example.com",
        whatsapp: "01711223344",
        answers: { university: "DU" },
        expectedPayablePoisha: 750000,
        policyAccepted: true,
      }),
    });

    const okRes = await POST(okReq);
    expect(okRes.status).toBe(200);
    expect(await okRes.json()).toMatchObject({
      ok: true,
      applicationReference: "LNA-2M4K-9P7Q",
      checkoutUrl: "https://checkout.pay.bka.sh/v1/PAY-1",
    });
    expect(mockStartEnrollmentCheckout).toHaveBeenLastCalledWith(
      expect.any(Object),
      expect.objectContaining({
        origin: "http://localhost:3000",
        programQuestionsSnapshot: [
          { id: "university", label: "University", type: "text", required: true },
        ],
      })
    );
  });
});
