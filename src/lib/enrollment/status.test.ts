import { describe, it, expect } from "vitest";
import {
  formatPaymentMethodLabel,
  isValidBdPhone,
  normalizeApplicationRef,
  normalizeBdPhone,
  normalizeEmail,
  projectSafeStatusResult,
  type SafeStatusLookupResult,
  type StatusLookupQuery,
} from "./status";

interface TestApplicationFixture {
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

const TEST_FIXTURES: TestApplicationFixture[] = [
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

function lookupFromTestFixtures(query: StatusLookupQuery): SafeStatusLookupResult | null {
  const ref = normalizeApplicationRef(query.applicationId);
  const record = TEST_FIXTURES.find((r) => normalizeApplicationRef(r.applicationReference) === ref);
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

describe("enrollment status helpers and privacy projection", () => {
  it("normalizes application IDs, emails, and Bangladeshi phone formats", () => {
    expect(normalizeApplicationRef(" lna-mto1-2026 ")).toBe("LNA-MTO1-2026");
    expect(normalizeEmail(" Test@Example.COM ")).toBe("test@example.com");
    expect(normalizeBdPhone("01711-000001")).toBe("01711000001");
    expect(normalizeBdPhone("+880 1711 000001")).toBe("01711000001");
    expect(normalizeBdPhone("8801711000001")).toBe("01711000001");
    expect(normalizeBdPhone("1711000001")).toBe("01711000001");
    expect(isValidBdPhone("+8801711000001")).toBe(true);
    expect(isValidBdPhone("12345")).toBe(false);
  });

  it("projects strictly non-sensitive summary fields and omits absent university", () => {
    const res = lookupFromTestFixtures({
      applicationId: " lna-mto1-2026 ",
      verificationType: "email",
      contactValue: "NADIA.FIXTURE@example.com",
    });

    expect(res).toEqual({
      applicationReference: "LNA-MTO1-2026",
      fullName: "Nadia Sultana",
      university: "University of Dhaka",
      courseTitle: "MTO Readiness Program",
      batchName: "MTO Readiness Cohort 1",
      paymentMethod: "bkash",
      status: "Application in process",
    });
    expect("email" in (res as object)).toBe(false);
    expect("phone" in (res as object)).toBe(false);
    expect("bkashTransactionId" in (res as object)).toBe(false);
    expect("bankTransactionReference" in (res as object)).toBe(false);

    const noUniRes = lookupFromTestFixtures({
      applicationId: "LNA-IRGP-2025",
      verificationType: "phone",
      contactValue: "+880 1911-000003",
    });
    expect(noUniRes?.university).toBeUndefined();
    expect(noUniRes?.status).toBe("Enrollment confirmed");
  });

  it("formats payment method labels cleanly", () => {
    expect(formatPaymentMethodLabel("bkash")).toBe("bKash");
    expect(formatPaymentMethodLabel("bank_transfer")).toBe("Bank Transfer");
    expect(formatPaymentMethodLabel("free")).toBe("Free Registration");
  });
});
