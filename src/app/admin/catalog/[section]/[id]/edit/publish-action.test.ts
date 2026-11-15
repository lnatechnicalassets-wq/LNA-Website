import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";
import { publishCatalogDraft } from "./publish-action";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(path);
  },
}));
vi.mock("@/server/auth/require-staff", () => ({ requireStaff: vi.fn() }));
vi.mock("@/server/supabase/clients", () => ({ createSupabaseAdminClient: vi.fn() }));

const actor = "55555555-5555-4555-8555-555555555555";
const target = {
  section: "batches" as const,
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  revision: "2026-11-13T07:00:00.123456+00:00",
};
const rpc = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireStaff).mockResolvedValue({
    userId: actor,
    email: "catalog@example.invalid",
    fullName: "Test Staff",
    role: "super_admin",
    accountState: "active",
    aal: "aal2",
  });
  vi.mocked(createSupabaseAdminClient).mockReturnValue({ rpc } as unknown as ReturnType<
    typeof createSupabaseAdminClient
  >);
  rpc.mockResolvedValue({ error: null, data: "test-course" });
});

describe("publishCatalogDraft", () => {
  it("requires catalog permission before accessing the database", async () => {
    vi.mocked(requireStaff).mockRejectedValueOnce(new Error("Unauthorized"));
    await expect(publishCatalogDraft(target, {}, new FormData())).rejects.toThrow("Unauthorized");
    expect(requireStaff).toHaveBeenCalledWith("catalog:edit");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("passes the saved revision and refreshes the public course route", async () => {
    await expect(publishCatalogDraft(target, {}, new FormData())).rejects.toThrow(
      "/admin/catalog/batches?published=1"
    );
    expect(rpc).toHaveBeenCalledWith("publish_admin_catalog_draft", {
      p_actor_id: actor,
      p_section: "batches",
      p_record_id: target.id,
      p_expected_updated_at: target.revision,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/courses/test-course");
  });

  it("explains why a draft batch cannot publish before its course", async () => {
    rpc.mockResolvedValueOnce({ error: { message: "CATALOG_PUBLISH_PARENT" } });
    const result = await publishCatalogDraft(target, {}, new FormData());
    expect(result.message).toBe("Publish the parent course before publishing this batch.");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("asks staff to reload a stale draft", async () => {
    rpc.mockResolvedValueOnce({ error: { message: "CATALOG_PUBLISH_STALE" } });
    const result = await publishCatalogDraft(target, {}, new FormData());
    expect(result.reloadRequired).toBe(true);
  });
});
