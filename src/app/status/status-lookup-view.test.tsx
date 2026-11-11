import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import {
  normalizeApplicationRef,
  normalizeBdPhone,
  normalizeEmail,
  projectSafeStatusResult,
  type SafeStatusLookupResult,
  type StatusLookupQuery,
} from "@/lib/enrollment/status";
import { StatusLookupView } from "./status-lookup-view";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

interface TestApplicationRecord {
  applicationReference: string;
  fullName: string;
  email: string;
  phone: string;
  university?: string;
  courseTitle: string;
  batchName: string;
  paymentMethod: "bkash" | "bank_transfer" | "free";
  status: "Application in process" | "Enrollment confirmed";
  bkashTransactionId?: string;
  bankTransactionReference?: string;
}

const TEST_FIXTURE_APPLICATIONS: TestApplicationRecord[] = [
  {
    applicationReference: "LNA-MTO1-2026",
    fullName: "Nadia Sultana",
    email: "nadia.fixture@example.com",
    phone: "01711000001",
    university: "University of Dhaka",
    courseTitle: "MTO Readiness Program",
    batchName: "MTO Readiness Cohort 1",
    paymentMethod: "bkash",
    status: "Application in process",
    bkashTransactionId: "TRX-TEST-001",
  },
  {
    applicationReference: "LNA-MTO2-2026",
    fullName: "Rafiqul Islam",
    email: "rafiq.fixture@example.com",
    phone: "01811000002",
    university: "North South University",
    courseTitle: "MTO Readiness Program",
    batchName: "MTO Readiness Cohort 1",
    paymentMethod: "bank_transfer",
    status: "Enrollment confirmed",
    bankTransactionReference: "BANK-TEST-002",
  },
  {
    applicationReference: "LNA-IRGP-2025",
    fullName: "Tariqul Hasan",
    email: "tariq.fixture@example.com",
    phone: "01911000003",
    courseTitle: "Industry Readiness Graduate Program",
    batchName: "IRGP Cohort 1",
    paymentMethod: "bkash",
    status: "Enrollment confirmed",
    bkashTransactionId: "TRX-TEST-003",
  },
];

function lookupTestFixture(query: StatusLookupQuery): SafeStatusLookupResult | null {
  const ref = normalizeApplicationRef(query.applicationId);
  const record = TEST_FIXTURE_APPLICATIONS.find(
    (item) => normalizeApplicationRef(item.applicationReference) === ref
  );
  if (!record) return null;

  if (query.verificationType === "email") {
    if (normalizeEmail(record.email) !== normalizeEmail(query.contactValue)) {
      return null;
    }
  } else if (normalizeBdPhone(record.phone) !== normalizeBdPhone(query.contactValue)) {
    return null;
  }

  return projectSafeStatusResult(
    record as unknown as Parameters<typeof projectSafeStatusResult>[0]
  );
}

