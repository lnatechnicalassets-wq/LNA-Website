import { z } from "zod";
import { isValidBdPhone, normalizeBdPhone, normalizeEmail } from "./enrollment/status";
import type { ProgramQuestion } from "./enrollment/types";

export const manualAdmissionCopy = {
  title: "Add student",
  applicationsDescription:
    "Review applications, seat reservations, payment, and confirmation status.",
  back: "Back to Admissions",
  roster: "View batch roster",
  chooseBatchHeading: "Course and batch",
  course: "Course",
  batch: "Batch",
  chooseCourse: "Choose a course",
  chooseBatch: "Choose a batch",
  chooseCourseFirst: "Choose a course first",
  noOpenBatches: "No batches are open for enrollment. Open a batch in Courses to add students.",
  browseBatches: "Manage batches",
  previouslySelectedUnavailable:
    "That batch is no longer available for enrollment. Choose an open batch below.",
  choicesUnavailable: "Active courses and batches could not be loaded.",
  retry: "Try again",
  studentDetails: "Student details",
  fee: "Batch fee",
  free: "Free",
  freeDescription: "Saving confirms the student’s place in this free batch.",
  paidDescription: "A Super Admin must verify the payment before a seat is confirmed.",
  paymentDetails: "Payment details",
  paymentMethod: "Payment method",
  choosePaymentMethod: "Choose a payment method",
  bkash: "bKash",
  bankTransfer: "Bank transfer",
  bkashReference: "bKash transaction ID",
  bankReference: "Bank transfer reference",
  invalidPaymentMethod: "Choose bKash or bank transfer.",
  invalidReference: "Enter a valid transaction reference, 4 to 128 characters.",
  referenceHelp: "Use the transaction ID or reference issued by the payment provider.",
  batchClosed: "Enrollment is closed for this batch.",
  batchUnavailable: "The batch could not be loaded. Try again.",
  save: "Add student",
  saveForReview: "Save for verification",
  saving: "Adding student…",
  fullName: "Full name",
  email: "Email",
  phone: "Bangladeshi mobile number",
  invalidName: "Enter the student’s full name.",
  invalidEmail: "Enter a valid email address.",
  invalidPhone: "Enter a valid Bangladeshi mobile number.",
  invalidAnswer: "Enter a valid answer.",
  chooseOption: "Select an option",
  missing: "Complete the required fields.",
  duplicate:
    "An active application or enrollment already exists for this email or phone number in this batch.",
  viewExisting: "View existing record",
  stale: "Batch details changed. Reload this page and review the fee and schedule before saving.",
  full: "There are no seats available in this batch.",
  setupRequired:
    "Manual enrollment is unavailable. Ask your site administrator to finish the database setup.",
  accessUnavailable:
    "Manual enrollment could not save this record. Ask your site administrator to check database access.",
  failure:
    "The student could not be added. Your entries are still here. Try again or ask your site administrator to check the server log.",
} as const;

export const manualPaymentSchema = z.object({
  paymentMethod: z.enum(["bkash", "bank_transfer"], {
    errorMap: () => ({ message: manualAdmissionCopy.invalidPaymentMethod }),
  }),
  paymentReference: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9 ./_-]{3,127}$/, manualAdmissionCopy.invalidReference)
    .transform((value) => value.toUpperCase()),
});

export const manualPaymentReviewCopy = {
  title: "Manual payment verification",
  pending: "Open Confirm to review the recorded reference and amount.",
  verified: "Verified by a Super Admin",
  rejected: "Payment reference rejected. This application was cancelled.",
  bkashInstructions:
    "Find this transaction in LNA’s bKash merchant history. Match the transaction ID and the amount received before approving.",
  bankInstructions:
    "Find the incoming transfer on LNA’s bank statement. Match the transfer reference and the amount received before approving.",
  decision: "Review decision",
  approveChoice: "Verify payment",
  rejectChoice: "Reject payment reference",
  approveButton: "Approve payment and confirm seat",
  rejectButton: "Reject payment reference",
  rejectEffect: "Rejecting cancels this application and lets staff add the student again.",
  approving: "Saving review…",
  received: "Amount received (BDT)",
  attestApproval: "I matched the reference and amount against LNA’s receiving account.",
  attestRejection: "I want to reject this reference and cancel the application.",
  invalidAmount: "Enter the received amount in BDT, using up to two decimal places.",
  invalidReview: "Complete the review before submitting.",
  amountMismatch: "The amount received does not match the saved enrollment fee.",
  duplicateReference: "This payment reference is already linked to another transaction.",
  unavailable: "This application is no longer awaiting manual payment review.",
  stale: "This application changed. Refresh the page and review the latest details.",
  closed: "This batch no longer accepts confirmations.",
  failure: "The review could not be saved. Try again.",
} as const;

export const manualStudentFields = [
  { name: "fullName", label: manualAdmissionCopy.fullName, type: "text", maxLength: 120 },
  { name: "email", label: manualAdmissionCopy.email, type: "email", maxLength: 160 },
  { name: "phone", label: manualAdmissionCopy.phone, type: "tel", maxLength: 24 },
] as const;

export function manualAnswerField(questionId: string) {
  return `answer_${questionId}`;
}

export const manualStudentSchema = z.object({
  fullName: z.string().trim().min(2, manualAdmissionCopy.invalidName).max(120),
  email: z
    .string()
    .trim()
    .email(manualAdmissionCopy.invalidEmail)
    .max(160)
    .transform(normalizeEmail),
  phone: z
    .string()
    .trim()
    .max(24)
    .regex(/^[+\d()\s-]+$/, manualAdmissionCopy.invalidPhone)
    .refine(isValidBdPhone, manualAdmissionCopy.invalidPhone)
    .transform(normalizeBdPhone),
});

export function manualAdmissionSchema(questions: ProgramQuestion[]) {
  const answerFields = Object.fromEntries(
    questions.map((question) => [
      manualAnswerField(question.id),
      z
        .string()
        .trim()
        .max(2000, manualAdmissionCopy.invalidAnswer)
        .refine(
          (answer) =>
            answer === ""
              ? !question.required
              : question.type !== "select" || question.options?.includes(answer),
          manualAdmissionCopy.invalidAnswer
        ),
    ])
  );
  return manualStudentSchema.extend(answerFields);
}

export interface ManualAdmissionBatchOption {
  id: string;
  courseId: string;
  courseTitle: string;
  name: string;
  startDate: string;
  revision: string;
  fee: string;
  isFree: boolean;
  questions: ProgramQuestion[];
}

export interface ManualAdmissionState {
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  existingId?: string;
}
