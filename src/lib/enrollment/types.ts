export interface ProgramQuestion {
  id: string;
  label: string;
  type: "text" | "select" | "textarea";
  placeholder?: string;
  options?: string[];
  required: boolean;
}

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch?: string;
  routingNumber?: string;
}

export interface BkashPaymentConfig {
  enabled: boolean;
  merchantName: string;
  merchantNumber: string;
  qrImageSrc: string;
  qrImageAlt: string;
  instruction: string;
}

export interface BankTransferConfig {
  enabled: boolean;
  instruction: string;
  bankDetails: BankDetails | null;
}

export interface EnrollmentConfig {
  programQuestions: Record<string, ProgramQuestion[]>;
  payment: {
    submissionEnabled: boolean;
    bkash: BkashPaymentConfig;
    bankTransfer: BankTransferConfig;
  };
}

export type PaymentMethod = "bkash" | "bank_transfer";

export type EnrollmentStep =
  | "program"
  | "details"
  | "questions"
  | "review"
  | "payment"
  | "pending_verification"
  | "confirmed";

export interface EnrollmentState {
  courseId: string;
  batchId: string;
  fullName: string;
  email: string;
  whatsapp: string;
  answers: Record<string, string>;
  paymentMethod: PaymentMethod;
  bkashTransactionId: string;
  bankTransactionReference: string;
  applicationReference: string;
  isFree: boolean;
}
