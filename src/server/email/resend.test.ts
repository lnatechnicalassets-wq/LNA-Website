import { describe, it, expect, vi, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dispatchEmailOutboxById, renderConfirmationEmailContent } from "./resend";

function createOutboxAdminStub(row: Record<string, unknown> | null) {
  const updatedPayloads: Array<Record<string, unknown>> = [];

  const admin = {
    rpc: async (fn: string, params: Record<string, unknown>) => {
      if (fn === "claim_confirmation_email") {
        if (!row) return { data: { status: "missing" }, error: null };
        if (row.status === "sent")
          return {
            data: { status: "sent", provider_message_id: row.provider_message_id },
            error: null,
          };
        const payload = row.payload as Record<string, unknown>;
        const receipt =
          row.template === "enrollment_confirmed_paid"
            ? {
                receipt_number: `LNA-R-${String(payload.public_ref).replace(/^LNA-/, "")}`,
                public_ref: payload.public_ref,
                full_name: payload.full_name,
                course_title: payload.course_title,
                batch_name: payload.batch_name,
                confirmed_at: "2026-11-28T03:00:00Z",
                issued_at: "2026-11-28T03:00:01Z",
                collected_poisha: String(payload.payable_poisha),
                payment_method: payload.payment_method,
                is_test: false,
              }
            : null;
        return {
          data: { status: "claimed", outbox: { ...row, dispatch_token: "claim-token" }, receipt },
          error: null,
        };
      }
      expect(fn).toBe("finish_confirmation_email");
      updatedPayloads.push({
        status: params.p_provider_id ? "sent" : "failed",
        last_error: params.p_error,
        retry_count: Number(row?.retry_count ?? 0) + (params.p_provider_id ? 0 : 1),
      });
      return { data: true, error: null };
    },
  } as unknown as SupabaseClient;

  return { admin, updatedPayloads };
}

