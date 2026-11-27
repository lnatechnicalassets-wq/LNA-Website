// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const { rpc, send, env } = vi.hoisted(() => ({ rpc: vi.fn(), send: vi.fn(), env: vi.fn() }));
vi.mock("@/server/supabase/clients", () => ({ createSupabaseAdminClient: () => ({ rpc }) }));
vi.mock("@/server/env", () => ({ parseCurrentServerEnv: env }));
vi.mock("@/server/security/hmac", () => ({ hmacDigestForKey: () => "a".repeat(24) }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));
import { hashRecoveryToken, redeemApplicationRecovery, sendApplicationRecovery } from "./recovery";

describe("Application recovery delivery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    env.mockReturnValue({
      NODE_ENV: "production",
      EMAIL_DISPATCH_MODE: "live",
      APP_URL: "https://lnabd.org",
      RESEND_FROM_EMAIL: "admissions@mail.lnabd.org",
      RESEND_API_KEY: "test-only",
    });
    send.mockResolvedValue({ data: { id: "message-test" }, error: null });
  });
  it("sends only after DB approval and stores a digest rather than the bearer token", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await sendApplicationRecovery("student@example.invalid", "");
    expect(send).toHaveBeenCalledTimes(1);
    const email = send.mock.calls[0][0];
    const match = /https:\/\/lnabd\.org\/status#recovery=([a-f0-9]{64})/.exec(email.text);
    expect(match).not.toBeNull();
    expect(email.to).toEqual(["student@example.invalid"]);
    expect(rpc).toHaveBeenCalledWith("issue_application_recovery", {
      p_email: "student@example.invalid",
      p_email_key: "a".repeat(24),
      p_reference: null,
      p_token_hash: hashRecoveryToken(match![1]),
    });
    expect(JSON.stringify(rpc.mock.calls)).not.toContain(match![1]);
  });
  it("does not send when the address does not qualify or the DB cooldown applies", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    await sendApplicationRecovery("unknown@example.invalid", "");
    expect(send).not.toHaveBeenCalled();
  });
  it("does not issue or send a real recovery link in mock mode", async () => {
    env.mockReturnValue({
      NODE_ENV: "development",
      EMAIL_DISPATCH_MODE: "mock",
      APP_URL: "http://localhost:3000",
    });
    await sendApplicationRecovery("student@example.invalid", "");
    expect(rpc).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
  it("redeems only by token digest and strips unexpected personal fields", async () => {
    rpc.mockResolvedValue({
      data: {
        applications: [
          {
            reference: "LNA-ABCD-0001",
            course: "MTO",
            batch: "Batch 1",
            status: "confirmed",
            paymentStatus: "verified",
            email: "hidden@example.invalid",
          },
        ],
      },
      error: null,
    });
    const token = "b".repeat(64);
    expect(await redeemApplicationRecovery(token)).toEqual([
      {
        reference: "LNA-ABCD-0001",
        course: "MTO",
        batch: "Batch 1",
        status: "confirmed",
        paymentStatus: "verified",
      },
    ]);
    expect(rpc).toHaveBeenCalledWith("redeem_application_recovery", {
      p_token_hash: hashRecoveryToken(token),
    });
  });
});
