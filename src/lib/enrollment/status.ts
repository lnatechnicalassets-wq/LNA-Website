import type { PaymentMethod } from "./types";

export type ApplicationStatusValue = "Application in process" | "Enrollment confirmed";

export type StatusPaymentMethod = PaymentMethod | "free";

export type VerificationContactType = "email" | "phone";

export interface SafeStatusLookupResult {
  applicationReference: string;
  fullName: string;
  university?: string;
  courseTitle: string;
  batchName: string;
  paymentMethod: StatusPaymentMethod;
  status: ApplicationStatusValue;
}

export interface StatusLookupQuery {
  applicationId: string;
  verificationType: VerificationContactType;
  contactValue: string;
}

export interface StatusProjectionSource {
  applicationReference: string;
  fullName: string;
  university?: string;
  courseTitle: string;
  batchName: string;
  paymentMethod: StatusPaymentMethod;
  status: ApplicationStatusValue;
}

export function normalizeApplicationRef(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeBdPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("880") && digits.length === 13) {
    return `0${digits.slice(3)}`;
  }
  if (digits.startsWith("1") && digits.length === 10) {
    return `0${digits}`;
  }
  return digits;
}

export function isValidBdPhone(value: string): boolean {
  return /^01[3-9]\d{8}$/.test(normalizeBdPhone(value));
}

export function formatPaymentMethodLabel(method: StatusPaymentMethod): string {
  switch (method) {
    case "bkash":
      return "bKash";
    case "bank_transfer":
      return "Bank Transfer";
    case "free":
      return "Free Registration";
  }
}

export function projectSafeStatusResult(
  source: StatusProjectionSource & Record<string, unknown>
): SafeStatusLookupResult {
  const trimmedUniversity = source.university?.trim();
  return {
    applicationReference: normalizeApplicationRef(source.applicationReference),
    fullName: source.fullName.trim(),
    ...(trimmedUniversity ? { university: trimmedUniversity } : {}),
    courseTitle: source.courseTitle,
    batchName: source.batchName,
    paymentMethod: source.paymentMethod,
    status: source.status,
  };
}
