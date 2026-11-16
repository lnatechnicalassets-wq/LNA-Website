import { beforeEach, describe, expect, it, vi } from "vitest";
import { manageEnrollmentRecord } from "./enrollment-record-actions";
import { enrollmentActionCopy as copy } from "@/lib/admin-admissions";

const { rpc, requireStaff, revalidatePath } = vi.hoisted(() => ({
  rpc: vi.fn(),
  requireStaff: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/server/auth/require-staff", () => ({ requireStaff }));
vi.mock("@/server/supabase/clients", () => ({ createSupabaseAdminClient: () => ({ rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath }));

const target = {
  operation: "delete",
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  revision: "2026-11-16T00:00:00Z",
} as const;
function confirmation(value: string) {
  const form = new FormData();
  form.set("confirmation", value);
  form.set("impactToken", "a".repeat(32));
  return form;
}

describe("Permanent admission deletion", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireStaff.mockResolvedValue({ userId: "fixture-staff" });
  });

  it("authorizes the action and rejects an invalid confirmation before querying the database", async () => {
    expect(await manageEnrollmentRecord(target, {}, confirmation("wrong format"))).toEqual({
      message: copy.deleteMismatch,
    });
    expect(requireStaff).toHaveBeenCalledWith("enrollments:manage");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("passes the revision and normalized application ID and refreshes only on success", async () => {
    rpc.mockResolvedValue({ data: "OK", error: null });
    expect(await manageEnrollmentRecord(target, {}, confirmation(" lna-d3v7-0001 "))).toEqual({
      success: true,
    });
    expect(rpc).toHaveBeenCalledWith("purge_staff_record", {
      p_actor: "fixture-staff",
      p_id: target.id,
      p_revision: target.revision,
      p_confirmation: "LNA-D3V7-0001",
      p_kind: "admission",
      p_impact_token: "a".repeat(32),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/enrollments");
  });

  it("reports a protected record without refreshing or issuing another write", async () => {
    rpc.mockResolvedValue({ data: "PAYMENT_PROTECTED", error: null });
    expect(await manageEnrollmentRecord(target, {}, confirmation("LNA-D3V7-0001"))).toEqual({
      message: copy.deletePaymentProtected,
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
