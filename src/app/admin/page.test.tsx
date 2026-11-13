import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AppError } from "@/lib/errors";
import { requireStaff } from "@/server/auth/require-staff";
import AdminOverviewPage from "./page";

vi.mock("@/server/auth/require-staff", () => ({ requireStaff: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(path);
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

afterEach(cleanup);

describe("Admin Overview", () => {
  it("uses the existing staff permission and links verified staff to applications", async () => {
    vi.mocked(requireStaff).mockResolvedValueOnce({
      userId: "staff-1",
      email: "staff@example.com",
      fullName: "Example Staff",
      role: "super_admin",
      accountState: "active",
      aal: "aal2",
    });

    render(await AdminOverviewPage());

    expect(requireStaff).toHaveBeenCalledWith("enrollments:read");
    expect(screen.getByRole("heading", { name: "Overview", level: 1 })).toBeDefined();
    expect(screen.getByRole("link", { name: "Review applications" }).getAttribute("href")).toBe(
      "/admin/enrollments"
    );
  });

  it("redirects an unauthenticated visitor to staff login", async () => {
    vi.mocked(requireStaff).mockRejectedValueOnce(new AppError("No session", "UNAUTHENTICATED"));
    await expect(AdminOverviewPage()).rejects.toThrow("/admin/login");
  });

  it("preserves the forbidden redirect for a disallowed account", async () => {
    vi.mocked(requireStaff).mockRejectedValueOnce(new AppError("Forbidden", "FORBIDDEN"));
    await expect(AdminOverviewPage()).rejects.toThrow("/admin/login?error=forbidden");
  });
});
