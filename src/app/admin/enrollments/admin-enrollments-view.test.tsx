import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AdminEnrollmentsView } from "./admin-enrollments-view";
import type { VerifiedStaffContext } from "@/server/auth/require-staff";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
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

describe("AdminEnrollmentsView (/admin/enrollments)", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders read-only enrollments table/cards without any delete or mutating controls", () => {
    render(
      <AdminEnrollmentsView
        staff={SAMPLE_STAFF}
        currentSearch=""
        currentStatus=""
        list={{
          totalCount: 1,
          page: 1,
          pageSize: 20,
          items: [
            {
              id: "enr-uuid-1",
              publicRef: "LNA-2M4K-9P7Q",
              fullName: "Nadia Sultana",
              email: "nadia@example.com",
              phone: "01711223344",
              courseSlug: "mto-readiness",
              courseTitle: "MTO Readiness Program",
              batchSlug: "batch-mto-2026-01",
              batchName: "MTO Readiness Cohort 1",
              paymentMethod: "bkash",
              paymentStatus: "validated",
              status: "confirmed",
              payablePoisha: 550000,
              currency: "BDT",
              holdExpiresAt: null,
              confirmedAt: "2026-11-11T00:00:00Z",
              createdAt: "2026-11-10T23:45:00Z",
              isDevFixture: false,
            },
          ],
        }}
      />
    );

    expect(screen.getByText("Read-Only Release")).toBeDefined();
    expect(screen.getByText("Super Admin")).toBeDefined();
    expect(screen.getByText("AAL2")).toBeDefined();
    expect(screen.getAllByText("LNA-2M4K-9P7Q").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Nadia Sultana").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/BDT 5,500/).length).toBeGreaterThanOrEqual(1);

    // Strictly read-only: zero delete/archive/edit/approve/refund buttons
    expect(
      screen.queryByRole("button", { name: /delete|remove|edit|confirm payment|refund|archive/i })
    ).toBeNull();
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
});
