import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StatusLookupView } from "./status-lookup-view";
import { recoveryNotice } from "@/lib/enrollment/recovery";
let query = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => query }));
const fetchMock = vi.fn();
beforeEach(() => {
  query = new URLSearchParams();
  vi.resetAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", window.location.pathname);
});

describe("Find My Application", () => {
  it("does not expose lookup when disabled", () => {
    render(<StatusLookupView />);
    expect(screen.getByText(/status lookup is currently unavailable/i)).toBeDefined();
    expect(screen.queryByRole("button", { name: "Send secure link" })).toBeNull();
  });
  it("allows email-only requests without revealing whether a record exists", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, message: recoveryNotice }),
    });
    render(<StatusLookupView enabled />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "student@example.invalid" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send secure link" }));
    await waitFor(() => expect(screen.getByText(recoveryNotice)).toBeDefined());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      action: "request",
      email: "student@example.invalid",
      reference: "",
    });
  });
  it("prefills optional application reference from confirmation links", () => {
    query = new URLSearchParams({ ref: "LNA-ABCD-0001" });
    render(<StatusLookupView enabled />);
    expect((screen.getByLabelText("LNA Application ID (optional)") as HTMLInputElement).value).toBe(
      "LNA-ABCD-0001"
    );
  });
  it("does not redeem automatically on email link scanners and shows minimal details on explicit click", async () => {
    window.history.replaceState(null, "", `#recovery=${"a".repeat(64)}`);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        applications: [
          {
            reference: "LNA-ABCD-0001",
            course: "MTO Readiness",
            batch: "Batch 1",
            status: "confirmed",
            paymentStatus: "verified",
            fullName: "Do not display",
          },
        ],
      }),
    });
    render(<StatusLookupView enabled />);
    const button = await screen.findByRole("button", { name: "View application status" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("");
    fireEvent.click(button);
    await screen.findByText("Enrollment confirmed");
    expect(screen.getByText("Payment verified")).toBeDefined();
    expect(screen.queryByText("Do not display")).toBeNull();
  });
});
