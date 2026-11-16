import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AppError } from "@/lib/errors";
import {
  getAdminCatalogBatchContext,
  listAdmissionBatchOptions,
  listBatchCourseOptions,
} from "@/server/admin/catalog";
import { requireStaff, type VerifiedStaffContext } from "@/server/auth/require-staff";
import { listAdminEnrollments } from "@/server/enrollment/service";
import AdminEnrollmentsPage from "./page";

vi.mock("@/server/admin/catalog", () => ({
  getAdminCatalogBatchContext: vi.fn(),
  listAdmissionBatchOptions: vi.fn(),
  listBatchCourseOptions: vi.fn(),
}));
vi.mock("@/server/auth/require-staff", () => ({ requireStaff: vi.fn() }));
vi.mock("@/server/enrollment/service", () => ({ listAdminEnrollments: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not found");
  },
  redirect: (href: string) => {
    throw new Error(href);
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const staff: VerifiedStaffContext = {
  userId: "staff-1",
  email: "staff@example.com",
  fullName: "Staff member",
  role: "super_admin",
  accountState: "active",
  aal: "aal2",
};
const batchId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const courseId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function loadPage(query: Record<string, string | string[]>) {
  return AdminEnrollmentsPage({ searchParams: Promise.resolve(query) });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireStaff).mockResolvedValue(staff);
  vi.mocked(listBatchCourseOptions).mockResolvedValue([
    { id: courseId, title: "MTO Readiness", slug: "mto-readiness" },
  ]);
  vi.mocked(listAdmissionBatchOptions).mockResolvedValue([
    { id: batchId, name: "Cohort 1", status: "completed" },
  ]);
  vi.mocked(listAdminEnrollments).mockResolvedValue({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 20,
  });
});
afterEach(cleanup);

describe("Admissions batch roster", () => {
  it("requires staff before resolving a batch or reading enrollments", async () => {
    vi.mocked(requireStaff).mockRejectedValueOnce(new AppError("No session", "UNAUTHENTICATED"));
    await expect(loadPage({ batchId })).rejects.toThrow("/admin/login");
    expect(getAdminCatalogBatchContext).not.toHaveBeenCalled();
    expect(listBatchCourseOptions).not.toHaveBeenCalled();
    expect(listAdminEnrollments).not.toHaveBeenCalled();
  });

  it("derives the parent course for a past batch and keeps the Students query confirmed-only", async () => {
    vi.mocked(getAdminCatalogBatchContext).mockResolvedValue({
      id: batchId,
      courseId,
      courseTitle: "MTO Readiness",
      name: "Cohort 1",
    });
    render(await loadPage({ batchId, view: "students", status: "pending" }));

    expect(requireStaff).toHaveBeenCalledWith("enrollments:read");
    expect(getAdminCatalogBatchContext).toHaveBeenCalledWith(batchId);
    expect(listBatchCourseOptions).toHaveBeenCalledWith({ includeArchived: true });
    expect(listAdmissionBatchOptions).toHaveBeenCalledWith(courseId);
    expect(listAdminEnrollments).toHaveBeenCalledWith(
      expect.objectContaining({ courseId, batchId, status: "confirmed" }),
      staff
    );
    expect(screen.getByText("MTO Readiness / Cohort 1")).toBeDefined();
    expect(screen.getByText("No enrolled students")).toBeDefined();
    expect(screen.getByRole("option", { name: "Cohort 1 (Completed)" }).getAttribute("value")).toBe(
      batchId
    );
    expect(screen.queryByLabelText("Status filter")).toBeNull();
  });

  it("filters Applications by course and status with no batch selected", async () => {
    render(await loadPage({ courseId, batchId: "", status: "pending", page: "2" }));

    expect(listAdmissionBatchOptions).toHaveBeenCalledWith(courseId);
    expect(listAdminEnrollments).toHaveBeenCalledWith(
      expect.objectContaining({ courseId, batchId: undefined, status: "pending", page: 2 }),
      staff
    );
    expect(screen.getByRole("link", { name: "Applications" }).getAttribute("aria-current")).toBe(
      "page"
    );
  });

  it("does not load a roster when the supplied course and batch disagree", async () => {
    vi.mocked(getAdminCatalogBatchContext).mockResolvedValue({
      id: batchId,
      courseId,
      courseTitle: "MTO Readiness",
      name: "Cohort 1",
    });
    await expect(
      loadPage({ courseId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", batchId })
    ).rejects.toThrow("not found");
    expect(listAdminEnrollments).not.toHaveBeenCalled();
  });

  it("keeps malformed or missing batch scopes out of the unfiltered enrollment list", async () => {
    await expect(loadPage({ batchId: [batchId, batchId] })).rejects.toThrow("not found");
    expect(getAdminCatalogBatchContext).not.toHaveBeenCalled();

    vi.mocked(getAdminCatalogBatchContext).mockResolvedValue(null);
    await expect(loadPage({ batchId })).rejects.toThrow("not found");
    expect(listAdminEnrollments).not.toHaveBeenCalled();
  });
});
