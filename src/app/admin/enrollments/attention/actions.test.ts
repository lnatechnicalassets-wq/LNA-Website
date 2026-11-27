// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireStaff } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";
import { getEnrollmentRuntimeConfig } from "@/server/enrollment/config";
import { getPaymentGatewayClient } from "@/server/payments/bkash";
import { dispatchEmailOutboxById } from "@/server/email/resend";
import { reviewPaymentException, recheckPaymentException } from "./actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/auth/require-staff", () => ({ requireStaff: vi.fn() }));
vi.mock("@/server/supabase/clients", () => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock("@/server/enrollment/config", () => ({ getEnrollmentRuntimeConfig: vi.fn() }));
vi.mock("@/server/payments/bkash", () => ({ getPaymentGatewayClient: vi.fn() }));
vi.mock("@/server/email/resend", () => ({ dispatchEmailOutboxById: vi.fn() }));
const rpc = vi.fn();
const query = vi.fn();
const actor = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const attempt = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const form = () => {
  const data = new FormData();
  data.set("attemptId", attempt);
  return data;
};
const claim = {
  payment_id: "PAY-TEST-1",
  tran_id: "INVOICE-1",
  amount_poisha: "750000",
  sandbox: false,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireStaff).mockResolvedValue({
    userId: actor,
    email: "admin@example.invalid",
    fullName: "Fixture Admin",
    role: "super_admin",
    accountState: "active",
    aal: "aal2",
  });
  vi.mocked(createSupabaseAdminClient).mockReturnValue({ rpc } as unknown as SupabaseClient);
  vi.mocked(getEnrollmentRuntimeConfig).mockReturnValue({
    checkoutMode: "live",
    submissionEnabled: true,
    statusLookupEnabled: true,
    emailDispatchMode: "disabled",
    bankTransferEnabled: false,
  });
  vi.mocked(getPaymentGatewayClient).mockReturnValue({
    queryPaymentStatus: query,
    initiateCheckout: vi.fn(),
    executePayment: vi.fn(),
    searchTransaction: vi.fn(),
  });
});

describe("Staff payment recheck", () => {
  it("denies access before database or gateway calls", async () => {
    vi.mocked(requireStaff).mockRejectedValue(new Error("Forbidden"));
    await expect(recheckPaymentException({}, form())).rejects.toThrow("Forbidden");
    expect(rpc).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });
  it("does not query when a lease cannot be obtained", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await recheckPaymentException({}, form())).toMatchObject({
      message: expect.stringContaining("busy"),
    });
    expect(query).not.toHaveBeenCalled();
  });
  it("queries only the claimed payment and saves allowlisted gateway facts", async () => {
    rpc
      .mockResolvedValueOnce({ data: claim, error: null })
      .mockResolvedValueOnce({ data: { status: "pending" }, error: null })
      .mockResolvedValueOnce({ data: true, error: null });
    query.mockResolvedValue({
      paymentId: claim.payment_id,
      merchantInvoiceNumber: claim.tran_id,
      trxId: null,
      amountPoisha: 750000n,
      currency: "BDT",
      transactionStatus: "Initiated",
      statusCode: "0000",
      rawRedacted: { private: "not copied" },
    });
    expect(await recheckPaymentException({}, form())).toMatchObject({ success: true });
    expect(query).toHaveBeenCalledWith(claim.payment_id, {
      tranId: claim.tran_id,
      amountPoisha: 750000n,
    });
    expect(rpc).toHaveBeenNthCalledWith(
      2,
      "finish_staff_payment_recheck",
      expect.objectContaining({
        p_actor_id: actor,
        p_attempt_id: attempt,
        p_result: {
          payment_id: claim.payment_id,
          invoice: claim.tran_id,
          trx_id: null,
          amount_poisha: "750000",
          currency: "BDT",
          transaction_status: "Initiated",
          status_code: "0000",
        },
      })
    );
    expect(rpc).toHaveBeenNthCalledWith(
      3,
      "release_bkash_reconciliation",
      expect.objectContaining({ p_attempt_id: attempt })
    );
    expect(dispatchEmailOutboxById).not.toHaveBeenCalled();
  });
  it("does not query a different gateway environment and releases its lease", async () => {
    rpc
      .mockResolvedValueOnce({ data: { ...claim, sandbox: true }, error: null })
      .mockResolvedValueOnce({ data: true, error: null });
    expect(await recheckPaymentException({}, form())).toMatchObject({
      message: expect.stringContaining("different gateway"),
    });
    expect(query).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenLastCalledWith(
      "release_bkash_reconciliation",
      expect.objectContaining({ p_attempt_id: attempt })
    );
  });
  it("requires the evidence key and does not accept a blank note", async () => {
    const data = form();
    data.set("evidenceKey", "a".repeat(32));
    data.set("note", " ");
    expect(await reviewPaymentException({}, data)).toMatchObject({
      message: expect.stringContaining("note"),
    });
    expect(rpc).not.toHaveBeenCalled();
    data.set("note", "Merchant receipt checked");
    rpc.mockResolvedValue({ data: "STALE", error: null });
    expect(await reviewPaymentException({}, data)).toMatchObject({
      message: expect.stringContaining("changed"),
    });
  });
});
