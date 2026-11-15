import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireStaff } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";
import { createCatalogDraft } from "./actions";

vi.mock("@/server/auth/require-staff", () => ({ requireStaff: vi.fn() }));
vi.mock("@/server/supabase/clients", () => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(path);
  },
}));

const actor = "44444444-4444-4444-8444-444444444444";
const courseId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const rpc = vi.fn();

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const courseFields = {
  title: "New course",
  slug: "new-course",
  subtitle: "Course subtitle",
  category: "Training",
  summary: "A new course summary.",
  description: "A description for the draft course.",
  venue: "Dhaka",
};
const batchFields = {
  course_id: courseId,
  batch_number: "2",
  name: "New batch",
  venue: "Dhaka",
  start_date: "2027-01-01",
  end_date: "2027-01-02",
  schedule_description: "Weekday sessions",
  capacity: "30",
  fee_poisha: "1234.50",
  discount_fee_poisha: "1000.25",
};

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
  rpc.mockResolvedValue({ error: null });
});

describe("createCatalogDraft", () => {
  it("requires staff authorization before contacting the database", async () => {
    vi.mocked(requireStaff).mockRejectedValueOnce(new Error("Unauthorized"));
    await expect(createCatalogDraft("courses", {}, form(courseFields))).rejects.toThrow(
      "Unauthorized"
    );
    expect(requireStaff).toHaveBeenCalledWith("catalog:edit");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("saves a course draft through the RPC without accepting lifecycle values", async () => {
    await expect(
      createCatalogDraft("courses", {}, form({ ...courseFields, status: "published" }))
    ).rejects.toThrow("/admin/catalog/courses?created=1");
    expect(rpc).toHaveBeenCalledWith("create_admin_catalog_draft", {
      p_actor_id: actor,
      p_section: "courses",
      p_values: courseFields,
    });
  });

  it("validates batch fields and sends exact poisha amounts", async () => {
    const bad = await createCatalogDraft("batches", {}, form({ ...batchFields, course_id: "" }));
    expect(bad.fieldErrors?.course_id).toHaveLength(1);
    expect(rpc).not.toHaveBeenCalled();

    await expect(createCatalogDraft("batches", {}, form(batchFields))).rejects.toThrow(
      "/admin/catalog/batches?created=1"
    );
    expect(rpc).toHaveBeenCalledWith("create_admin_catalog_draft", {
      p_actor_id: actor,
      p_section: "batches",
      p_values: {
        ...batchFields,
        batch_number: 2,
        capacity: 30,
        fee_poisha: "123450",
        discount_fee_poisha: "100025",
      },
    });
  });

  it("reports a duplicate batch number on the form", async () => {
    rpc.mockResolvedValueOnce({ error: { message: "CATALOG_CREATE_BATCH_NUMBER" } });
    const result = await createCatalogDraft("batches", {}, form(batchFields));
    expect(result.fieldErrors?.batch_number).toHaveLength(1);
  });
});
