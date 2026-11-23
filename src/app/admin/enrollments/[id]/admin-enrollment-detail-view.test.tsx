import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { AdminEnrollmentDetailView } from "./admin-enrollment-detail-view";
import type { VerifiedStaffContext } from "@/server/auth/require-staff";
import type { AdminEnrollmentDetailResult } from "@/server/enrollment/service";

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

const SAMPLE_DETAIL: AdminEnrollmentDetailResult = {
  id: "enr-uuid-1",
  publicRef: "LNA-2M4K-9P7Q",
  fullName: "Nadia Sultana",
  email: "nadia@example.com",
  phone: "01711223344",
  courseSlug: "mto-readiness",
  courseTitle: "MTO Readiness Program",
  batchSlug: "batch-mto-2026-01",
  batchName: "MTO Readiness Cohort 1",
  batchStartDate: "2026-12-01",
  batchVenue: "LNA Campus",
  answers: { university: "University of Dhaka" },
  programQuestionsSnapshot: [
    {
      id: "university",
      label: "Current or most recent university",
      type: "text",
      required: true,
    },
  ],
  paymentMethod: "bkash",
  paymentStatus: "validated",
  submittedPaymentRef: null,
  isStaffManualPayment: false,
  baseFeePoisha: 750000,
  discountAmountPoisha: 200000,
  payablePoisha: 550000,
  currency: "BDT",
  status: "confirmed",
  holdExpiresAt: null,
  verifiedAt: "2026-11-11T00:00:00Z",
  confirmedAt: "2026-11-11T00:00:00Z",
  verificationNotes: null,
  isDevFixture: false,
  fixtureLabel: null,
  createdAt: "2026-11-10T23:45:00Z",
  updatedAt: "2026-11-11T00:00:00Z",
  paymentAttempts: [
    {
      id: "att-1",
      tranId: "TXN-100",
      paymentId: "PAY-100",
      trxId: "TRX-8899",
      amountPoisha: 550000,
      validatedAmountPoisha: 550000,
      currency: "BDT",
      status: "validated",
      gatewayStatusCode: "0000",
      gatewayStatusMessage: "Successful",
      failureReason: null,
      executedAt: "2026-11-11T00:00:00Z",
      createdAt: "2026-11-10T23:45:00Z",
    },
  ],
  paymentEvents: [
    {
      id: "ev-1",
      paymentAttemptId: "att-1",
      source: "execute",
      eventStatus: "Completed",
      redactedPayload: { statusCode: "0000", id_token: "[REDACTED]" },
      receivedAt: "2026-11-11T00:00:00Z",
    },
  ],
  emailOutbox: [
    {
      id: "out-1",
      template: "enrollment_confirmed_paid",
      recipientEmail: "nadia@example.com",
      status: "sent",
      providerMessageId: "resend_msg_42",
      retryCount: 0,
      lastError: null,
      sentAt: "2026-11-11T00:00:05Z",
      createdAt: "2026-11-11T00:00:00Z",
    },
  ],
};

describe("AdminEnrollmentDetailView (/admin/enrollments/[id])", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("displays applicant responses, server integer-poisha totals, payment attempts, redacted gateway events, and outbox email status while keeping gateway approval unavailable", () => {
    render(<AdminEnrollmentDetailView staff={SAMPLE_STAFF} detail={SAMPLE_DETAIL} />);

    expect(screen.getByRole("heading", { name: "LNA-2M4K-9P7Q" })).toBeDefined();
    expect(screen.getByText("Current or most recent university")).toBeDefined();
    expect(screen.getByText("University of Dhaka")).toBeDefined();
    expect(screen.getByText("BDT 7,500")).toBeDefined();
    expect(screen.getByText("BDT 2,000")).toBeDefined();
    expect(screen.getAllByText("BDT 5,500").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("TRX-8899")).toBeDefined();
    expect(screen.getByText(/"id_token": "\[REDACTED\]"/)).toBeDefined();
    expect(screen.getByText(/resend_msg_42/)).toBeDefined();
    expect(screen.getByRole("link", { name: /Back to enrollments/i })).toBeDefined();

    expect(screen.getByRole("button", { name: /Edit LNA/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /Archive LNA/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /Delete LNA/ })).toBeDefined();
    expect(screen.queryByRole("button", { name: /approve|refund|Confirm LNA/i })).toBeNull();
  });

  function renderSandboxRefund(enabled = true) {
    return render(
      <AdminEnrollmentDetailView
        staff={SAMPLE_STAFF}
        sandboxRefundEnabled={enabled}
        detail={{
          ...SAMPLE_DETAIL,
          paymentAttempts: SAMPLE_DETAIL.paymentAttempts.map((attempt) => ({
            ...attempt,
            sandboxRefund: { state: null, trxId: null },
          })),
        }}
      />
    );
  }

  it("puts the sandbox refund in the header and requires confirmation before refunding the verified amount", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(Response.json({ ok: true, refundTrxId: "REFUND-EXAMPLE" }));
    vi.stubGlobal("fetch", request);
    renderSandboxRefund();

    const refundButton = screen.getByRole("button", { name: "Refund sandbox payment" });
    const editButton = screen.getByRole("button", { name: /Edit LNA/ });
    expect(refundButton.parentElement).toBe(editButton.parentElement);
    expect(refundButton.nextElementSibling).toBe(editButton);

    fireEvent.click(refundButton);
    const dialog = screen.getByRole("dialog", { name: "Refund sandbox payment" });
    expect(within(dialog).getByText("BDT 5,500")).toBeDefined();
    expect(within(dialog).getByText("TRX-8899")).toBeDefined();
    expect(request).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(request).not.toHaveBeenCalled();

    fireEvent.click(refundButton);
    fireEvent.click(screen.getByRole("button", { name: "Confirm refund" }));
    await waitFor(() => expect(screen.getByText("Refund ID REFUND-EXAMPLE")).toBeDefined());
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("/api/payments/bkash/sandbox-refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentAttemptId: "att-1" }),
    });
    expect(screen.queryByRole("button", { name: "Refund sandbox payment" })).toBeNull();
  });

  it("hides the refund action when the sandbox refund flag is off", () => {
    renderSandboxRefund(false);
    expect(screen.queryByRole("button", { name: "Refund sandbox payment" })).toBeNull();
  });

  it("stops repeat submission when the result could not be verified", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(
        Response.json({ ok: false, code: "BKASH_REFUND_UNCONFIRMED" }, { status: 502 })
      );
    vi.stubGlobal("fetch", request);
    renderSandboxRefund();

    fireEvent.click(screen.getByRole("button", { name: "Refund sandbox payment" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm refund" }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Check its status in bKash")
    );
    expect(screen.queryByRole("button", { name: "Confirm refund" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Sandbox refund needs review")).toBeDefined();
    expect(request).toHaveBeenCalledTimes(1);
  });
});
