import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import type { Course, Batch } from "@/lib/content";
import type { EnrollmentConfig, EnrollmentOutcomeSummary } from "@/lib/enrollment/types";
import { generateEnrollmentReference } from "@/lib/enrollment/reference";
import {
  EnrollmentView,
  type EnrollmentCheckoutResponse,
  type EnrollmentSubmissionPayload,
} from "./enrollment-view";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

const testProvenance = {
  class: "B" as const,
  verified: false,
  source: "Test fixture",
  verifiedBy: null,
  verifiedOn: null,
};

const testCourses: Course[] = [
  {
    id: "mto-readiness",
    title: "MTO Readiness Program",
    subtitle: "Graduate Career & Leadership Accelerator",
    category: "Career Readiness",
    summary: "Practical preparation for Management Trainee Officer tracks.",
    description: "An intensive offline leadership program designed for recent graduates.",
    learningOutcomes: ["Aptitude mastery"],
    targetAudience: ["Graduates"],
    prerequisites: ["Final year or recent graduate"],
    modules: [
      {
        id: "mod-1",
        title: "Case Interview & Aptitude",
        duration: "4 Sessions",
        topics: ["Problem solving"],
      },
    ],
    deliveryMode: "offline",
    venue: "LNA Executive Campus, Dhaka",
    status: "published",
    featured: true,
    mentorIds: [],
    provenance: testProvenance,
  },
  {
    id: "career-planning-workshop",
    title: "Career Planning Workshop",
    subtitle: "Focused offline career roadmap workshop",
    category: "Workshops",
    summary: "Free introductory workshop for early career graduates.",
    description: "An interactive workshop covering structured job search and interview skills.",
    learningOutcomes: ["Actionable career plan"],
    targetAudience: ["University students"],
    prerequisites: [],
    modules: [
      {
        id: "mod-free-1",
        title: "Career Roadmap",
        duration: "1 Session",
        topics: ["Resume and goals"],
      },
    ],
    deliveryMode: "offline",
    venue: "LNA Executive Campus, Dhaka",
    status: "published",
    featured: false,
    mentorIds: [],
    provenance: testProvenance,
  },
];

const testBatches: Batch[] = [
  {
    id: "batch-mto-2026-01",
    courseId: "mto-readiness",
    batchNumber: 1,
    name: "MTO Readiness Cohort 1",
    startDate: "2026-12-01",
    endDate: "2027-01-31",
    scheduleDescription: "16 Sessions (1.5h each)",
    capacity: 30,
    enrolledCount: 18,
    seatHoldDurationMinutes: 30,
    feePoisha: 750000,
    status: "open_for_enrollment",
    venue: "LNA Executive Campus, Dhaka",
    provenance: testProvenance,
  },
  {
    id: "batch-mto-discounted",
    courseId: "mto-readiness",
    batchNumber: 2,
    name: "MTO Early Bird Cohort",
    startDate: "2027-01-15",
    endDate: "2027-03-15",
    scheduleDescription: "16 Sessions (1.5h each)",
    capacity: 30,
    enrolledCount: 5,
    seatHoldDurationMinutes: 30,
    feePoisha: 750000,
    discountFeePoisha: 550000,
    status: "open_for_enrollment",
    venue: "LNA Executive Campus, Dhaka",
    provenance: testProvenance,
  },
  {
    id: "batch-free-2026-01",
    courseId: "career-planning-workshop",
    batchNumber: 1,
    name: "Free Workshop Cohort 1",
    startDate: "2026-12-10",
    endDate: "2026-12-10",
    scheduleDescription: "1 Session (2h)",
    capacity: 50,
    enrolledCount: 12,
    seatHoldDurationMinutes: 30,
    feePoisha: 0,
    status: "open_for_enrollment",
    venue: "LNA Executive Campus, Dhaka",
    provenance: testProvenance,
  },
];

