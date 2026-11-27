// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import { requireSuperAdmin } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";
import { loadPurgeImpact } from "./record-purge-actions";

vi.mock("@/server/auth/require-staff", () => ({ requireSuperAdmin: vi.fn() }));
vi.mock("@/server/supabase/clients", () => ({ createSupabaseAdminClient: vi.fn() }));

describe("loadPurgeImpact Super Admin restriction (pending W2A-T06)", () => {
  const rpc = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createSupabaseAdminClient).mockReturnValue({ rpc } as unknown as ReturnType<
      typeof createSupabaseAdminClient
    >);
  });

  it("denies Admin bypass attempts before querying preview_staff_record_purge", async () => {
    vi.mocked(requireSuperAdmin).mockRejectedValueOnce(
      new AppError("Super Admin access is required.", "FORBIDDEN", 403)
    );

    await expect(
      loadPurgeImpact("student", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
    expect(requireSuperAdmin).toHaveBeenCalledWith("enrollments:manage");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("derives actor identity from verified Super Admin session", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValueOnce({
      userId: "sa-actor-1",
      email: "sa@lnabd.org",
      fullName: "Super Admin",
      role: "super_admin",
      accountState: "active",
      aal: "aal2",
    });
    rpc.mockResolvedValueOnce({ data: { status: "unavailable" }, error: null });

    const impact = await loadPurgeImpact("student", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(impact).toEqual({ status: "unavailable" });
    expect(rpc).toHaveBeenCalledWith("preview_staff_record_purge", {
      p_actor: "sa-actor-1",
      p_kind: "student",
      p_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
  });
});
