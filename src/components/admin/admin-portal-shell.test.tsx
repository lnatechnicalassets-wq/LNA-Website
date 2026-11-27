import fs from "node:fs";
import path from "node:path";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { adminAccountNavItem, adminNavigation, adminPaths } from "@/lib/admin-navigation";
import type { VerifiedStaffContext } from "@/server/auth/require-staff";
import { AdminPortalShell } from "./admin-portal-shell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const staff: VerifiedStaffContext = {
  userId: "staff-1",
  email: "staff@example.com",
  fullName: "Example Staff",
  role: "super_admin",
  accountState: "active",
  aal: "aal2",
};

describe("Admin portal navigation", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function renderShell(currentPath: string, overrideStaff: VerifiedStaffContext = staff) {
    return render(
      <AdminPortalShell staff={overrideStaff} currentPath={currentPath}>
        <h1>Staff workspace</h1>
      </AdminPortalShell>
    );
  }

  it("shows all eight modules in exact Rev3.0 sidebar order for Super Admin with My Account accessible", () => {
    renderShell(adminPaths.overview);

    const nav = within(screen.getByRole("navigation", { name: "Admin navigation" }));
    expect(nav.getByRole("link", { name: "Overview" }).getAttribute("aria-current")).toBe("page");
    expect(nav.getByRole("link", { name: "Admissions" }).getAttribute("href")).toBe(
      adminPaths.admissions
    );
    expect(nav.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Overview",
      "Courses",
      "Batches",
      "Admissions",
      "Students",
      "Transactions",
      "Website",
      "Mentors",
      "Reports",
      "Settings",
    ]);
    expect(screen.getByRole("link", { name: "My Account" }).getAttribute("href")).toBe(
      adminPaths.account
    );
    expect(screen.getByRole("link", { name: "View website" }).getAttribute("href")).toBe("/");
    expect(screen.getByText(staff.fullName)).toBeDefined();
    expect(screen.getAllByAltText("Lead Nation Academy Emblem").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/AAL2|M19|Rev3\.0/i)).toBeNull();
  });

  it("hides Settings from Admin navigation while preserving My Account and sign out", () => {
    const adminStaff: VerifiedStaffContext = {
      ...staff,
      userId: "admin-1",
      fullName: "Operational Admin",
      role: "admin",
      adminActivated: true,
    };
    renderShell(adminPaths.transactions, adminStaff);

    const nav = within(screen.getByRole("navigation", { name: "Admin navigation" }));
    expect(nav.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Overview",
      "Courses",
      "Batches",
      "Admissions",
      "Students",
      "Transactions",
      "Website",
      "Mentors",
      "Reports",
    ]);
    expect(nav.queryByRole("link", { name: "Settings" })).toBeNull();
    expect(nav.getByRole("link", { name: "Transactions" }).getAttribute("aria-current")).toBe(
      "page"
    );
    expect(screen.getByRole("link", { name: "My Account" }).getAttribute("href")).toBe(
      adminPaths.account
    );
    expect(screen.getByRole("button", { name: "Sign out" })).toBeDefined();
  });

  it("keeps Website marked when staff visit Mentors", () => {
    renderShell(adminPaths.mentors);

    expect(screen.getByRole("link", { name: "Mentors" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Website" }).getAttribute("aria-current")).toBe(
      "location"
    );
  });

  it("keeps Admissions marked on an application detail page", () => {
    renderShell(`${adminPaths.admissions}/example-application`);

    expect(screen.getByRole("link", { name: "Admissions" }).getAttribute("aria-current")).toBe(
      "location"
    );
    expect(screen.getByRole("link", { name: "Overview" }).hasAttribute("aria-current")).toBe(false);
  });

  it("keeps Courses marked when staff visit a batch route", () => {
    renderShell(`${adminPaths.batches}/batch-id/edit`);

    const courses = screen.getByRole("link", { name: "Courses" });
    expect(courses.getAttribute("aria-current")).toBe("location");
    expect(courses.getAttribute("href")).toBe(adminPaths.courses);
  });

  it("opens a named mobile drawer and returns focus on Escape", async () => {
    renderShell(adminPaths.admissions);
    const trigger = screen.getByRole("button", { name: "Open admin navigation" });

    trigger.focus();
    fireEvent.click(trigger);

    const drawer = within(screen.getByRole("dialog", { name: "Admin navigation" }));
    expect(drawer.getByRole("link", { name: "Admissions" }).getAttribute("aria-current")).toBe(
      "page"
    );
    fireEvent.keyDown(document.activeElement ?? trigger, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });

  it("maps every navigation module, child link, and My Account target to an actual app route without dead hrefs", () => {
    const appDir = path.resolve(process.cwd(), "src/app");
    const routeExists = (href: string): boolean => {
      if (href === "/") {
        return fs.existsSync(path.join(appDir, "page.tsx"));
      }
      if (href.startsWith("/admin/catalog/")) {
        return fs.existsSync(path.join(appDir, "admin/catalog/[section]/page.tsx"));
      }
      const relative = href.replace(/^\//, "");
      return fs.existsSync(path.join(appDir, relative, "page.tsx"));
    };

    const hrefs = [
      ...adminNavigation.map((item) => item.href),
      ...adminNavigation.flatMap((item) => item.children?.map((c) => c.href) ?? []),
      adminAccountNavItem.href,
      adminPaths.publicSite,
    ];

    for (const href of hrefs) {
      expect(href).not.toBe("#");
      expect(routeExists(href)).toBe(true);
    }
  });
});
