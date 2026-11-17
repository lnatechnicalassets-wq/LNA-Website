import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { EnrollmentRowActions } from "./enrollment-row-actions";
import { loadPurgeImpact } from "@/app/admin/record-purge-actions";
import { AdminEnrollmentsView } from "./admin-enrollments-view";
import type { VerifiedStaffContext } from "@/server/auth/require-staff";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

const SAMPLE_STAFF: VerifiedStaffContext = {
  userId: "staff-1",
  email: "superadmin@lnabd.org",
  role: "super_admin",
  accountState: "active",
  aal: "aal2",
  fullName: "LNA Super Admin",
};

const SAMPLE_RECORD = {
  id: "enr-uuid-1",
  publicRef: "LNA-2M4K-9P7Q",
  fullName: "Nadia Sultana",
  email: "nadia@example.com",
  phone: "01711223344",
  courseSlug: "mto-readiness",
  courseTitle: "MTO Readiness Program",
  batchSlug: "batch-mto-2026-01",
  batchName: "MTO Readiness Cohort 1",
  paymentMethod: "bkash" as const,
  paymentStatus: "validated",
  status: "confirmed",
  payablePoisha: 550000,
  currency: "BDT",
  holdExpiresAt: null,
  confirmedAt: "2026-11-11T00:00:00Z",
  createdAt: "2026-11-10T23:45:00Z",
  isDevFixture: false,
};

vi.mock("./[id]/manual-payment-actions", () => ({ reviewManualPayment: vi.fn() }));
vi.mock("./enrollment-record-actions", () => ({ manageEnrollmentRecord: vi.fn() }));

vi.mock("@/app/admin/record-purge-actions", () => ({ loadPurgeImpact: vi.fn() }));

