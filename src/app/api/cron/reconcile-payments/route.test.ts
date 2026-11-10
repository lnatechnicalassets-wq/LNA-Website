// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { AppError } from "@/lib/errors";

const mockRequireStaff = vi.fn();
const mockReconcilePendingBkashPayments = vi.fn();

vi.mock("@/server/auth/require-staff", () => ({
  requireStaff: (...args: unknown[]) => mockRequireStaff(...args),
}));

vi.mock("@/server/enrollment/service", () => ({
  reconcilePendingBkashPayments: (...args: unknown[]) => mockReconcilePendingBkashPayments(...args),
}));

import { GET, POST } from "./route";

describe("GET/POST /api/cron/reconcile-payments", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      APP_URL: "https://lnabd.org",
      APP_SECRET: "test_secret_key_for_hmac_tokens_minimum_32_characters",
      CRON_SECRET: "cron_bearer_secret_key_minimum_32_characters_long",
    };
    mockReconcilePendingBkashPayments.mockResolvedValue({
      checkoutMode: "live",
      checked: 2,
      confirmed: 1,
      failed: 1,
      reviewHold: 0,
      stillPending: 0,
      skipped: 0,
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests when bearer secret is invalid and staff session fails", async () => {
    mockRequireStaff.mockRejectedValueOnce(
      new AppError("Authentication required.", "UNAUTHENTICATED", 401)
    );

    const req = new NextRequest("https://lnabd.org/api/cron/reconcile-payments", {
      method: "GET",
      headers: {
        authorization: "Bearer wrong-cron-secret",
      },
    });

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.code).toBe("UNAUTHENTICATED");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(mockReconcilePendingBkashPayments).not.toHaveBeenCalled();
  });

  it("authorizes automated GET cron execution with valid CRON_SECRET bearer header", async () => {
    const req = new NextRequest("https://lnabd.org/api/cron/reconcile-payments", {
      method: "GET",
      headers: {
        authorization: "Bearer cron_bearer_secret_key_minimum_32_characters_long",
      },
    });

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      checkoutMode: "live",
      checked: 2,
      confirmed: 1,
      failed: 1,
    });
    expect(mockRequireStaff).not.toHaveBeenCalled();
    expect(mockReconcilePendingBkashPayments).toHaveBeenCalledWith({
      origin: "https://lnabd.org",
    });
  });

  it("allows verified AAL2 super_admin POST trigger scoped to an application reference", async () => {
    mockRequireStaff.mockResolvedValueOnce({
      userId: "staff-1",
      email: "admin@lnabd.org",
      fullName: "Super Admin",
      role: "super_admin",
      accountState: "active",
      aal: "aal2",
    });

    const req = new NextRequest("https://lnabd.org/api/cron/reconcile-payments", {
      method: "POST",
      headers: {
        origin: "https://lnabd.org",
        "content-type": "application/json",
      },
      body: JSON.stringify({ publicRef: "LNA-2M4K-9P7Q" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockRequireStaff).toHaveBeenCalledWith("enrollments:read");
    expect(mockReconcilePendingBkashPayments).toHaveBeenCalledWith({
      publicRef: "LNA-2M4K-9P7Q",
      origin: "https://lnabd.org",
    });
  });
});
