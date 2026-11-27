import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { adminPaths, sanitizeAdminReturnPath } from "@/lib/admin-navigation";
import { AdminBreadcrumbs } from "./admin-patterns";
import {
  AdminConfirmDialog,
  AdminDataTable,
  AdminPageHeader,
  AdminStaleUpdateNotice,
  AdminStatePanel,
  AdminStatusNotice,
} from "./admin-patterns";

afterEach(cleanup);

describe("W2A-T03 shared admin UI patterns & return path validation", () => {
  it("validates return paths strictly against internal /admin paths", () => {
    expect(sanitizeAdminReturnPath("/admin/enrollments?view=applications&page=2")).toBe(
      "/admin/enrollments?view=applications&page=2"
    );
    expect(sanitizeAdminReturnPath("/admin")).toBe("/admin");

    for (const unsafe of [
      "",
      null,
      undefined,
      "https://evil.example/admin",
      "//evil.example/admin",
      "/\\evil.example",
      "/admin\\..\\status",
      "/status",
      "/api/admin/logout",
      "javascript:alert(1)",
    ]) {
      expect(sanitizeAdminReturnPath(unsafe, adminPaths.admissions)).toBe(adminPaths.admissions);
    }
  });

  it("renders breadcrumbs, page header, status notices, data table, and state panels without fake counts", () => {
    render(
      <div>
        <AdminBreadcrumbs
          items={[{ label: "Overview", href: adminPaths.overview }, { label: "Tail" }]}
        />
        <AdminPageHeader
          breadcrumbs={[
            { label: "Overview", href: adminPaths.overview },
            { label: "Admissions", href: "https://untrusted.example/phish" },
            { label: "LNA-2M4K-9P7Q" },
          ]}
          title="Application LNA-2M4K-9P7Q"
          description="Detail summary"
        />
        <AdminStatusNotice tone="loading" message="Refreshing records..." />
        <AdminStatusNotice tone="success" title="Saved" message="Changes recorded." />
        <AdminStatePanel
          variant="filtered-empty"
          title="No matching rows"
          description="Clear search filters."
          retryHref={adminPaths.admissions}
          retryLabel="Reset filters"
        />
        <AdminStaleUpdateNotice
          message="Record changed elsewhere."
          reloadHref={adminPaths.courses}
        />
        <AdminDataTable
          caption="Batch records"
          rows={[{ id: "row-1", name: "Cohort 1" }]}
          getRowKey={(r) => r.id}
          columns={[{ key: "name", header: "Cohort", cell: (r) => r.name }]}
          mobileCard={(r) => <span>Mobile {r.name}</span>}
        />
      </div>
    );

    const crumbs = within(screen.getAllByRole("navigation", { name: "Breadcrumb" })[1]);
    expect(crumbs.getByRole("link", { name: "Overview" }).getAttribute("href")).toBe("/admin");
    expect(crumbs.getByRole("link", { name: "Admissions" }).getAttribute("href")).toBe("/admin");
    expect(screen.getByText("LNA-2M4K-9P7Q").getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("Refreshing records...")).toBeDefined();
    expect(screen.getByText("Changes recorded.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Reset filters" }).getAttribute("href")).toBe(
      adminPaths.admissions
    );
    expect(screen.getByRole("link", { name: "Reload latest record" }).getAttribute("href")).toBe(
      adminPaths.courses
    );
    expect(screen.getByRole("table")).toBeDefined();
    expect(screen.getByText("Mobile Cohort 1")).toBeDefined();
  });

  it("guards consequential confirm dialogs against blank reasons and duplicate clicks", async () => {
    let resolveConfirm!: () => void;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        })
    );
    const onOpenChange = vi.fn();

    render(
      <AdminConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Confirm archive"
        description="Archiving hides this cohort from public pages."
        consequenceSummary="Existing enrollments stay untouched."
        confirmLabel="Confirm action"
        requireReason
        onConfirm={onConfirm}
      />
    );

    const confirmBtn = screen.getByRole("button", { name: "Confirm action" });
    fireEvent.click(confirmBtn);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/Reason is required/i);

    fireEvent.change(screen.getByLabelText(/Reason/i), {
      target: { value: "Intake postponed" },
    });
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith("Intake postponed");

    resolveConfirm();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
