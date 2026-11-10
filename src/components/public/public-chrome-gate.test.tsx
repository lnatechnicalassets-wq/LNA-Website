import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PublicChromeGate } from "./public-chrome-gate";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

describe("PublicChromeGate", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders header and footer on public routes like /, /enroll, and /status", () => {
    mockPathname = "/enroll";
    render(
      <PublicChromeGate
        header={<header data-testid="pub-header">Public Header</header>}
        footer={<footer data-testid="pub-footer">Public Footer</footer>}
      >
        <main>Enrollment Page</main>
      </PublicChromeGate>
    );

    expect(screen.getByTestId("pub-header")).toBeDefined();
    expect(screen.getByTestId("pub-footer")).toBeDefined();
    expect(screen.getByText("Enrollment Page")).toBeDefined();
  });

  it("suppresses public header and footer on /admin/** routes", () => {
    mockPathname = "/admin/enrollments";
    render(
      <PublicChromeGate
        header={<header data-testid="pub-header">Public Header</header>}
        footer={<footer data-testid="pub-footer">Public Footer</footer>}
      >
        <main>Admin Desk</main>
      </PublicChromeGate>
    );

    expect(screen.queryByTestId("pub-header")).toBeNull();
    expect(screen.queryByTestId("pub-footer")).toBeNull();
    expect(screen.getByText("Admin Desk")).toBeDefined();
  });
});

