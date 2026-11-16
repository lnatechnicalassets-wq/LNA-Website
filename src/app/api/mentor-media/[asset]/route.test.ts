import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { requireStaff, fetchReferences, download } = vi.hoisted(() => ({
  requireStaff: vi.fn(),
  fetchReferences: vi.fn(),
  download: vi.fn(),
}));
vi.mock("@/server/auth/require-staff", () => ({ requireStaff }));
vi.mock("@/server/supabase/clients", () => ({
  hasConfiguredSupabaseServerEnv: () => true,
  createSupabaseAdminClient: () => ({
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        is: () => query,
        or: () => query,
        limit: fetchReferences,
      };
      return query;
    },
    storage: { from: () => ({ download }) },
  }),
}));

const asset = "12888888-4444-4555-8666-123456789abc.webp";
const request = () => GET(new Request("http://localhost"), { params: Promise.resolve({ asset }) });
const ref = { data: [{ id: "fixture" }], error: null };
const noRef = { data: [], error: null };

describe("private mentor media", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    download.mockResolvedValue({ data: new Blob(["media"]), error: null });
  });

  it("allows published images to be served to visitors", async () => {
    fetchReferences.mockResolvedValue(ref);
    const response = await request();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(requireStaff).not.toHaveBeenCalled();
  });

  it("requires staff access to a referenced draft and never downloads unreferenced content", async () => {
    fetchReferences.mockResolvedValue(noRef);
    requireStaff.mockRejectedValueOnce(new Error("guest"));
    expect((await request()).status).toBe(404);
    expect(download).not.toHaveBeenCalled();

    requireStaff.mockResolvedValue({});
    fetchReferences.mockResolvedValueOnce(noRef).mockResolvedValueOnce(ref);
    expect((await request()).status).toBe(200);
    expect(download).toHaveBeenCalledTimes(1);

    expect((await request()).status).toBe(404);
    expect(download).toHaveBeenCalledTimes(1);
  });
});
