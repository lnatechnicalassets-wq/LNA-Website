import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AppError } from "@/lib/errors";
import {
  requireStaff,
  requireSuperAdmin,
  type VerifiedStaffContext,
} from "@/server/auth/require-staff";
import AdminAccountPage from "../account/page";
import AdminReportsPage from "../reports/page";
import AdminSettingsPage from "./page";
import AdminTransactionsPage from "../transactions/page";
import AdminWebsitePage from "../website/page";

vi.mock("@/server/auth/require-staff", () => ({
  requireStaff: vi.fn(),
  requireSuperAdmin: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw new Error(href);
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const superAdmin: VerifiedStaffContext = {
  userId: "sa-1",
  email: "sa@lnabd.org",
  fullName: "Founder Super",
  role: "super_admin",
  accountState: "active",
  aal: "aal2",
};

const activeAdmin: VerifiedStaffContext = {
  userId: "admin-1",
  email: "ops@lnabd.org",
  fullName: "Ops Admin",
  role: "admin",
  accountState: "active",
  aal: "aal2",
  adminActivated: true,
};

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(cleanup);

describe("W2A-T03 shared shell modules & Super Admin Settings route boundary", () => {
  it("enforces requireSuperAdmin on /admin/settings and rejects direct Admin/unauthenticated bypass", async () => {
    vi.mocked(requireSuperAdmin).mockRejectedValueOnce(new AppError("Forbidden", "FORBIDDEN", 403));
    await expect(AdminSettingsPage()).rejects.toThrow("/admin/login?error=forbidden");
    expect(requireSuperAdmin).toHaveBeenCalledWith("settings:manage");

    vi.mocked(requireSuperAdmin).mockRejectedValueOnce(
      new AppError("Unauthenticated", "UNAUTHENTICATED", 401)
    );
    await expect(AdminSettingsPage()).rejects.toThrow("/admin/login");

    vi.mocked(requireSuperAdmin).mockResolvedValueOnce(superAdmin);
    render(await AdminSettingsPage());
    expect(screen.getByRole("heading", { name: "Settings", level: 1 })).toBeDefined();
    expect(screen.getByText("Super Admin only")).toBeDefined();
  });

  it("allows verified Admin and Super Admin access to operational shell modules and My Account without fake metrics", async () => {
    for (const [loader, expectedPermission, heading] of [
      [AdminTransactionsPage, "transactions:read", "Transactions"],
      [AdminWebsitePage, "cms:read", "Website"],
      [AdminReportsPage, "reports:read", "Reports"],
      [AdminAccountPage, "account:manage-self", "My Account"],
    ] as const) {
      vi.mocked(requireStaff).mockResolvedValueOnce(activeAdmin);
      const { unmount } = render(await loader());
      expect(requireStaff).toHaveBeenLastCalledWith(expectedPermission);
      expect(screen.getByRole("heading", { name: heading, level: 1 })).toBeDefined();
      for (const link of screen.queryAllByRole("link")) {
        const href = link.getAttribute("href");
        expect(href).toBeTruthy();
        expect(href).not.toBe("#");
        expect(href === "/" || href === "#admin-page-content" || href?.startsWith("/admin")).toBe(
          true
        );
      }
      unmount();
    }

    vi.mocked(requireStaff).mockRejectedValueOnce(
      new AppError("MFA required", "MFA_REQUIRED", 403)
    );
    await expect(AdminTransactionsPage()).rejects.toThrow("/admin/login");
  });
});