describe("StatusLookupView (/status)", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows 'Online enrollment is coming soon', disables lookup, and exposes no sample applications or demo badges in default public mode", () => {
    mockSearchParams = new URLSearchParams("ref=LNA-MTO1-2026");
    render(<StatusLookupView />);

    const idInput = screen.getByLabelText(/LNA Application ID/i) as HTMLInputElement;
    expect(idInput.value).toBe("LNA-MTO1-2026");

    expect(screen.getByTestId("status-coming-soon-notice").textContent).toMatch(
      /Online enrollment is coming soon/i
    );
    expect(screen.queryByText(/Frontend demo lookup/i)).toBeNull();
    expect(screen.queryByText(/Demo sample applications/i)).toBeNull();
    expect(screen.queryByText(/nadia\.demo/i)).toBeNull();
    expect(screen.queryByText("Nadia Sultana")).toBeNull();

    const submitBtn = screen.getByRole("button", {
      name: /Status lookup coming soon/i,
    }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
    expect(screen.queryByTestId("status-result-card")).toBeNull();
  });

  it("validates missing inputs with accessible alert messages when lookup is enabled", () => {
    render(<StatusLookupView enabled onLookup={lookupTestFixture} />);

    fireEvent.click(screen.getByRole("button", { name: /Check application status/i }));

    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBe(2);
    expect(screen.getByLabelText(/LNA Application ID/i).getAttribute("aria-invalid")).toBe("true");
  });

  it("looks up 'Application in process' test fixture by email and omits private fields from summary card", async () => {
    render(<StatusLookupView enabled onLookup={lookupTestFixture} />);

    fireEvent.change(screen.getByLabelText(/LNA Application ID/i), {
      target: { value: "LNA-MTO1-2026" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /Email address/i }), {
      target: { value: "nadia.fixture@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Check application status/i }));

    await waitFor(() => expect(screen.getByTestId("status-result-card")).toBeDefined());
    const resultCard = screen.getByTestId("status-result-card");
    expect(
      within(resultCard).getByRole("heading", { name: /Application in process/i })
    ).toBeDefined();
    expect(within(resultCard).getByText("Nadia Sultana")).toBeDefined();
    expect(within(resultCard).getByText("University of Dhaka")).toBeDefined();
    expect(within(resultCard).getByText("MTO Readiness Program")).toBeDefined();
    expect(within(resultCard).getByText("MTO Readiness Cohort 1")).toBeDefined();
    expect(within(resultCard).getByText("bKash")).toBeDefined();

    // Privacy: strictly exclude email, phone, and payment transaction references from result
    expect(within(resultCard).queryByText(/nadia\.fixture@example\.com/i)).toBeNull();
    expect(within(resultCard).queryByText(/01711000001/)).toBeNull();
    expect(within(resultCard).queryByText(/TRX-TEST-001/)).toBeNull();
  });

  it("looks up 'Enrollment confirmed' test fixture by phone and omits University when absent, plus handles Bank Transfer", async () => {
    render(<StatusLookupView enabled onLookup={lookupTestFixture} />);

    fireEvent.change(screen.getByLabelText(/LNA Application ID/i), {
      target: { value: "LNA-IRGP-2025" },
    });
    fireEvent.click(screen.getByRole("radio", { name: /Use Phone/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /Phone number/i }), {
      target: { value: "+880 1911-000003" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Check application status/i }));

    await waitFor(() => expect(screen.getByTestId("status-result-card")).toBeDefined());
    let resultCard = screen.getByTestId("status-result-card");
    expect(
      within(resultCard).getByRole("heading", { name: /Enrollment confirmed/i })
    ).toBeDefined();
    expect(within(resultCard).getByText("Tariqul Hasan")).toBeDefined();
    expect(within(resultCard).getByText("Industry Readiness Graduate Program")).toBeDefined();
    expect(within(resultCard).getByText("IRGP Cohort 1")).toBeDefined();
    expect(within(resultCard).getByText("bKash")).toBeDefined();
    expect(within(resultCard).queryByText(/^University$/i)).toBeNull();
    expect(within(resultCard).queryByText(/01911000003/)).toBeNull();
    expect(within(resultCard).queryByText(/TRX-TEST-003/)).toBeNull();

    // Verify Bank Transfer fixture as well
    fireEvent.change(screen.getByLabelText(/LNA Application ID/i), {
      target: { value: "LNA-MTO2-2026" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /Phone number/i }), {
      target: { value: "01811000002" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Check application status/i }));

    await waitFor(() =>
      expect(
        within(screen.getByTestId("status-result-card")).getByText("Rafiqul Islam")
      ).toBeDefined()
    );
    resultCard = screen.getByTestId("status-result-card");
    expect(within(resultCard).getByText("North South University")).toBeDefined();
    expect(within(resultCard).getByText("Bank Transfer")).toBeDefined();
    expect(within(resultCard).queryByText(/BANK-TEST-002/)).toBeNull();
  });

  it("shows one identical generic error message for unknown ID or mismatched email/phone", async () => {
    render(<StatusLookupView enabled onLookup={lookupTestFixture} />);

    // Case 1: unknown ID
    fireEvent.change(screen.getByLabelText(/LNA Application ID/i), {
      target: { value: "LNA-XXXX-0000" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /Email address/i }), {
      target: { value: "nadia.fixture@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Check application status/i }));
    await waitFor(() => expect(screen.getByTestId("status-mismatch-message")).toBeDefined());
    const unknownText = screen.getByTestId("status-mismatch-message").textContent;

    // Case 2: valid ID + wrong email
    fireEvent.change(screen.getByLabelText(/LNA Application ID/i), {
      target: { value: "LNA-MTO1-2026" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /Email address/i }), {
      target: { value: "someone.else@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Check application status/i }));
    await waitFor(() => expect(screen.getByTestId("status-mismatch-message")).toBeDefined());
    const mismatchText = screen.getByTestId("status-mismatch-message").textContent;

    expect(unknownText).toBe(mismatchText);
    expect(mismatchText).toMatch(/check your LNA Application ID and your email or phone number/i);
  });

  it("calls POST /api/status by default when enabled and onLookup prop is omitted", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        found: true,
        result: {
          applicationReference: "LNA-ABCD-EFGH",
          fullName: "Farhana Akter",
          courseTitle: "MTO Readiness Program",
          batchName: "MTO Readiness Cohort 1",
          paymentMethod: "bkash",
          status: "Enrollment confirmed",
        },
      }),
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      render(<StatusLookupView enabled />);

      fireEvent.change(screen.getByLabelText(/LNA Application ID/i), {
        target: { value: "LNA-ABCD-EFGH" },
      });
      fireEvent.change(screen.getByRole("textbox", { name: /Email address/i }), {
        target: { value: "farhana@example.com" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Check application status/i }));

      await waitFor(() => expect(screen.getByTestId("status-result-card")).toBeDefined());
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/status",
        expect.objectContaining({ method: "POST" })
      );
      expect(screen.getByText("Farhana Akter")).toBeDefined();
      expect(
        within(screen.getByTestId("status-result-card")).getByRole("heading", {
          name: /Enrollment confirmed/i,
        })
      ).toBeDefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("renders accessible error summary, validates format, and focuses the first invalid input", () => {
    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      });
    const lookupSpy = vi.fn();

    try {
      render(<StatusLookupView enabled onLookup={lookupSpy} />);

      // Submit empty -> focuses Application ID input
      fireEvent.click(screen.getByRole("button", { name: /Check application status/i }));
      expect(screen.getByTestId("status-error-summary")).toBeDefined();
      expect(document.activeElement).toBe(screen.getByLabelText(/LNA Application ID/i));
      expect(lookupSpy).not.toHaveBeenCalled();

      // Fill valid ref, submit invalid email -> focuses contact input
      fireEvent.change(screen.getByLabelText(/LNA Application ID/i), {
        target: { value: "LNA-MTO1-2026" },
      });
      fireEvent.change(screen.getByRole("textbox", { name: /Email address/i }), {
        target: { value: "bad-email" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Check application status/i }));
      expect(document.activeElement).toBe(screen.getByRole("textbox", { name: /Email address/i }));
      expect(screen.getByRole("alert").textContent).toMatch(/Please enter a valid email address/i);
      expect(lookupSpy).not.toHaveBeenCalled();

      // Switching radio from Email to Phone clears stale email text
      fireEvent.click(screen.getByRole("radio", { name: /Use Phone/i }));
      expect(
        (screen.getByRole("textbox", { name: /Phone number/i }) as HTMLInputElement).value
      ).toBe("");
    } finally {
      rafSpy.mockRestore();
    }
  });
});
