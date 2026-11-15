import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { adminPaths } from "@/lib/admin-navigation";
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

  function renderShell(currentPath: string) {
    return render(
      <AdminPortalShell staff={staff} currentPath={currentPath}>
        <h1>Staff workspace</h1>
      </AdminPortalShell>
    );
  }

  it("shows live destinations, identifies the current page, and omits empty groups", () => {
    renderShell(adminPaths.overview);

    const nav = within(screen.getByRole("navigation", { name: "Admin navigation" }));
    expect(nav.getByRole("link", { name: "Overview" }).getAttribute("aria-current")).toBe("page");
    expect(nav.getByRole("link", { name: "Admissions" }).getAttribute("href")).toBe(
      adminPaths.admissions
    );
    expect(nav.queryByText("Website Builder")).toBeNull();
    expect(nav.queryByText("Finance")).toBeNull();
    expect(screen.getByRole("link", { name: "View website" }).getAttribute("href")).toBe("/");
    expect(screen.getByText(staff.fullName)).toBeDefined();
  });

  it("keeps Admissions marked on an application detail page", () => {
    renderShell(`${adminPaths.admissions}/example-application`);

    expect(screen.getByRole("link", { name: "Admissions" }).getAttribute("aria-current")).toBe(
      "location"
    );
    expect(screen.getByRole("link", { name: "Overview" }).hasAttribute("aria-current")).toBe(false);
  });

  it("opens Courses & Batches and marks the current destination", () => {
    renderShell(adminPaths.courses);

    const group = screen.getByText("Courses & Batches").closest("details");
    expect(group?.open).toBe(true);
    expect(screen.getByRole("link", { name: "Courses" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Batches" }).getAttribute("href")).toBe(
      adminPaths.batches
    );
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
});