describe("Resend email outbox & templates (FR-PAY-009, NFR-AVL-01)", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("renders HTML and plain text cleanly without private transaction IDs", () => {
    const rendered = renderConfirmationEmailContent(
      "enrollment_confirmed_paid",
      {
        public_ref: "LNA-2M4K-9P7Q",
        full_name: "Samira <Rahman>",
        course_title: "MTO Readiness Program",
        batch_name: "MTO Batch 1",
        venue: "LNA Campus",
        start_date: "2026-12-01",
        payable_poisha: 550000,
        payment_method: "bkash",
      },
      "https://lnabd.org"
    );

    expect(rendered.subject).toContain("LNA-2M4K-9P7Q");
    expect(rendered.text).toContain("BDT 5,500");
    expect(rendered.text).toContain("https://lnabd.org/status?ref=LNA-2M4K-9P7Q");
    expect(rendered.html).toContain("Samira &lt;Rahman&gt;");
    expect(rendered.html).not.toContain("<Rahman>");
  });

  it("skips sending if outbox row is already marked sent (AT-03 idempotency)", async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "test",
      EMAIL_DISPATCH_MODE: "live",
      RESEND_API_KEY: "re_test_1234567890",
    };
    const { admin } = createOutboxAdminStub({
      id: "out-1",
      template: "enrollment_confirmed_paid",
      recipient_email: "learner@example.com",
      idempotency_key: "key-1",
      payload: {},
      status: "sent",
      provider_message_id: "resend_msg_999",
      retry_count: 0,
    });
    const senderSpy = { send: vi.fn() };

    const res = await dispatchEmailOutboxById("out-1", {
      adminOverride: admin,
      senderOverride: senderSpy,
    });

    expect(res.sent).toBe(true);
    expect(res.alreadySent).toBe(true);
    expect(res.providerMessageId).toBe("resend_msg_999");
    expect(senderSpy.send).not.toHaveBeenCalled();
  });

  it("skips email sending without RESEND_API_KEY or outbox mutation when EMAIL_DISPATCH_MODE=disabled", async () => {
    const nextEnv: NodeJS.ProcessEnv = {
      ...process.env,
      NODE_ENV: "development",
      EMAIL_DISPATCH_MODE: "disabled",
    };
    delete nextEnv.RESEND_API_KEY;
    process.env = nextEnv;

    const { admin, updatedPayloads } = createOutboxAdminStub({
      id: "out-disabled-1",
      template: "enrollment_confirmed_paid",
      recipient_email: "learner@example.com",
      idempotency_key: "confirm:enr-disabled-1",
      payload: {},
      status: "pending",
      provider_message_id: null,
      retry_count: 0,
    });
    const senderSpy = { send: vi.fn() };

    const res = await dispatchEmailOutboxById("out-disabled-1", {
      adminOverride: admin,
      senderOverride: senderSpy,
    });

    expect(res).toEqual({
      sent: false,
      skipped: true,
      mode: "disabled",
    });
    expect(senderSpy.send).not.toHaveBeenCalled();
    expect(updatedPayloads).toHaveLength(0);
  });

  it("dispatches deterministically in EMAIL_DISPATCH_MODE=mock", async () => {
    process.env = { ...process.env, NODE_ENV: "test", EMAIL_DISPATCH_MODE: "mock" };
    const { admin, updatedPayloads } = createOutboxAdminStub({
      id: "11111111-2222-3333-4444-555555555555",
      template: "enrollment_confirmed_free",
      recipient_email: "free@example.com",
      idempotency_key: "key-free-1",
      payload: {
        public_ref: "LNA-FREE-1111",
        full_name: "Kamal Uddin",
        course_title: "Career Planning Workshop",
        batch_name: "Free Cohort 1",
        venue: "LNA Campus",
        start_date: "2026-12-10",
        payable_poisha: 0,
        payment_method: "free",
      },
      status: "pending",
      provider_message_id: null,
      retry_count: 0,
    });

    const res = await dispatchEmailOutboxById("11111111-2222-3333-4444-555555555555", {
      adminOverride: admin,
    });

    expect(res.sent).toBe(true);
    expect(res.mode).toBe("mock");
    expect(res.providerMessageId).toMatch(/^mock_resend_/);
    expect(updatedPayloads[0]).toMatchObject({
      status: "sent",
      last_error: null,
    });
  });

  it("records failed retry count without throwing if email provider errors (NFR-AVL-01)", async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "test",
      EMAIL_DISPATCH_MODE: "live",
      RESEND_API_KEY: "re_test_1234567890",
    };
    const { admin, updatedPayloads } = createOutboxAdminStub({
      id: "out-fail",
      template: "enrollment_confirmed_paid",
      recipient_email: "learner@example.com",
      idempotency_key: "key-fail",
      payload: {
        public_ref: "LNA-FAIL-2222",
        full_name: "Learner",
        course_title: "MTO",
        batch_name: "Batch 1",
        venue: "Campus",
        start_date: "2026-12-01",
        payable_poisha: 750000,
        payment_method: "bkash",
      },
      status: "pending",
      provider_message_id: null,
      retry_count: 1,
    });

    const res = await dispatchEmailOutboxById("out-fail", {
      adminOverride: admin,
      senderOverride: {
        send: async () => ({ error: "Resend temporary outage" }),
      },
    });

    expect(res.sent).toBe(false);
    expect(res.error).toBe("EMAIL_PROVIDER_REJECTED");
    expect(updatedPayloads[0]).toMatchObject({
      status: "failed",
      retry_count: 2,
      last_error: "EMAIL_PROVIDER_REJECTED",
    });
  });
  it("attaches the stored paid receipt and supplies a stable idempotency key", async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "test",
      EMAIL_DISPATCH_MODE: "live",
      RESEND_API_KEY: "re_test_1234567890",
    };
    const { admin } = createOutboxAdminStub({
      id: "paid-1",
      status: "pending",
      template: "enrollment_confirmed_paid",
      recipient_email: "learner@example.com",
      idempotency_key: "confirm:paid-1",
      payload: {
        public_ref: "LNA-W5A0-0001",
        full_name: "Student",
        course_title: "MTO",
        batch_name: "Cohort 1",
        venue: "Dhaka",
        start_date: "2026-12-01",
        payable_poisha: "750001",
        payment_method: "cash",
      },
    });
    const sender = { send: vi.fn().mockResolvedValue({ id: "accepted" }) };
    const result = await dispatchEmailOutboxById("paid-1", {
      adminOverride: admin,
      senderOverride: sender,
    });
    expect(result.sent).toBe(true);
    expect(sender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: "confirm:paid-1",
        attachments: [{ filename: "LNA-R-W5A0-0001.pdf", content: expect.any(String) }],
      })
    );
    expect(
      Buffer.from(sender.send.mock.calls[0][0].attachments[0].content, "base64").toString("ascii")
    ).toContain("%PDF-1.7");
  });
});