describe("AdminEnrollmentsView (/admin/enrollments)", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it.each(["staff", "applicant"] as const)(
    "shows direct actions and opens payment review for a %s submission",
    (source) => {
      const row = {
        ...SAMPLE_RECORD,
        updatedAt: "2026-11-16T03:00:00Z",
        isStaffManualPayment: source === "staff",
        isApplicantManualPayment: source === "applicant",
        submittedPaymentRef: "TEST-BKASH-012",
        status: "application_in_process",
        paymentStatus: "pending_verification",
      };
      render(
        <AdminEnrollmentsView
          staff={SAMPLE_STAFF}
          currentSearch=""
          currentStatus=""
          list={{ totalCount: 1, page: 1, pageSize: 20, items: [row] }}
        />
      );
      expect(screen.getByRole("link", { name: `View ${row.publicRef}` })).toBeDefined();
      expect(screen.getByRole("button", { name: `Edit ${row.publicRef}` })).toBeDefined();
      expect(screen.getByRole("button", { name: `Archive ${row.publicRef}` })).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: `Confirm ${row.publicRef}` }));
      const popup = within(screen.getByRole("dialog", { name: `Confirm ${row.publicRef}` }));
      expect(popup.getByText("TEST-BKASH-012")).toBeDefined();
      expect(popup.getByText("৳5,500")).toBeDefined();
      expect(popup.getByRole("button", { name: "Approve payment and confirm seat" })).toBeDefined();
      fireEvent.click(popup.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(refreshMock).not.toHaveBeenCalled();
    }
  );

  it("offers Restore in the archive and keeps payment review unavailable", () => {
    render(
      <AdminEnrollmentsView
        staff={SAMPLE_STAFF}
        currentSearch=""
        currentStatus=""
        view="archived"
        list={{
          totalCount: 1,
          page: 1,
          pageSize: 20,
          items: [
            {
              ...SAMPLE_RECORD,
              updatedAt: "2026-11-16T03:00:00Z",
              archivedAt: "2026-11-16T03:00:00Z",
            },
          ],
        }}
      />
    );
    expect(screen.getByRole("button", { name: /Restore LNA/ })).toBeDefined();
    expect(screen.queryByRole("button", { name: /Delete|Confirm LNA|Edit LNA/ })).toBeNull();
  });

  it("explains protected payments from the application detail without offering confirmation", async () => {
    vi.mocked(loadPurgeImpact).mockResolvedValue({ status: "payment_protected" });
    render(
      <EnrollmentRowActions
        item={{ ...SAMPLE_RECORD, updatedAt: "2026-11-16T03:00:00Z" }}
        showView={false}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: `Delete ${SAMPLE_RECORD.publicRef}` }));
    const dialog = within(
      await screen.findByRole("dialog", { name: "Permanent deletion is unavailable" })
    );
    expect(dialog.getByText(/verified or unresolved payment/)).toBeDefined();
    expect(dialog.queryByRole("button", { name: "Delete permanently" })).toBeNull();
  });

  it("requires the application ID and previews the deleted profile from the application detail", async () => {
    vi.mocked(loadPurgeImpact).mockResolvedValue({
      status: "eligible",
      token: "a".repeat(32),
      profile: "deleted",
      applications: 1,
      courseRecords: 0,
      contactRecords: 1,
      paymentRecords: 2,
      emailRecords: 0,
    });
    render(
      <EnrollmentRowActions
        item={{ ...SAMPLE_RECORD, updatedAt: "2026-11-16T03:00:00Z" }}
        showView={false}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: `Delete ${SAMPLE_RECORD.publicRef}` }));
    const dialog = within(
      screen.getByRole("dialog", { name: `Delete permanently ${SAMPLE_RECORD.publicRef}` })
    );
    expect(
      await dialog.findByLabelText(`Type ${SAMPLE_RECORD.publicRef} to confirm`)
    ).toHaveProperty("required", true);
    expect(dialog.getByText("Student profile")).toBeDefined();
    expect(dialog.getByText("Test payment records")).toBeDefined();
  });

  it("renders empty-table state cleanly when no enrollment records exist yet without filters", () => {
    render(
      <AdminEnrollmentsView
        staff={SAMPLE_STAFF}
        currentSearch=""
        currentStatus=""
        list={{
          totalCount: 0,
          page: 1,
          pageSize: 20,
          items: [],
        }}
      />
    );

    expect(screen.getByTestId("admin-enrollments-empty")).toBeDefined();
    expect(screen.getByText("No enrollment records yet")).toBeDefined();
    expect(screen.queryByRole("link", { name: /Clear search & filters/i })).toBeNull();
  });

  it("renders informative empty state and filter reset when no records match (FR-ADM-001)", () => {
    render(
      <AdminEnrollmentsView
        staff={SAMPLE_STAFF}
        currentSearch="missing-ref"
        currentStatus="review_hold"
        list={{
          totalCount: 0,
          page: 1,
          pageSize: 20,
          items: [],
        }}
      />
    );

    expect(screen.getByTestId("admin-enrollments-empty")).toBeDefined();
    expect(screen.getByText(/No matching enrollment records/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /Clear search & filters/i })).toBeDefined();
  });

  it("clears visible search and status controls on Reset and navigates back to unfiltered results", () => {
    const { rerender } = render(
      <AdminEnrollmentsView
        staff={SAMPLE_STAFF}
        currentSearch="nadia"
        currentStatus="confirmed"
        list={{
          totalCount: 1,
          page: 1,
          pageSize: 20,
          items: [SAMPLE_RECORD],
        }}
      />
    );

    const searchInput = screen.getByLabelText(/Search applications/i) as HTMLInputElement;
    const statusSelect = screen.getByLabelText(/Status filter/i) as HTMLSelectElement;
    expect(searchInput.value).toBe("nadia");
    expect(statusSelect.value).toBe("confirmed");

    // Edit controls further, then click Reset
    fireEvent.change(searchInput, { target: { value: "tariq" } });
    fireEvent.change(statusSelect, { target: { value: "pending" } });

    fireEvent.click(screen.getByRole("button", { name: /^Reset$/i }));

    expect(searchInput.value).toBe("");
    expect(statusSelect.value).toBe("");
    expect(pushMock).toHaveBeenCalledWith("/admin/enrollments");

    // Server re-renders with unfiltered defaults and list
    rerender(
      <AdminEnrollmentsView
        staff={SAMPLE_STAFF}
        currentSearch=""
        currentStatus=""
        list={{
          totalCount: 2,
          page: 1,
          pageSize: 20,
          items: [
            SAMPLE_RECORD,
            {
              ...SAMPLE_RECORD,
              id: "enr-uuid-2",
              publicRef: "LNA-8K3N-4W2P",
              fullName: "Tariqul Hasan",
              email: "tariq@example.com",
            },
          ],
        }}
      />
    );

    expect((screen.getByLabelText(/Search applications/i) as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText(/Status filter/i) as HTMLSelectElement).value).toBe("");
    expect(screen.queryByRole("button", { name: /^Reset$/i })).toBeNull();
    expect(screen.getAllByText("Tariqul Hasan").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole("link", {
        name: /View details for LNA-2M4K-9P7Q \(Nadia Sultana\)/i,
      }).length
    ).toBeGreaterThanOrEqual(1);
  });

  it("navigates with encoded query parameters when Filter is submitted", () => {
    render(
      <AdminEnrollmentsView
        staff={SAMPLE_STAFF}
        currentSearch=""
        currentStatus=""
        list={{
          totalCount: 25,
          page: 1,
          pageSize: 20,
          items: [SAMPLE_RECORD],
        }}
      />
    );

    const searchInput = screen.getByLabelText(/Search applications/i) as HTMLInputElement;
    const statusSelect = screen.getByLabelText(/Status filter/i) as HTMLSelectElement;

    fireEvent.change(searchInput, { target: { value: "  LNA-2M4K  " } });
    fireEvent.change(statusSelect, { target: { value: "confirmed" } });
    fireEvent.click(screen.getByRole("button", { name: /Filter/i }));

    expect(pushMock).toHaveBeenCalledWith("/admin/enrollments?q=LNA-2M4K&status=confirmed");
    expect(screen.getByText("Previous").parentElement?.getAttribute("aria-disabled")).toBe("true");
  });
  it("keeps the selected course and batch context across search, pagination, and reset", () => {
    const batch = {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      name: "Cohort 1",
      courseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      courseTitle: "MTO Readiness",
    };
    render(
      <AdminEnrollmentsView
        staff={SAMPLE_STAFF}
        currentSearch=""
        currentStatus="confirmed"
        batch={batch}
        list={{ totalCount: 21, page: 1, pageSize: 20, items: [SAMPLE_RECORD] }}
      />
    );

    expect(screen.getByText("MTO Readiness / Cohort 1")).toBeDefined();
    expect(screen.getByRole("link", { name: "Back to course batches" }).getAttribute("href")).toBe(
      `/admin/catalog/batches?courseId=${batch.courseId}`
    );
    expect(screen.getByRole("link", { name: "Next" }).getAttribute("href")).toBe(
      `/admin/enrollments?status=confirmed&batchId=${batch.id}&page=2`
    );
    fireEvent.change(screen.getByLabelText(/Search applications/i), { target: { value: "LNA" } });
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    expect(pushMock).toHaveBeenLastCalledWith(
      `/admin/enrollments?q=LNA&status=confirmed&batchId=${batch.id}`
    );
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(pushMock).toHaveBeenLastCalledWith(`/admin/enrollments?batchId=${batch.id}`);
    expect(screen.getByRole("link", { name: "All applications" }).getAttribute("href")).toBe(
      "/admin/enrollments"
    );
  });
  it("switches tabs with the selected scope and resets the batch when the course changes", () => {
    const courseId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const nextCourseId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const batchId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    render(
      <AdminEnrollmentsView
        staff={SAMPLE_STAFF}
        view="students"
        currentSearch="Nadia"
        currentStatus=""
        courseId={courseId}
        courses={[
          { id: courseId, title: "MTO Readiness" },
          { id: nextCourseId, title: "IRGP" },
        ]}
        batch={{ id: batchId, name: "Cohort 1", courseId, courseTitle: "MTO Readiness" }}
        batches={[{ id: batchId, name: "Cohort 1", status: "archived" }]}
        list={{ totalCount: 23, page: 1, pageSize: 20, items: [SAMPLE_RECORD] }}
      />
    );
    expect(
      screen.getByRole("link", { name: "Enrolled students" }).getAttribute("aria-current")
    ).toBe("page");
    expect(screen.getByRole("link", { name: "Applications" }).getAttribute("href")).toBe(
      `/admin/enrollments?q=Nadia&courseId=${courseId}&batchId=${batchId}`
    );
    expect(screen.getByRole("link", { name: "Next" }).getAttribute("href")).toBe(
      `/admin/enrollments?view=students&q=Nadia&courseId=${courseId}&batchId=${batchId}&page=2`
    );
    expect(screen.getByRole("option", { name: "Cohort 1 (Archived)" })).toBeDefined();
    fireEvent.change(screen.getByLabelText("Batch"), { target: { value: "" } });
    expect(pushMock).toHaveBeenLastCalledWith(
      `/admin/enrollments?view=students&q=Nadia&courseId=${courseId}`
    );
    fireEvent.change(screen.getByLabelText("Course"), { target: { value: nextCourseId } });
    expect(pushMock).toHaveBeenLastCalledWith(
      `/admin/enrollments?view=students&q=Nadia&courseId=${nextCourseId}`
    );
  });
  it("offers Add student for the selected open batch", () => {
    const batch = {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      name: "Cohort 1",
      courseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      courseTitle: "MTO Readiness",
    };
    render(
      <AdminEnrollmentsView
        staff={SAMPLE_STAFF}
        view="students"
        currentSearch=""
        currentStatus=""
        courseId={batch.courseId}
        batch={batch}
        batches={[{ id: batch.id, name: batch.name, status: "open_for_enrollment" }]}
        list={{ totalCount: 0, page: 1, pageSize: 20, items: [] }}
      />
    );
    expect(screen.getByRole("link", { name: "Add student" }).getAttribute("href")).toBe(
      `/admin/enrollments/new?batchId=${batch.id}`
    );
  });
});