function createOfficialConfig(submissionEnabled: boolean): EnrollmentConfig {
  return {
    programQuestions: {
      "mto-readiness": [
        {
          id: "university",
          label: "University",
          type: "text",
          placeholder: "Enter university",
          required: true,
        },
        {
          id: "department",
          label: "Department",
          type: "text",
          placeholder: "Enter department",
          required: true,
        },
        {
          id: "professionalPhase",
          label: "Current professional phase",
          type: "select",
          placeholder: "Select phase",
          options: ["Undergraduate", "Recent graduate"],
          required: true,
        },
        {
          id: "goals",
          label: "Goals (optional)",
          type: "textarea",
          required: false,
        },
      ],
    },
    payment: {
      submissionEnabled,
      bkash: {
        enabled: true,
        merchantName: "Lead Nation Academy",
        merchantNumber: "0158 1799 666",
        qrImageSrc: "/images/payments/lna-bkash-merchant-qr.png",
        qrImageAlt: "Lead Nation Academy official bKash Merchant QR code",
        instruction:
          "Click Continue to bKash Checkout to open the hosted bKash payment page and complete payment.",
      },
      bankTransfer: {
        enabled: false,
        instruction: "Bank transfer is not enabled for this release.",
        bankDetails: null,
      },
    },
  };
}

function navigateToPaidPaymentStep(
  config: EnrollmentConfig,
  options?: {
    batchId?: string;
    checkoutMode?: "closed" | "mock" | "live";
    onStartCheckout?: (payload: EnrollmentSubmissionPayload) => Promise<EnrollmentCheckoutResponse>;
    onRedirectToCheckout?: (url: string) => void;
  }
) {
  render(
    <EnrollmentView
      courses={testCourses}
      batches={testBatches}
      config={config}
      checkoutMode={options?.checkoutMode ?? "closed"}
      onStartCheckout={options?.onStartCheckout}
      onRedirectToCheckout={options?.onRedirectToCheckout}
    />
  );

  fireEvent.change(screen.getByLabelText("Program"), { target: { value: "mto-readiness" } });
  fireEvent.change(screen.getByLabelText("Batch"), {
    target: { value: options?.batchId ?? "batch-mto-2026-01" },
  });
  fireEvent.click(screen.getByRole("button", { name: /^Continue$/i }));

  fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: "Samira Rahman" } });
  fireEvent.change(screen.getByLabelText(/Email address/i), {
    target: { value: "samira@example.com" },
  });
  fireEvent.change(screen.getByLabelText(/WhatsApp \/ Phone number/i), {
    target: { value: "01711223344" },
  });
  fireEvent.click(screen.getByRole("button", { name: /^Continue$/i }));

  fireEvent.change(screen.getByLabelText(/University/i), { target: { value: "Dhaka University" } });
  fireEvent.change(screen.getByLabelText(/Department/i), { target: { value: "Finance" } });
  fireEvent.change(screen.getByLabelText(/Current professional phase/i), {
    target: { value: "Recent graduate" },
  });
  fireEvent.click(screen.getByRole("button", { name: /^Continue$/i }));

  fireEvent.click(screen.getByRole("button", { name: /Continue to payment/i }));
}

