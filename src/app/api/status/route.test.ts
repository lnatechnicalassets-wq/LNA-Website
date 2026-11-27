// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const { runtime, limit, send, redeem, deferred } = vi.hoisted(() => ({
  runtime: vi.fn(),
  limit: vi.fn(),
  send: vi.fn(),
  redeem: vi.fn(),
  deferred: vi.fn(),
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: deferred,
}));
vi.mock("@/server/enrollment/config", () => ({ getEnrollmentRuntimeConfig: runtime }));
vi.mock("@/server/enrollment/recovery", () => ({
  sendApplicationRecovery: send,
  redeemApplicationRecovery: redeem,
}));
vi.mock("@/server/ratelimit/limiter", () => ({
  consumeRateLimit: limit,
  extractHashedClientIp: () => "status-ip",
}));
import { POST } from "./route";

function request(body: unknown, origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/status", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
describe("POST /api/status recovery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    runtime.mockReturnValue({ statusLookupEnabled: true, emailDispatchMode: "live" });
    limit.mockResolvedValue({ allowed: true });
  });
  it("rejects cross-origin and disabled requests", async () => {
    expect((await POST(request({}, "https://evil.example"))).status).toBe(403);
    runtime.mockReturnValue({ statusLookupEnabled: false });
    expect((await POST(request({}))).status).toBe(503);
    expect(deferred).not.toHaveBeenCalled();
  });
  it("rate limits and refuses legacy contact-only lookup", async () => {
    limit.mockResolvedValueOnce({ allowed: false });
    expect(
      (await POST(request({ action: "request", email: "student@example.invalid" }))).status
    ).toBe(429);
    expect(
      (
        await POST(
          request({
            applicationId: "LNA-ABCD-0001",
            verificationType: "phone",
            contactValue: "01711223344",
          })
        )
      ).status
    ).toBe(400);
    expect(redeem).not.toHaveBeenCalled();
  });
  it("responds generically before database or email delivery", async () => {
    const first = await POST(
      request({ action: "request", email: " Known@Example.invalid ", reference: "lna-abcd-0001" })
    );
    const second = await POST(request({ action: "request", email: "unknown@example.invalid" }));
    expect(first.status).toBe(202);
    expect(first.headers.get("cache-control")).toBe("no-store");
    expect(await first.json()).toEqual(await second.json());
    expect(send).not.toHaveBeenCalled();
    await deferred.mock.calls[0][0]();
    expect(send).toHaveBeenCalledWith("known@example.invalid", "LNA-ABCD-0001");
  });
  it("requires a valid one-time token and does not allow guessed references", async () => {
    expect((await POST(request({ action: "redeem", token: "LNA-ABCD-0001" }))).status).toBe(400);
    expect(redeem).not.toHaveBeenCalled();
    redeem.mockResolvedValueOnce(null);
    expect((await POST(request({ action: "redeem", token: "a".repeat(64) }))).status).toBe(400);
    const applications = [
      {
        reference: "LNA-ABCD-0001",
        course: "MTO",
        batch: "Batch 1",
        status: "confirmed",
        paymentStatus: "verified",
      },
    ];
    redeem.mockResolvedValueOnce(applications);
    const response = await POST(request({ action: "redeem", token: "b".repeat(64) }));
    expect(await response.json()).toEqual({ ok: true, applications });
  });
});
