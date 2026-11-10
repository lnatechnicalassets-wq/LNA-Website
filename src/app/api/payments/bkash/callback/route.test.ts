// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockProcessBkashCallback = vi.fn();

vi.mock("@/server/enrollment/service", () => ({
  processBkashCallback: (...args: unknown[]) => mockProcessBkashCallback(...args),
}));

import { GET, POST } from "./route";

describe("GET/POST /api/payments/bkash/callback", () => {
  beforeEach(() => {
    mockProcessBkashCallback.mockResolvedValue({
      outcome: "confirmed",
      applicationReference: "LNA-2M4K-9P7Q",
      redirectUrl: "http://localhost:3000/enroll?outcome=confirmed&ref=LNA-2M4K-9P7Q&token=abc",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("handles GET callback redirects with 303 See Other and no-store caching", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/payments/bkash/callback?paymentID=PAY-100&status=success"
    );

    const res = await GET(req);
    expect(res.status).toBe(303);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/enroll?outcome=confirmed&ref=LNA-2M4K-9P7Q&token=abc"
    );
    expect(mockProcessBkashCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentID: "PAY-100",
        status: "success",
      }),
      expect.objectContaining({ origin: "http://localhost:3000" })
    );
  });

  it("handles POST form-urlencoded callback safely and redirects cleanly on unexpected processor error", async () => {
    const req = new NextRequest("http://localhost:3000/api/payments/bkash/callback", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "paymentID=PAY-200&status=cancel",
    });

    mockProcessBkashCallback.mockRejectedValueOnce(new Error("Transient DB blip"));

    const res = await POST(req);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/enroll?outcome=pending");
    expect(mockProcessBkashCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentID: "PAY-200",
        status: "cancel",
      }),
      expect.any(Object)
    );
  });
});