describe("EnrollmentView flow (Hosted bKash Checkout v1)", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows a returning-applicant /status link and 'Online enrollment is coming soon' banner in closed mode", () => {
    render(
      <EnrollmentView
        courses={testCourses}
        batches={testBatches}
        config={createOfficialConfig(false)}
        checkoutMode="closed"
      />
    );

    const statusLink = screen.getByRole("link", { name: /Check application status/i });
    expect(statusLink.getAttribute("href")).toBe("/status");
    expect(screen.getByTestId("online-enrollment-coming-soon").textContent).toMatch(
      /Online enrollment is coming soon/i
    );
  });

  it("renders hosted bKash Checkout without manual QR, Transaction ID, or Bank Transfer fields and disables CTA when closed", () => {
    navigateToPaidPaymentStep(createOfficialConfig(false), {
      batchId: "batch-mto-discounted",
      checkoutMode: "closed",
    });

    expect(screen.getByTestId("online-enrollment-coming-soon").textContent).toMatch(
      /Online enrollment is coming soon/i
    );
    expect(screen.getByTestId("payment-amount-due").textContent).toBe("BDT 5,500");
    expect(screen.getByTestId("hosted-bkash-checkout-panel")).toBeDefined();

    // Ensure old manual QR / manual TrxID / Bank transfer inputs are completely gone
    expect(screen.queryByTestId("bkash-qr-inline-trigger")).toBeNull();
    expect(screen.queryByTestId("desktop-bkash-qr-panel")).toBeNull();
    expect(screen.queryByLabelText(/bKash Transaction ID/i)).toBeNull();
    expect(screen.queryByLabelText(/Bank Transaction Reference/i)).toBeNull();
    expect(screen.queryByText(/Mutual Trust Bank PLC/i)).toBeNull();

    const submitBtn = screen.getByRole("button", {
      name: /Online enrollment is coming soon/i,
    }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it("disables free cohort registration button in closed mode", () => {
    render(
      <EnrollmentView
        courses={testCourses}
        batches={testBatches}
        config={createOfficialConfig(false)}
        checkoutMode="closed"
      />
    );

    fireEvent.change(screen.getByLabelText("Program"), {
      target: { value: "career-planning-workshop" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Continue$/i }));

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: "Kamal Uddin" } });
    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: "kamal@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/WhatsApp \/ Phone number/i), {
      target: { value: "01811223344" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Continue$/i }));

    const confirmBtn = screen.getByRole("button", {
      name: /Online enrollment is coming soon/i,
    }) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
  });

  it("starts hosted bKash Checkout and redirects in mock mode without asking for a manual transaction reference", async () => {
    const startSpy = vi.fn().mockResolvedValue({
      isFree: false,
      applicationReference: "LNA-MTOK-2026",
      status: "pending",
      checkoutUrl: "http://localhost:3000/api/payments/bkash/mock-checkout?token=mocktok",
      outcomeToken: "outtok",
    });
    const redirectSpy = vi.fn();

    navigateToPaidPaymentStep(createOfficialConfig(true), {
      batchId: "batch-mto-2026-01",
      checkoutMode: "mock",
      onStartCheckout: startSpy,
      onRedirectToCheckout: redirectSpy,
    });

    expect(screen.queryByTestId("online-enrollment-coming-soon")).toBeNull();
    expect(screen.getByTestId("payment-amount-due").textContent).toBe("BDT 7,500");
    expect(screen.getByText(/Mock Gateway Mode \(Dev\)/i)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Continue to bKash Checkout/i }));

    await waitFor(() =>
      expect(startSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId: "mto-readiness",
          batchId: "batch-mto-2026-01",
          fullName: "Samira Rahman",
          email: "samira@example.com",
          whatsapp: "01711223344",
        })
      )
    );
    await waitFor(() =>
      expect(redirectSpy).toHaveBeenCalledWith(
        "http://localhost:3000/api/payments/bkash/mock-checkout?token=mocktok"
      )
    );
  });

  it("confirms free registrations directly, copies LNA ID, and links to /status?ref=", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    const fixtureRef = generateEnrollmentReference();
    const startSpy = vi.fn().mockResolvedValue({
      isFree: true,
      applicationReference: fixtureRef,
      status: "confirmed" as const,
      outcomeToken: "tok",
    });

    render(
      <EnrollmentView
        courses={testCourses}
        batches={testBatches}
        config={createOfficialConfig(true)}
        checkoutMode="mock"
        onStartCheckout={startSpy}
      />
    );

    fireEvent.change(screen.getByLabelText("Program"), {
      target: { value: "career-planning-workshop" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Continue$/i }));

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: "Kamal Uddin" } });
    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: "kamal@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/WhatsApp \/ Phone number/i), {
      target: { value: "01811223344" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Continue$/i }));

    fireEvent.click(screen.getByRole("button", { name: /Confirm registration/i }));

    await waitFor(() => expect(screen.getByText("Enrollment confirmed")).toBeDefined());
    expect(screen.getByTestId("application-id-value").textContent?.trim()).toBe(fixtureRef);
    expect(screen.getByText(/Keep this ID to verify status anytime/i)).toBeDefined();
    expect(document.body.textContent).not.toMatch(/confirmation email/i);

    fireEvent.click(screen.getByRole("button", { name: /Copy LNA Application ID/i }));
    await waitFor(() => expect(writeTextMock).toHaveBeenCalledWith(fixtureRef));

    expect(
      screen.getByRole("link", { name: /Check application status/i }).getAttribute("href")
    ).toBe(`/status?ref=${encodeURIComponent(fixtureRef)}`);
  });

  it("renders failed callback outcome with seat hold preserved and working Retry bKash payment button", async () => {
    const failedOutcome: EnrollmentOutcomeSummary = {
      outcome: "failed",
      applicationReference: "LNA-FAIL-2026",
      courseTitle: "MTO Readiness Program",
      batchName: "MTO Readiness Cohort 1",
      payablePoisha: 750000,
      paymentMethod: "bkash",
      status: "pending",
      holdExpiresAt: "2099-01-01T00:00:00.000Z",
      canRetry: true,
      outcomeToken: "signed-outcome-tok",
    };

    const retrySpy = vi.fn().mockResolvedValue({
      applicationReference: "LNA-FAIL-2026",
      checkoutUrl: "http://localhost:3000/api/payments/bkash/mock-checkout?token=retry",
      outcomeToken: "fresh-tok",
    });
    const redirectSpy = vi.fn();

    render(
      <EnrollmentView
        courses={testCourses}
        batches={testBatches}
        config={createOfficialConfig(true)}
        checkoutMode="mock"
        initialOutcome={failedOutcome}
        onRetryCheckout={retrySpy}
        onRedirectToCheckout={redirectSpy}
      />
    );

    expect(screen.getByTestId("payment-failed-alert").textContent).toMatch(/LNA-FAIL-2026/);
    fireEvent.click(screen.getByRole("button", { name: /Retry bKash payment/i }));

    await waitFor(() =>
      expect(retrySpy).toHaveBeenCalledWith({
        applicationReference: "LNA-FAIL-2026",
        outcomeToken: "signed-outcome-tok",
      })
    );
    await waitFor(() =>
      expect(redirectSpy).toHaveBeenCalledWith(
        "http://localhost:3000/api/payments/bkash/mock-checkout?token=retry"
      )
    );
  });

  it("renders server-verified confirmed and review_hold return summaries cleanly", () => {
    const reviewOutcome: EnrollmentOutcomeSummary = {
      outcome: "review_hold",
      applicationReference: "LNA-HOLD-2026",
      courseTitle: "MTO Readiness Program",
      batchName: "MTO Readiness Cohort 1",
      payablePoisha: 550000,
      paymentMethod: "bkash",
      status: "review_hold",
      holdExpiresAt: null,
      canRetry: false,
      outcomeToken: "tok",
    };

    const { unmount } = render(
      <EnrollmentView
        courses={testCourses}
        batches={testBatches}
        config={createOfficialConfig(true)}
        checkoutMode="mock"
        initialOutcome={reviewOutcome}
      />
    );

    expect(screen.getByText(/Under manual review/i)).toBeDefined();
    expect(screen.getByTestId("application-id-value").textContent).toBe("LNA-HOLD-2026");
    unmount();

    const confirmedOutcome: EnrollmentOutcomeSummary = {
      ...reviewOutcome,
      outcome: "confirmed",
      applicationReference: "LNA-CONF-2026",
      status: "confirmed",
    };

    render(
      <EnrollmentView
        courses={testCourses}
        batches={testBatches}
        config={createOfficialConfig(true)}
        checkoutMode="mock"
        initialOutcome={confirmedOutcome}
      />
    );

    expect(screen.getByText(/You're enrolled\./i)).toBeDefined();
    expect(screen.getByTestId("application-id-value").textContent).toBe("LNA-CONF-2026");
    expect(screen.getByText(/Keep this ID to verify status anytime/i)).toBeDefined();
    expect(
      screen.getByRole("link", { name: /Check application status/i }).getAttribute("href")
    ).toBe("/status?ref=LNA-CONF-2026");
    expect(document.body.textContent).not.toMatch(/confirmation email/i);
  });
});
