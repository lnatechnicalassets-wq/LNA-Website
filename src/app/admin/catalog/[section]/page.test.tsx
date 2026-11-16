import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

const courseId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const batchId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function mockCatalog(data: unknown, error: unknown = null, course: unknown = null) {
  const response = Promise.resolve({ data, error });
  const query = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: course, error: null }),
    then: response.then.bind(response),
  };
  const courseOptions = Promise.resolve({
    data: [{ id: courseId, title: "Example course", slug: "example-course" }],
    error: null,
  });
  const optionQuery = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: query.maybeSingle,
    then: courseOptions.then.bind(courseOptions),
  };
  const from = vi.fn((section: string) => {
    const isBatchList = Array.isArray(data) && data.some((row) => row && "start_date" in row);
    return section === "courses" && isBatchList ? optionQuery : query;
  });
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
      id: i === 0 ? courseId : String(i),
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
    expect(screen.getAllByRole("link", { name: "View batches" })[0].getAttribute("href")).toBe(
      `/admin/catalog/batches?courseId=${courseId}`
    );
    expect(screen.getByRole("link", { name: "Next" }).getAttribute("href")).toBe(
      "/admin/catalog/courses?q=course_&status=draft&page=3"
    );
  });

  it("opens and closes the course card without navigating, including draft records", async () => {
    mockCatalog([
      {
        id: courseId,
        title: "Draft course",
        subtitle: "A private draft",
        category: "Training",
        venue: "Dhaka",
        status: "draft",
        summary: "Draft course summary",
      },
    ]);
    render(await loadPage("courses"));
    fireEvent.click(screen.getByRole("button", { name: "View course card · Draft course" }));
    const dialog = screen.getByRole("dialog", { name: "Draft course" });
    expect(within(dialog).getByText("Draft course summary")).toBeTruthy();
    expect(within(dialog).getByText(/draft/i, { selector: "span" })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("link", { name: "Edit course" })).toBeTruthy();
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
    expect(screen.getByRole("option", { name: "Example course" })).toBeTruthy();
    expect(screen.getByText("30")).toBeTruthy();
    expect(screen.getByText("৳1,000")).toBeTruthy();
    expect(screen.getByText("৳800.50")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "View batch card · Cohort 1" }));
    const dialog = screen.getByRole("dialog", { name: "Cohort 1" });
    expect(within(dialog).getByText("Example course")).toBeTruthy();
    expect(within(dialog).getByText("৳800.50")).toBeTruthy();
  });

  it("filters batches by their selected course and links a past batch to its confirmed roster", async () => {
    const record = {
      id: batchId,
      name: "Cohort 1",
      venue: "Dhaka",
      start_date: "2026-10-01",
      end_date: "2026-10-02",
      capacity: 30,
      fee_poisha: 100000,
      discount_fee_poisha: null,
      status: "completed",
      courses: { title: "Example course" },
    };
    const { query } = mockCatalog(
      Array(21)
        .fill(record)
        .map((row, index) => ({
          ...row,
          id: index === 0 ? batchId : String(index),
        })),
      null,
      {
        title: "Example course",
        status: "published",
        archived_at: null,
      }
    );

    render(await loadPage("batches", { courseId, status: "completed" }));

    expect(query.eq).toHaveBeenCalledWith("course_id", courseId);
    expect(screen.getByRole("heading", { name: "Batches for Example course" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Next" }).getAttribute("href")).toBe(
      `/admin/catalog/batches?courseId=${courseId}&status=completed&page=2`
    );
    expect(screen.getByRole("link", { name: "Reset" }).getAttribute("href")).toBe(
      `/admin/catalog/batches?courseId=${courseId}`
    );
    expect(screen.getByRole("link", { name: "New batch" }).getAttribute("href")).toBe(
      `/admin/catalog/batches/new?courseId=${courseId}`
    );
    expect(screen.getAllByRole("link", { name: "View students" })[0].getAttribute("href")).toBe(
      `/admin/enrollments?view=students&batchId=${batchId}`
    );
  });

  it("offers Edit and Archive for current courses and Restore for archived ones", async () => {
    const record = {
      id: courseId,
      title: "Example course",
      category: "Training",
      venue: "Dhaka",
      status: "published",
      updated_at: "2026-11-16T03:00:00Z",
      archived_at: null,
    };
    const { query } = mockCatalog([record]);
    render(await loadPage("courses"));
    expect(query.neq).toHaveBeenCalledWith("status", "archived");
    expect(screen.getByRole("link", { name: "Edit course" }).getAttribute("href")).toBe(
      `/admin/catalog/courses/${courseId}/edit`
    );
    expect(screen.getByRole("button", { name: "Archive Example course" })).toBeDefined();

    cleanup();
    const { query: archivedQuery } = mockCatalog([
      { ...record, status: "archived", archived_at: "2026-11-16T03:00:00Z" },
    ]);
    render(await loadPage("courses", { status: "archived" }));
    expect(archivedQuery.or).toHaveBeenCalledWith("status.eq.archived,archived_at.not.is.null");
    expect(screen.getByRole("button", { name: "Restore Example course" })).toBeDefined();
  });

  it("rejects a malformed course filter instead of showing every batch", async () => {
    await expect(loadPage("batches", { courseId: "invalid" })).rejects.toThrow(/not found/i);
    expect(createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("shows a service error distinctly from an empty catalog", async () => {
    mockCatalog(null, { code: "unavailable" });
    render(await loadPage("batches"));

    expect(screen.getByRole("alert").textContent).toContain("could not be loaded");
    expect(screen.queryByText("No batches match these filters.")).toBeNull();
  });
});
