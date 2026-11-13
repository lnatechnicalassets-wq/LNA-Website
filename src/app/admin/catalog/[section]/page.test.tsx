import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AppError } from "@/lib/errors";
import { requireStaff } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";
import AdminCatalogPage from "./page";

vi.mock("@/server/auth/require-staff", () => ({ requireStaff: vi.fn() }));
vi.mock("@/server/supabase/clients", () => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(path);
  },
  notFound: () => {
    throw new Error("not found");
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function loadPage(section: string, searchParams: Record<string, string | string[]> = {}) {
  return AdminCatalogPage({
    params: Promise.resolve({ section }),
    searchParams: Promise.resolve(searchParams),
  });
}

function mockCatalog(data: unknown, error: unknown = null) {
  const response = Promise.resolve({ data, error });
  const query = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    then: response.then.bind(response),
  };
  const from = vi.fn().mockReturnValue(query);
  vi.mocked(createSupabaseAdminClient).mockReturnValue({ from } as unknown as ReturnType<
    typeof createSupabaseAdminClient
  >);
  return { from, query };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireStaff).mockResolvedValue({
    userId: "staff-1",
    email: "staff@example.com",
    fullName: "Example Staff",
    role: "super_admin",
    accountState: "active",
    aal: "aal2",
  });
});
afterEach(cleanup);

describe("Staff catalog", () => {
  it("checks staff authorization before reading records", async () => {
    vi.mocked(requireStaff).mockRejectedValueOnce(new AppError("No session", "UNAUTHENTICATED"));
    await expect(loadPage("courses")).rejects.toThrow("/admin/login");
    expect(createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("filters courses and preserves filters in pagination links", async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({
      id: String(i),
      title: `Course ${i}`,
      category: "Training",
      venue: "Dhaka",
      status: "draft",
    }));
    const { from, query } = mockCatalog(rows);

    render(await loadPage("courses", { q: " course_ ", status: "draft", page: "2" }));

    expect(from).toHaveBeenCalledWith("courses");
    expect(query.eq).toHaveBeenCalledWith("status", "draft");
    expect(query.ilike).toHaveBeenCalledWith("title", "%course\\_%");
    expect(query.range).toHaveBeenCalledWith(20, 40);
    expect(screen.getByRole("heading", { name: "Course 19" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Course 20" })).toBeNull();
    expect(screen.getByRole("link", { name: "Next" }).getAttribute("href")).toBe(
      "/admin/catalog/courses?q=course_&status=draft&page=3"
    );
  });

  it("displays batch dates, capacity, and fees from the catalog", async () => {
    const { from, query } = mockCatalog([
      {
        id: "batch-1",
        name: "Cohort 1",
        venue: "Dhaka",
        start_date: "2026-11-23",
        end_date: "2026-11-24",
        capacity: 30,
        fee_poisha: 100000,
        discount_fee_poisha: "80050",
        status: "open_for_enrollment",
        courses: { title: "Example course" },
      },
    ]);

    render(await loadPage("batches", { status: "published", page: "-1" }));

    expect(from).toHaveBeenCalledWith("batches");
    expect(query.eq).not.toHaveBeenCalled();
    expect(query.range).toHaveBeenCalledWith(0, 20);
    expect(screen.getByRole("heading", { name: "Cohort 1" })).toBeTruthy();
    expect(screen.getByText("Example course")).toBeTruthy();
    expect(screen.getByText("30")).toBeTruthy();
    expect(screen.getByText("৳1,000")).toBeTruthy();
    expect(screen.getByText("৳800.50")).toBeTruthy();
  });

  it("shows a service error distinctly from an empty catalog", async () => {
    mockCatalog(null, { code: "unavailable" });
    render(await loadPage("batches"));

    expect(screen.getByRole("alert").textContent).toContain("could not be loaded");
    expect(screen.queryByText("No batches match these filters.")).toBeNull();
  });
});
