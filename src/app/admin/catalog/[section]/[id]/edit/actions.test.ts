import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireStaff } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";
import { saveCatalogEdit } from "./actions";

vi.mock("@/server/auth/require-staff", () => ({ requireStaff: vi.fn() }));
vi.mock("@/server/supabase/clients", () => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(path);
  },
}));

const target = {
  section: "batches" as const,
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  revision: "2026-11-12T05:00:00.123456+00:00",
};
const staff = {
  userId: "33333333-3333-4333-8333-333333333333",
  role: "super_admin" as const,
  accountState: "active" as const,
  aal: "aal2" as const,
  email: "staff@example.invalid",
  fullName: "Staff Test",
};
const rpc = vi.fn();

function batchForm(changes: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    name: "Edited batch",
    start_date: "2027-01-01",
    end_date: "2027-01-02",
    schedule_description: "Weekday sessions",
    venue: "Dhaka",
    capacity: "30",
    fee_poisha: "1234.50",
    discount_fee_poisha: "1000.25",
    ...changes,
  }))
    form.set(key, value);
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireStaff).mockResolvedValue(staff);
  vi.mocked(createSupabaseAdminClient).mockReturnValue({ rpc } as unknown as ReturnType<
    typeof createSupabaseAdminClient
  >);
  rpc.mockResolvedValue({ error: null });
});

describe("saveCatalogEdit", () => {
  it("requires catalog edit permission before contacting the database", async () => {
    vi.mocked(requireStaff).mockRejectedValueOnce(new Error("Unauthorized"));
    await expect(saveCatalogEdit(target, {}, batchForm())).rejects.toThrow("Unauthorized");
    expect(requireStaff).toHaveBeenCalledWith("catalog:edit");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects an inverted date range and an excessive discount", async () => {
    const result = await saveCatalogEdit(
      target,
      {},
      batchForm({ end_date: "2026-12-31", discount_fee_poisha: "2000.00" })
    );
    expect(result.fieldErrors?.end_date).toHaveLength(1);
    expect(result.fieldErrors?.discount_fee_poisha).toHaveLength(1);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sends exact integer poisha and excludes client-supplied lifecycle fields", async () => {
    await expect(saveCatalogEdit(target, {}, batchForm({ status: "archived" }))).rejects.toThrow(
      "/admin/catalog/batches?saved=1"
    );
    expect(rpc).toHaveBeenCalledWith("update_admin_catalog_record", {
      p_actor_id: staff.userId,
      p_section: "batches",
      p_record_id: target.id,
      p_expected_updated_at: target.revision,
      p_values: {
        name: "Edited batch",
        start_date: "2027-01-01",
        end_date: "2027-01-02",
        schedule_description: "Weekday sessions",
        venue: "Dhaka",
        capacity: 30,
        fee_poisha: "123450",
        discount_fee_poisha: "100025",
      },
    });
  });

  it("asks staff to reload when another edit has already been saved", async () => {
    rpc.mockResolvedValueOnce({ error: { message: "CATALOG_EDIT_STALE" } });
    const result = await saveCatalogEdit(target, {}, batchForm());
    expect(result.reloadRequired).toBe(true);
  });

  it("reports a seat capacity conflict on the capacity field", async () => {
    rpc.mockResolvedValueOnce({ error: { message: "CATALOG_EDIT_CAPACITY" } });
    const result = await saveCatalogEdit(target, {}, batchForm());
    expect(result.fieldErrors?.capacity).toHaveLength(1);
  });
});
