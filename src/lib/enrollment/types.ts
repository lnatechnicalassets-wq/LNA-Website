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
  branch: string;
  routingNumber?: string;
}

export interface EnrollmentConfig {
  programQuestions: Record<string, ProgramQuestion[]>;
  payment: {
    bkash: {
      enabled: boolean;
    };
    bankTransfer: {
      enabled: boolean;
      bankDetails: BankDetails;
    };
  };
}

export type EnrollmentStep =
  | "program" // 01-program.png, 02-batch-selected.png, 03-no-open-batches.png
  | "details" // 04-your-details.png
  | "questions" // 05-program-questions.png
  | "review" // 06-review.png, 12-free-review.png
  | "payment_method" // 07-payment-method.png
  | "bank_transfer" // 08-bank-transfer.png
  | "pending_verification" // 09-payment-pending.png
  | "payment_failed" // 10-payment-failed.png
  | "confirmed"; // 11-enrollment-confirmed.png, 13-free-registration-confirmed.png

export interface EnrollmentState {
  courseId: string;
  batchId: string;
  fullName: string;
  email: string;
  whatsapp: string;
  answers: Record<string, string>;
  paymentMethod: "bkash" | "bank_transfer";
  transferReference: string;
  applicationReference: string;
  isFree: boolean;
}
