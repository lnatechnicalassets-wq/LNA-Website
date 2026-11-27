// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { catalogArchiveCopy as copy } from "@/lib/admin-catalog";
import { AppError } from "@/lib/errors";
import { requireStaff } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";
import { archiveCatalogRecord } from "./catalog-archive-action";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/auth/require-staff", () => ({ requireStaff: vi.fn() }));
vi.mock("@/server/supabase/clients", () => ({ createSupabaseAdminClient: vi.fn() }));

const actorId = "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const target = {
  id: "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  section: "batches" as const,
  revision: "2026-11-16T00:00:00Z",
  restore: false,
};
const rpc = vi.fn();

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
});

describe("Catalog archive action characterization", () => {
  it("requires catalog:archive before invoking archive_staff_catalog", async () => {
    vi.mocked(requireStaff).mockRejectedValueOnce(new AppError("Forbidden", "FORBIDDEN", 403));
    await expect(archiveCatalogRecord(target, {}, new FormData())).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(requireStaff).toHaveBeenCalledWith("catalog:archive");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("enforces optimistic locking via STALE and revalidates catalog routes on OK", async () => {
    rpc.mockResolvedValueOnce({ data: "STALE", error: null });
    await expect(archiveCatalogRecord(target, {}, new FormData())).resolves.toEqual({
      message: copy.stale,
    });
    expect(revalidatePath).not.toHaveBeenCalled();

    rpc.mockResolvedValueOnce({ data: "OK", error: null });
    await expect(archiveCatalogRecord(target, {}, new FormData())).resolves.toEqual({
      success: true,
    });
    expect(rpc).toHaveBeenLastCalledWith("archive_staff_catalog", {
      p_actor_id: actorId,
      p_section: "batches",
      p_record_id: target.id,
      p_expected_updated_at: target.revision,
      p_restore: false,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/catalog/batches");
    expect(revalidatePath).toHaveBeenCalledWith("/enroll");
  });
});
