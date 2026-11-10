import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
import type { Course, Batch } from "@/lib/content";
import type { EnrollmentConfig } from "@/lib/enrollment/types";
import { generateEnrollmentReference } from "@/lib/enrollment/reference";
import { EnrollmentView, type EnrollmentSubmissionPayload } from "./enrollment-view";

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
          "Scan the official LNA bKash Merchant QR code, pay the exact amount due, and enter your bKash Transaction ID below.",
      },
      bankTransfer: {
        enabled: true,
        instruction:
          "Transfer the exact amount due to the official Lead Nation Academy bank account below, then enter your bank-issued Transaction Reference.",
        bankDetails: {
          bankName: "Mutual Trust Bank PLC",
          accountName: "Lead Nation Academy - LNA",
          accountNumber: "130100052843",
        },
      },
    },
  };
}

function navigateToPaidPaymentStep(
  config: EnrollmentConfig,
  batchId = "batch-mto-2026-01",
  onSubmitApplication?: (payload: EnrollmentSubmissionPayload) => {
    applicationReference: string;
    status: "Application in process" | "Enrollment confirmed";
  }
) {
  render(
    <EnrollmentView
      courses={testCourses}
      batches={testBatches}
      config={config}
      onSubmitApplication={onSubmitApplication}
    />
  );

  fireEvent.change(screen.getByLabelText("Program"), { target: { value: "mto-readiness" } });
  fireEvent.change(screen.getByLabelText("Batch"), { target: { value: batchId } });
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

describe("EnrollmentView flow", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows a returning-applicant Check application status link and 'Online enrollment is coming soon' banner in public disabled mode", () => {
    render(
      <EnrollmentView
        courses={testCourses}
        batches={testBatches}
        config={createOfficialConfig(false)}
      />
    );

    const statusLink = screen.getByRole("link", { name: /Check application status/i });
    expect(statusLink.getAttribute("href")).toBe("/status");
    expect(screen.getByTestId("online-enrollment-coming-soon").textContent).toMatch(
      /Online enrollment is coming soon/i
    );
  });

  it("renders official LNA bKash QR and Mutual Trust Bank details without demo strings, hides live instructions, and disables submission when submissionEnabled is false", () => {
    navigateToPaidPaymentStep(createOfficialConfig(false), "batch-mto-discounted");

    // Coming soon banner visible; zero demo content anywhere in page
    expect(screen.getByTestId("online-enrollment-coming-soon").textContent).toMatch(
      /Online enrollment is coming soon/i
    );
    expect(screen.queryByText(/Demo/i)).toBeNull();
    expect(screen.queryByText(/01700-000000/)).toBeNull();
    expect(screen.queryByText(/City Bank/i)).toBeNull();

    // Official bKash QR (inline + desktop right panel) + amount due + transaction field preserved, live instruction hidden
    expect(screen.getByTestId("payment-amount-due").textContent).toBe("BDT 5,500");
    const inlineQrBtn = screen.getByTestId("bkash-qr-inline-trigger");
    const inlineQrImg = within(inlineQrBtn).getByRole("img", {
      name: /Lead Nation Academy official bKash Merchant QR code/i,
    });
    expect(inlineQrImg.getAttribute("src")).toBe("/images/payments/lna-bkash-merchant-qr.png");

    const desktopQrPanel = screen.getByTestId("desktop-bkash-qr-panel");
    const desktopQrImg = within(desktopQrPanel).getByRole("img", {
      name: /Lead Nation Academy official bKash Merchant QR code/i,
    });
    expect(desktopQrImg.getAttribute("src")).toBe("/images/payments/lna-bkash-merchant-qr.png");

    expect(screen.getAllByText("Lead Nation Academy").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("0158 1799 666").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText(/bKash Transaction ID/i)).toBeDefined();
    expect(screen.queryByText(/Scan the official LNA bKash Merchant QR code/i)).toBeNull();

    // Switch to Bank Transfer: desktop QR panel hides, official MTB details shown, unapproved branch/routing omitted, instruction hidden
    fireEvent.click(screen.getByLabelText(/Bank Transfer/i));
    expect(screen.queryByTestId("desktop-bkash-qr-panel")).toBeNull();
    expect(screen.getByTestId("payment-amount-due").textContent).toBe("BDT 5,500");
    expect(screen.getByText("Mutual Trust Bank PLC")).toBeDefined();
    expect(screen.getByText("Lead Nation Academy - LNA")).toBeDefined();
    expect(screen.getByText("130100052843")).toBeDefined();
    expect(screen.queryByText(/^Branch$/i)).toBeNull();
    expect(screen.queryByText(/^Routing number$/i)).toBeNull();
    expect(screen.getByLabelText(/Bank Transaction Reference/i)).toBeDefined();
    expect(
      screen.queryByText(/Transfer the exact amount due to the official Lead Nation Academy/i)
    ).toBeNull();

    // Submission button is disabled and does not simulate submission
    const submitBtn = screen.getByRole("button", {
      name: /Submission disabled \(coming soon\)/i,
    }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
    fireEvent.click(submitBtn);
    expect(screen.queryByRole("heading", { level: 1, name: /Application in process/i })).toBeNull();
  });

  it("opens an enlarged bKash QR popup dialog when clicking the inline, enlarge, or desktop QR trigger", async () => {
    navigateToPaidPaymentStep(createOfficialConfig(false), "batch-mto-2026-01");

    expect(screen.queryByTestId("bkash-qr-popup-dialog")).toBeNull();

    // Open via mobile/inline QR trigger
    fireEvent.click(screen.getByTestId("bkash-qr-inline-trigger"));
    const popup = await screen.findByTestId("bkash-qr-popup-dialog");
    expect(
      within(popup)
        .getByRole("img", { name: /Lead Nation Academy official bKash Merchant QR code/i })
        .getAttribute("src")
    ).toBe("/images/payments/lna-bkash-merchant-qr.png");
    expect(within(popup).getByText("0158 1799 666")).toBeDefined();
    expect(within(popup).getByText("BDT 7,500")).toBeDefined();

    // Close dialog cleanly
    fireEvent.click(within(popup).getByRole("button", { name: /^Close$/i }));
    await waitFor(() => expect(screen.queryByTestId("bkash-qr-popup-dialog")).toBeNull());

    // Open again via desktop right panel trigger
    fireEvent.click(screen.getByTestId("bkash-qr-desktop-trigger"));
    expect(await screen.findByTestId("bkash-qr-popup-dialog")).toBeDefined();
  });

  it("disables free cohort registration button in public disabled mode", () => {
    render(
      <EnrollmentView
        courses={testCourses}
        batches={testBatches}
        config={createOfficialConfig(false)}
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
    fireEvent.click(confirmBtn);
    expect(screen.queryByText("Enrollment confirmed")).toBeNull();
  });

  it("validates bKash Transaction ID, submits via handler, copies LNA ID, and links to /status?ref= when enabled in tests", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    const fixtureRef = generateEnrollmentReference();
    const onSubmitSpy = vi.fn().mockResolvedValue({
      applicationReference: fixtureRef,
      status: "Application in process" as const,
    });

    navigateToPaidPaymentStep(createOfficialConfig(true), "batch-mto-2026-01", onSubmitSpy);

    expect(screen.queryByTestId("online-enrollment-coming-soon")).toBeNull();
    expect(screen.getByTestId("payment-amount-due").textContent).toBe("BDT 7,500");
    expect(screen.getByText(/Scan the official LNA bKash Merchant QR code/i)).toBeDefined();

    // Validation requires bKash Transaction ID
    fireEvent.click(screen.getByRole("button", { name: /Submit application/i }));
    const errorAlert = screen.getByRole("alert");
    expect(errorAlert.textContent).toMatch(/bKash Transaction ID/i);
    const txInput = screen.getByLabelText(/bKash Transaction ID/i);
    expect(txInput.getAttribute("aria-invalid")).toBe("true");
    expect(onSubmitSpy).not.toHaveBeenCalled();

    // Submit with valid bKash TrxID
    fireEvent.change(txInput, { target: { value: "BKASH998877" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit application/i }));

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 1, name: /Application in process/i })
      ).toBeDefined()
    );
    expect(onSubmitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: "mto-readiness",
        batchId: "batch-mto-2026-01",
        fullName: "Samira Rahman",
        email: "samira@example.com",
        paymentMethod: "bkash",
        transactionReference: "BKASH998877",
      })
    );
    expect(
      screen.getByText(/Enrollment is confirmed after staff verify the payment/i)
    ).toBeDefined();

    const appIdEl = screen.getByTestId("application-id-value");
    expect(appIdEl.textContent?.trim()).toBe(fixtureRef);
    expect(fixtureRef).not.toBe("BKASH998877");
    expect(screen.queryByText("BKASH998877")).toBeNull();

    const copyBtn = screen.getByRole("button", { name: /Copy LNA Application ID/i });
    fireEvent.click(copyBtn);
    await waitFor(() => expect(writeTextMock).toHaveBeenCalledWith(fixtureRef));

    const statusLink = screen.getByRole("link", { name: /Check application status/i });
    expect(statusLink.getAttribute("href")).toBe(`/status?ref=${encodeURIComponent(fixtureRef)}`);
  });

  it("supports switching to Bank Transfer, validates reference, and submits via handler when enabled in tests", async () => {
    const fixtureRef = "LNA-BANK-2026";
    const onSubmitSpy = vi.fn().mockResolvedValue({
      applicationReference: fixtureRef,
      status: "Application in process" as const,
    });

    navigateToPaidPaymentStep(createOfficialConfig(true), "batch-mto-discounted", onSubmitSpy);

    expect(screen.getByTestId("payment-amount-due").textContent).toBe("BDT 5,500");

    fireEvent.click(screen.getByLabelText(/Bank Transfer/i));
    expect(screen.getByTestId("payment-amount-due").textContent).toBe("BDT 5,500");
    expect(screen.getByText("Mutual Trust Bank PLC")).toBeDefined();
    expect(screen.getByText("130100052843")).toBeDefined();
    expect(
      screen.getByText(/Transfer the exact amount due to the official Lead Nation Academy/i)
    ).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Submit application/i }));
    expect(screen.getByRole("alert").textContent).toMatch(/bank transaction reference/i);
    expect(onSubmitSpy).not.toHaveBeenCalled();

    const bankRefInput = screen.getByLabelText(/Bank Transaction Reference/i);
    fireEvent.change(bankRefInput, { target: { value: "BANK-TRX-4455" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit application/i }));

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 1, name: /Application in process/i })
      ).toBeDefined()
    );
    expect(onSubmitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethod: "bank_transfer",
        transactionReference: "BANK-TRX-4455",
      })
    );
    expect(screen.getByText("Bank Transfer")).toBeDefined();
    expect(screen.queryByText("BANK-TRX-4455")).toBeNull();
  });

  it("confirms free registrations via handler and shows /status?ref= link when enabled in tests", async () => {
    const fixtureRef = "LNA-FREE-2026";
    const onSubmitSpy = vi.fn().mockResolvedValue({
      applicationReference: fixtureRef,
      status: "Enrollment confirmed" as const,
    });

    render(
      <EnrollmentView
        courses={testCourses}
        batches={testBatches}
        config={createOfficialConfig(true)}
        onSubmitApplication={onSubmitSpy}
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
    expect(onSubmitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: "career-planning-workshop",
        batchId: "batch-free-2026-01",
        paymentMethod: "free",
      })
    );
    expect(screen.getByTestId("application-id-value").textContent?.trim()).toBe(fixtureRef);
    expect(
      screen.getByRole("link", { name: /Check application status/i }).getAttribute("href")
    ).toBe(`/status?ref=${encodeURIComponent(fixtureRef)}`);
  });
});
