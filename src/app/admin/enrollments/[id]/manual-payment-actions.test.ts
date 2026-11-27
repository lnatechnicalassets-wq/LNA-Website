// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { manualPaymentReviewCopy as copy } from "@/lib/admin-manual-admission";
import { AppError } from "@/lib/errors";
import { requireStaff } from "@/server/auth/require-staff";
import { dispatchEmailOutboxById } from "@/server/email/resend";
import { createSupabaseAdminClient } from "@/server/supabase/clients";
import { reviewManualPayment } from "./manual-payment-actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(path);
  },
}));
vi.mock("@/server/auth/require-staff", () => ({ requireStaff: vi.fn() }));
vi.mock("@/server/email/resend", () => ({ dispatchEmailOutboxById: vi.fn() }));
vi.mock("@/server/supabase/clients", () => ({ createSupabaseAdminClient: vi.fn() }));

const actorId = "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const target = { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", revision: "2026-11-16T00:00:00Z" };
const outboxId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const rpc = vi.fn();

function form(decision = "approve") {
  const data = new FormData();
  data.set("decision", decision);
  data.set("receivedAmount", "7,500.25");
  data.set("attestation", "yes");
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireStaff).mockResolvedValue({
    userId: actorId,
    email: "staff@example.invalid",
    fullName: "Fixture Staff",
    role: "super_admin",
    accountState: "active",
    aal: "aal2",
  });
  vi.mocked(createSupabaseAdminClient).mockReturnValue({ rpc } as unknown as SupabaseClient);
  vi.mocked(dispatchEmailOutboxById).mockResolvedValue({ sent: false, mode: "disabled" });
});

describe("Manual payment review", () => {
  it("requires the review permission before calling the database", async () => {
    vi.mocked(requireStaff).mockRejectedValue(new AppError("Forbidden", "FORBIDDEN"));
    await expect(reviewManualPayment(target, {}, form())).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(requireStaff).toHaveBeenCalledWith("enrollments:verify-payment");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("requires attestation and rejects invalid amounts without writing", async () => {
    const data = form();
    data.delete("attestation");
    await expect(reviewManualPayment(target, {}, data)).resolves.toEqual({
      message: copy.invalidReview,
    });
    data.set("attestation", "yes");
    data.set("receivedAmount", "7,50.125");
    await expect(reviewManualPayment(target, {}, data)).resolves.toEqual({
      message: copy.invalidAmount,
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("passes only the authenticated actor and exact amount and dispatches an outbox result", async () => {
    const data = form();
    data.set("actorId", target.id);
    rpc.mockResolvedValue({ data: { ok: true, outbox_id: outboxId }, error: null });
    await expect(reviewManualPayment(target, {}, data)).rejects.toThrow(
      `/admin/enrollments/${target.id}`
    );
    expect(rpc).toHaveBeenCalledWith("review_staff_manual_payment", {
      p_actor_id: actorId,
      p_enrollment_id: target.id,
      p_expected_updated_at: target.revision,
      p_decision: "approve",
      p_verified_poisha: "750025",
    });
    expect(dispatchEmailOutboxById).toHaveBeenCalledWith(outboxId);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/enrollments");
  });

  it("keeps a duplicate pending and submits rejection without an amount", async () => {
    rpc.mockResolvedValueOnce({
      data: { ok: false, code: "DUPLICATE_PAYMENT_REFERENCE" },
      error: null,
    });
    await expect(reviewManualPayment(target, {}, form())).resolves.toEqual({
      message: copy.duplicateReference,
    });
    rpc.mockResolvedValueOnce({ data: { ok: true, outbox_id: null }, error: null });
    await expect(reviewManualPayment(target, {}, form("reject"))).rejects.toThrow(
      `/admin/enrollments/${target.id}`
    );
    expect(rpc).toHaveBeenLastCalledWith(
      "review_staff_manual_payment",
      expect.objectContaining({
        p_decision: "reject",
        p_verified_poisha: null,
      })
    );
    expect(dispatchEmailOutboxById).not.toHaveBeenCalled();
  });

  it("returns stale review guidance when optimistic locking detects a concurrent edit", async () => {
    rpc.mockResolvedValueOnce({ data: { ok: false, code: "STALE_REVIEW" }, error: null });
    await expect(reviewManualPayment(target, {}, form())).resolves.toEqual({
      message: copy.stale,
    });
    expect(dispatchEmailOutboxById).not.toHaveBeenCalled();
  });
});
