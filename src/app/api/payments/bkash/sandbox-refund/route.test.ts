// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import { BkashRefundUnconfirmedError, BkashRequestNotSentError } from "@/server/payments/bkash";

const mocks = vi.hoisted(() => ({
  env: vi.fn(),
  requireStaff: vi.fn(),
  verifyAuthentication: vi.fn(),
  refund: vi.fn(),
  from: vi.fn(),
  audit: vi.fn(),
  updates: [] as unknown[],
}));

vi.mock("@/server/env", () => ({ parseCurrentServerEnv: mocks.env }));
vi.mock("@/server/auth/require-staff", () => ({ requireStaff: mocks.requireStaff }));
vi.mock("@/server/supabase/clients", () => ({
  createSupabaseAdminClient: () => ({ from: mocks.from }),
}));
vi.mock("@/server/payments/bkash", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/payments/bkash")>()),
  createLiveBkashClientFromEnv: () => ({
    verifyAuthentication: mocks.verifyAuthentication,
    refundSandboxPayment: mocks.refund,
  }),
}));

import { POST } from "./route";

const paymentAttemptId = "8ff8851c-10da-4666-a32c-e78f2fdf6426";
const sandboxEnv = {
  BKASH_SANDBOX_REFUNDS_ENABLED: "true",
  BKASH_CHECKOUT_MODE: "live",
  BKASH_BASE_URL: "https://tokenized.sandbox.bka.sh",
  BKASH_API_VERSION: "v2",
};

const request = () =>
  new Request("https://staging.example.com/api/payments/bkash/sandbox-refund", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentAttemptId, amountPoisha: "1" }),
  });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.updates.length = 0;
  mocks.env.mockReturnValue(sandboxEnv);
  mocks.requireStaff.mockResolvedValue({ userId: "staff-uuid", role: "super_admin" });
  mocks.refund.mockResolvedValue({ refundTrxId: "REFUND-1", amountPoisha: "750000" });
  mocks.audit.mockResolvedValue({ error: null });
});

it("blocks refunds against a production gateway before looking up payment or staff details", async () => {
  mocks.env.mockReturnValue({ ...sandboxEnv, BKASH_BASE_URL: "https://tokenized.pay.bka.sh" });
  expect((await POST(request())).status).toBe(404);
  expect(mocks.requireStaff).not.toHaveBeenCalled();
  expect(mocks.refund).not.toHaveBeenCalled();
});

function mockAttempt() {
  let alreadyClaimed = false;
  mocks.from.mockImplementation(() => {
    let state: string | null | undefined;
    const chain = {
      update: (payload: { sandbox_refund_state: string | null }) => {
        state = payload.sandbox_refund_state;
        mocks.updates.push(payload);
        return chain;
      },
      select: () => chain,
      eq: () => chain,
      is: () => chain,
      insert: mocks.audit,
      maybeSingle: async () => {
        if (state === null) {
          alreadyClaimed = false;
          return { data: { id: paymentAttemptId }, error: null };
        }
        if (state === "started") {
          if (alreadyClaimed) return { data: null, error: null };
          alreadyClaimed = true;
          return { data: { id: paymentAttemptId }, error: null };
        }
        return {
          data: {
            id: paymentAttemptId,
            payment_id: "PAY-1",
            trx_id: "TRX-1",
            tran_id: "invoice-no-1",
            validated_amount_poisha: "750000",
            currency: "BDT",
          },
          error: null,
        };
      },
    };
    return chain;
  });
}

it("refunds the validated amount once and records the refund ID", async () => {
  mockAttempt();
  const response = await POST(request());
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({ refundTrxId: "REFUND-1" });
  expect(mocks.requireStaff).toHaveBeenCalledWith("enrollments:verify-payment");
  expect(mocks.refund).toHaveBeenCalledWith("PAY-1", "TRX-1", 750000n, "invoice-no-1");
  expect(mocks.updates).toContainEqual({
    sandbox_refund_state: "completed",
    sandbox_refund_trx_id: "REFUND-1",
  });

  const duplicate = await POST(request());
  expect(duplicate.status).toBe(409);
  expect(mocks.refund).toHaveBeenCalledTimes(1);
});

it("leaves an upstream HTTP 400 unconfirmed and exposes only the safe diagnostics", async () => {
  mockAttempt();
  mocks.refund.mockRejectedValue(new BkashRefundUnconfirmedError(400, "2013"));
  const response = await POST(request());
  expect(response.status).toBe(502);
  await expect(response.json()).resolves.toMatchObject({
    code: "BKASH_REFUND_UNCONFIRMED",
    gatewayHttpStatus: 400,
    gatewayCode: "2013",
  });
  expect(mocks.updates).toEqual([
    { sandbox_refund_state: "started" },
    { sandbox_refund_state: "unconfirmed" },
  ]);
  expect(mocks.audit).toHaveBeenCalledWith(
    expect.objectContaining({
      action: "bkash_sandbox_refund_unconfirmed",
      after_state: { gateway_http_status: 400, gateway_code: "2013" },
    })
  );
  expect((await POST(request())).status).toBe(409);
  expect(mocks.refund).toHaveBeenCalledTimes(1);
});

it("reports missing token-cache setup before claiming any refund", async () => {
  mockAttempt();
  mocks.verifyAuthentication.mockRejectedValue(
    new AppError("Token cache setup is missing.", "BKASH_AUTH_CACHE_MISSING", 503)
  );
  const response = await POST(request());
  expect(response.status).toBe(503);
  await expect(response.json()).resolves.toMatchObject({
    code: "BKASH_AUTH_CACHE_MISSING",
    refundRequestSent: false,
  });
  expect(mocks.updates).toHaveLength(0);
  expect(mocks.refund).not.toHaveBeenCalled();
});

it("releases the new claim if auth fails before sending the refund", async () => {
  mockAttempt();
  mocks.refund.mockRejectedValueOnce(new BkashRequestNotSentError());
  const response = await POST(request());
  expect(response.status).toBe(503);
  await expect(response.json()).resolves.toMatchObject({ refundRequestSent: false });
  expect(mocks.updates).toEqual([
    { sandbox_refund_state: "started" },
    { sandbox_refund_state: null },
  ]);
  expect(mocks.audit).not.toHaveBeenCalled();
  expect((await POST(request())).status).toBe(200);
});
