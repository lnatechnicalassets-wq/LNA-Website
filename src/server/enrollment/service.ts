import "server-only";
import crypto from "node:crypto";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { admissionStatus, isDuplicateEnrollmentContact } from "@/lib/admin-admissions";
import {
  bkashTransactionIdError,
  bkashTransactionIdPattern,
  normalizeBkashTransactionId,
} from "@/lib/enrollment/manual-payment";
import { AppError } from "@/lib/errors";
import {
  isValidBdPhone,
  normalizeApplicationRef,
  normalizeBdPhone,
  normalizeEmail,
  projectSafeStatusResult,
  type ApplicationStatusValue,
  type SafeStatusLookupResult,
  type StatusLookupQuery,
} from "@/lib/enrollment/status";
import type {
  EnrollmentOutcomeSummary,
  EnrollmentOutcomeType,
  ProgramQuestion,
} from "@/lib/enrollment/types";
import type { VerifiedStaffContext } from "@/server/auth/require-staff";
import { parseCurrentServerEnv } from "@/server/env";
import { dispatchEmailOutboxById, type OutboxEmailSender } from "@/server/email/resend";
import { getEnrollmentRuntimeConfig } from "@/server/enrollment/config";
import {
  BkashRequestNotSentError,
  getPaymentGatewayClient,
  redactBkashPayload,
  verifyMockScenarioToken,
  type PaymentGatewayClient,
  type PaymentStatusResult,
} from "@/server/payments/bkash";
import { signHmacToken, verifyHmacToken } from "@/server/security/hmac";
import {
  createSupabaseAdminClient,
  hasConfiguredSupabaseServerEnv,
} from "@/server/supabase/clients";

const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CROCKFORD_REF_REGEX = /^LNA-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;
const EXECUTE_NO_RESPONSE = "EXECUTE_NO_RESPONSE";

function hashBkashCallbackSignature(signature: string): string {
  return crypto.createHash("sha256").update(signature).digest("hex");
}

function matchesBkashCallbackSignature(expected: string, signature?: string | null): boolean {
  return Boolean(
    signature &&
      signature.length <= 512 &&
      /^[a-f0-9]{64}$/.test(expected) &&
      crypto.timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(hashBkashCallbackSignature(signature), "hex")
      )
  );
}

export interface PublicCatalogCourse {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  summary: string;
  description: string;
  learningOutcomes: string[];
  targetAudience: string[];
  prerequisites: string[];
  modules: Array<{
    id: string;
    title: string;
    duration: string;
    topics: string[];
  }>;
  deliveryMode: "offline";
  venue: string;
  status: "draft" | "published" | "archived";
  featured: boolean;
  mentorIds: string[];
  provenance: {
    class: "A" | "B";
    verified: boolean;
    source: string;
    verifiedBy: string | null;
    verifiedOn: string | null;
  };
}

export interface PublicCatalogBatch {
  enrollmentClosesAt?: string;
  id: string;
  courseId: string;
  batchNumber: number;
  name: string;
  startDate: string;
  endDate: string;
  scheduleDescription: string;
  capacity: number;
  enrolledCount: number;
  seatHoldDurationMinutes: 30;
  feePoisha: number;
  discountFeePoisha?: number;
  status: "upcoming" | "open_for_enrollment" | "in_progress" | "completed" | "cancelled";
  venue: string;
  provenance: {
    class: "A" | "B";
    verified: boolean;
    source: string;
    verifiedBy: string | null;
    verifiedOn: string | null;
  };
}

export interface StartEnrollmentCheckoutResult {
  isFree: boolean;
  applicationReference: string;
  status: "confirmed" | "pending";
  checkoutUrl?: string;
  holdExpiresAt?: string | null;
  outcomeToken: string;
}

export interface RetryEnrollmentCheckoutResult {
  applicationReference: string;
  checkoutUrl: string;
  holdExpiresAt: string | null;
  outcomeToken: string;
}

export interface BkashCallbackProcessResult {
  outcome: EnrollmentOutcomeType;
  alreadyProcessed?: boolean;
  applicationReference?: string;
  redirectUrl: string;
}

export interface AdminEnrollmentListItem {
  id: string;
  publicRef: string;
  fullName: string;
  email: string;
  phone: string;
  courseSlug: string;
  courseTitle: string;
  batchSlug: string;
  batchName: string;
  paymentMethod: "bkash" | "free" | "bank_transfer";
  paymentStatus: string;
  status: string;
  payablePoisha: number;
  currency: string;
  holdExpiresAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
  isDevFixture: boolean;
  archivedAt?: string | null;
  legacyDuplicatePhone?: boolean;
  isStaffManualPayment?: boolean;
  isApplicantManualPayment?: boolean;
  submittedPaymentRef?: string | null;
  updatedAt?: string;
}

export interface AdminEnrollmentListResult {
  items: AdminEnrollmentListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface AdminPaymentAttemptView {
  id: string;
  tranId: string;
  paymentId: string | null;
  trxId: string | null;
  amountPoisha: number;
  validatedAmountPoisha: number | null;
  currency: string;
  status: string;
  gatewayStatusCode: string | null;
  gatewayStatusMessage: string | null;
  failureReason: string | null;
  executedAt: string | null;
  createdAt: string;
}

export interface AdminPaymentEventView {
  id: string;
  paymentAttemptId: string | null;
  source: string;
  eventStatus: string | null;
  redactedPayload: Record<string, unknown>;
  receivedAt: string;
}

export interface AdminEmailOutboxView {
  id: string;
  template: string;
  recipientEmail: string;
  status: string;
  providerMessageId: string | null;
  retryCount: number;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface AdminEnrollmentDetailResult {
  id: string;
  publicRef: string;
  fullName: string;
  email: string;
  phone: string;
  courseSlug: string;
  courseTitle: string;
  batchSlug: string;
  batchName: string;
  batchStartDate: string;
  batchVenue: string;
  answers: Record<string, string>;
  programQuestionsSnapshot: ProgramQuestion[];
  paymentMethod: "bkash" | "free" | "bank_transfer";
  paymentStatus: string;
  submittedPaymentRef: string | null;
  isStaffManualPayment: boolean;
  isApplicantManualPayment?: boolean;
  legacyDuplicatePhone?: boolean;
  archivedAt?: string | null;
  baseFeePoisha: number;
  discountAmountPoisha: number;
  payablePoisha: number;
  currency: string;
  status: string;
  holdExpiresAt: string | null;
  verifiedAt: string | null;
  confirmedAt: string | null;
  verificationNotes: string | null;
  isDevFixture: boolean;
  fixtureLabel: string | null;
  createdAt: string;
  updatedAt: string;
  paymentAttempts: AdminPaymentAttemptView[];
  paymentEvents: AdminPaymentEventView[];
  emailOutbox: AdminEmailOutboxView[];
}

interface EnrollmentOutcomeTokenPayload {
  publicRef: string;
  enrollmentId: string;
  paymentAttemptId?: string;
  paymentOutcome?: EnrollmentOutcomeType;
  scope: "enrollment_outcome";
  [key: string]: unknown;
}

const startEnrollmentPayloadSchema = z.object({
  courseId: z.string().regex(/^[a-z0-9-]+$/, "Invalid course identifier."),
  batchId: z.string().regex(/^[a-z0-9-]+$/, "Invalid batch identifier."),
  fullName: z.string().trim().min(2, "Please enter your full name.").max(120),
  email: z.string().trim().email("Please enter a valid email address.").max(160),
  whatsapp: z.string().trim().min(10, "Please enter a valid phone number.").max(24),
  answers: z.record(z.string().max(2000)).default({}),
});

const retryEnrollmentPayloadSchema = z.object({
  applicationReference: z.string().trim().min(10).max(20),
  outcomeToken: z.string().trim().min(20).max(2048),
});

export const statusLookupRequestSchema = z.object({
  applicationId: z.string().trim().min(4, "Please enter your LNA Application ID.").max(32),
  verificationType: z.enum(["email", "phone"]),
  contactValue: z.string().trim().min(3, "Please enter your email or phone number.").max(160),
});

function parseSafeIntegerPoisha(value: unknown): number {
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
      throw new AppError(
        "Invalid poisha integer value returned by database.",
        "INVALID_MONEY_VALUE",
        500
      );
    }
    return value;
  }

  if (typeof value === "bigint") {
    if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new AppError("Poisha value exceeds safe integer range.", "INVALID_MONEY_VALUE", 500);
    }
    let acc = 0;
    const text = value.toString();
    for (let i = 0; i < text.length; i++) {
      acc = acc * 10 + (text.charCodeAt(i) - 48);
    }
    return acc;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const trimmed = value.trim();
    const big = BigInt(trimmed);
    if (big > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new AppError("Poisha value exceeds safe integer range.", "INVALID_MONEY_VALUE", 500);
    }
    let acc = 0;
    for (let i = 0; i < trimmed.length; i++) {
      acc = acc * 10 + (trimmed.charCodeAt(i) - 48);
    }
    return acc;
  }

  throw new AppError("Unexpected non-integer money value.", "INVALID_MONEY_VALUE", 500);
}

function parseBigIntPoisha(value: unknown): bigint {
  if (typeof value === "bigint") {
    if (value < 0n) throw new AppError("Negative poisha value.", "INVALID_MONEY_VALUE", 500);
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < 0) {
      throw new AppError("Non-integer poisha value.", "INVALID_MONEY_VALUE", 500);
    }
    return BigInt(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return BigInt(value.trim());
  }
  throw new AppError("Malformed poisha integer.", "INVALID_MONEY_VALUE", 500);
}

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export function generateSecureEnrollmentReference(): string {
  let seg1 = "";
  let seg2 = "";
  for (let i = 0; i < 4; i++) {
    seg1 += CROCKFORD_ALPHABET[crypto.randomInt(0, CROCKFORD_ALPHABET.length)];
    seg2 += CROCKFORD_ALPHABET[crypto.randomInt(0, CROCKFORD_ALPHABET.length)];
  }
  return `LNA-${seg1}-${seg2}`;
}

export function signEnrollmentOutcomeToken(
  publicRef: string,
  enrollmentId: string,
  payment?: { paymentAttemptId: string; paymentOutcome: EnrollmentOutcomeType }
): string {
  return signHmacToken<EnrollmentOutcomeTokenPayload>(
    {
      publicRef: normalizeApplicationRef(publicRef),
      enrollmentId,
      scope: "enrollment_outcome",
      ...payment,
    },
    3600
  );
}

export function verifyEnrollmentOutcomeToken(
  token: string | null | undefined,
  expectedRef?: string
): Pick<
  EnrollmentOutcomeTokenPayload,
  "publicRef" | "enrollmentId" | "paymentAttemptId" | "paymentOutcome"
> | null {
  if (!token) return null;
  const parsed = verifyHmacToken<EnrollmentOutcomeTokenPayload>(token);
  if (
    !parsed ||
    parsed.scope !== "enrollment_outcome" ||
    !parsed.publicRef ||
    !parsed.enrollmentId
  ) {
    return null;
  }
  if (
    expectedRef &&
    normalizeApplicationRef(expectedRef) !== normalizeApplicationRef(parsed.publicRef)
  ) {
    return null;
  }
  return {
    publicRef: normalizeApplicationRef(parsed.publicRef),
    enrollmentId: parsed.enrollmentId,
    ...(parsed.paymentAttemptId
      ? {
          paymentAttemptId: parsed.paymentAttemptId,
          paymentOutcome: parsed.paymentOutcome,
        }
      : {}),
  };
}

/**
 * Loads published non-archived courses and batches directly from PostgreSQL (Supabase),
 * returning live remaining-seat totals via count_batch_active_seats(uuid).
 */
export async function getPublicCatalogFromSupabase(
  adminOverride?: SupabaseClient
): Promise<{ courses: PublicCatalogCourse[]; batches: PublicCatalogBatch[] }> {
  if (!adminOverride && !hasConfiguredSupabaseServerEnv()) {
    return { courses: [], batches: [] };
  }

  const admin = adminOverride ?? createSupabaseAdminClient();

  const [coursesRes, courseMentorsRes, batchesRes] = await Promise.all([
    admin
      .from("courses")
      .select(
        "id, slug, title, subtitle, category, summary, description, learning_outcomes, target_audience, prerequisites, modules, delivery_mode, venue, status, featured, provenance"
      )
      .eq("status", "published")
      .is("archived_at", null)
      .order("featured", { ascending: false }),
    admin
      .from("course_mentors")
      .select("course_id, display_order, mentors(slug)")
      .order("display_order", { ascending: true }),
    admin
      .from("batches")
      .select(
        "id, course_id, slug, batch_number, name, start_date, end_date, schedule_description, capacity, historical_enrolled_count, seat_hold_duration_minutes, fee_poisha, discount_fee_poisha, status, venue, enrollment_opens_at, enrollment_closes_at, provenance"
      )
      .in("status", ["upcoming", "open_for_enrollment", "in_progress", "completed"])
      .is("archived_at", null)
      .order("batch_number", { ascending: true }),
  ]);

  if (coursesRes.error || batchesRes.error) {
    throw new AppError(
      "Unable to load public course catalog from database.",
      "CATALOG_LOAD_FAILED",
      503
    );
  }

  const mentorMap = new Map<string, string[]>();
  for (const row of courseMentorsRes.data ?? []) {
    const mentorRel = unwrapRelation(row.mentors as { slug?: string } | { slug?: string }[] | null);
    if (!mentorRel?.slug) continue;
    const list = mentorMap.get(row.course_id as string) ?? [];
    list.push(mentorRel.slug);
    mentorMap.set(row.course_id as string, list);
  }

  const courseSlugByUuid = new Map<string, string>();
  const courses: PublicCatalogCourse[] = (coursesRes.data ?? []).map((row) => {
    const slug = String(row.slug);
    courseSlugByUuid.set(String(row.id), slug);
    return {
      id: slug,
      title: String(row.title),
      subtitle: String(row.subtitle),
      category: String(row.category),
      summary: String(row.summary),
      description: String(row.description),
      learningOutcomes: Array.isArray(row.learning_outcomes)
        ? (row.learning_outcomes as string[])
        : [],
      targetAudience: Array.isArray(row.target_audience) ? (row.target_audience as string[]) : [],
      prerequisites: Array.isArray(row.prerequisites) ? (row.prerequisites as string[]) : [],
      modules: Array.isArray(row.modules) ? (row.modules as PublicCatalogCourse["modules"]) : [],
      deliveryMode: "offline",
      venue: String(row.venue),
      status: row.status as PublicCatalogCourse["status"],
      featured: Boolean(row.featured),
      mentorIds: mentorMap.get(String(row.id)) ?? [],
      provenance: row.provenance as PublicCatalogCourse["provenance"],
    };
  });

  const nowMs = Date.now();
  const batches: PublicCatalogBatch[] = [];

  for (const row of batchesRes.data ?? []) {
    const courseSlug = courseSlugByUuid.get(String(row.course_id));
    if (!courseSlug) continue;

    let activeSeats = 0;
    if (row.status === "open_for_enrollment") {
      const seatCountRes = await admin.rpc("count_batch_active_seats", {
        p_batch_id: row.id,
      });
      if (!seatCountRes.error && seatCountRes.data !== null) {
        activeSeats = parseSafeIntegerPoisha(seatCountRes.data);
      }
    }

    const capacity = parseSafeIntegerPoisha(row.capacity);
    const historicalCount = parseSafeIntegerPoisha(row.historical_enrolled_count ?? 0);
    const totalOccupied = Math.min(capacity, historicalCount + activeSeats);

    let effectiveStatus = row.status as PublicCatalogBatch["status"];
    if (effectiveStatus === "open_for_enrollment") {
      if (row.enrollment_opens_at && new Date(String(row.enrollment_opens_at)).getTime() > nowMs) {
        effectiveStatus = "upcoming";
      } else if (
        row.enrollment_closes_at &&
        new Date(String(row.enrollment_closes_at)).getTime() < nowMs
      ) {
        effectiveStatus = "in_progress";
      }
    }

    batches.push({
      id: String(row.slug),
      courseId: courseSlug,
      batchNumber: parseSafeIntegerPoisha(row.batch_number),
      name: String(row.name),
      startDate: String(row.start_date),
      endDate: String(row.end_date),
      scheduleDescription: String(row.schedule_description),
      capacity,
      enrolledCount: totalOccupied,
      seatHoldDurationMinutes: 30,
      feePoisha: parseSafeIntegerPoisha(row.fee_poisha),
      ...(row.discount_fee_poisha !== null && row.discount_fee_poisha !== undefined
        ? { discountFeePoisha: parseSafeIntegerPoisha(row.discount_fee_poisha) }
        : {}),
      ...(typeof row.enrollment_closes_at === "string"
        ? { enrollmentClosesAt: row.enrollment_closes_at }
        : {}),
      status: effectiveStatus,
      venue: String(row.venue),
      provenance: row.provenance as PublicCatalogBatch["provenance"],
    });
  }

  return { courses, batches };
}

/**
 * Validates and persists an enrollment application BEFORE calling hosted bKash Checkout.
 * Computes base fee, discount, and payable poisha exclusively inside start_enrollment() on Postgres.
 */
function validateEnrollmentSubmission(
  rawInput: unknown,
  programQuestionsSnapshot: ProgramQuestion[]
) {
  const parsed = startEnrollmentPayloadSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    throw new AppError(
      firstIssue?.message ?? "Please verify your enrollment details.",
      "VALIDATION_ERROR",
      400
    );
  }

  const cleanPhone = normalizeBdPhone(parsed.data.whatsapp);
  if (!isValidBdPhone(cleanPhone)) {
    throw new AppError(
      "Please enter a valid 11-digit Bangladeshi mobile number.",
      "INVALID_PHONE",
      400
    );
  }

  const cleanEmail = normalizeEmail(parsed.data.email);
  const normalizedAnswers: Record<string, string> = {};
  for (const question of programQuestionsSnapshot) {
    const rawAns = String(parsed.data.answers[question.id] ?? "").trim();
    if (question.required && !rawAns) {
      throw new AppError(`Please answer: ${question.label}`, "MISSING_PROGRAM_ANSWER", 400);
    }
    if (question.type === "select" && rawAns && question.options?.length) {
      if (!question.options.includes(rawAns)) {
        throw new AppError(
          `Invalid selection for question: ${question.label}`,
          "INVALID_PROGRAM_ANSWER",
          400
        );
      }
    }
    if (rawAns) {
      normalizedAnswers[question.id] = rawAns;
    }
  }

  return {
    p_course_slug: parsed.data.courseId,
    p_batch_slug: parsed.data.batchId,
    p_full_name: parsed.data.fullName,
    p_email: cleanEmail,
    p_phone: cleanPhone,
    p_answers: normalizedAnswers,
    p_program_questions_snapshot: programQuestionsSnapshot,
  };
}

const manualEnrollmentErrors: Record<string, { message: string; status: number }> = {
  BATCH_NOT_FOUND: { message: "Selected batch could not be found.", status: 404 },
  BATCH_CLOSED: { message: "Enrollment is no longer open for this batch.", status: 409 },
  BATCH_FULL: { message: "No seats remain available for this batch.", status: 409 },
  DUPLICATE_ENROLLMENT: {
    message: "An active application already uses this email or phone number in the selected batch.",
    status: 409,
  },
  DUPLICATE_PAYMENT_REFERENCE: {
    message:
      "This Transaction ID is already on file. Check the ID on your bKash receipt or contact Admissions.",
    status: 409,
  },
  TRANSACTION_ID_REQUIRED: { message: bkashTransactionIdError, status: 400 },
  TRANSACTION_ID_UNEXPECTED: {
    message:
      "This batch currently has no fee. If you already paid, contact Admissions with your receipt.",
    status: 409,
  },
};

export async function submitManualBkashEnrollment(
  rawInput: unknown,
  options: {
    programQuestionsSnapshot: ProgramQuestion[];
    adminOverride?: SupabaseClient;
    emailSenderOverride?: OutboxEmailSender;
  }
): Promise<StartEnrollmentCheckoutResult> {
  const enrollment = validateEnrollmentSubmission(rawInput, options.programQuestionsSnapshot);
  const transaction = z
    .object({ transactionId: z.string().max(64).optional() })
    .safeParse(rawInput);
  if (!transaction.success) {
    throw new AppError(bkashTransactionIdError, "INVALID_TRANSACTION_ID", 400);
  }
  const transactionId = normalizeBkashTransactionId(transaction.data.transactionId ?? "");
  if (transactionId && !bkashTransactionIdPattern.test(transactionId)) {
    throw new AppError(bkashTransactionIdError, "INVALID_TRANSACTION_ID", 400);
  }

  const admin = options.adminOverride ?? createSupabaseAdminClient();
  const { data: rawResult, error } = await admin.rpc("submit_public_manual_enrollment", {
    ...enrollment,
    p_public_ref: generateSecureEnrollmentReference(),
    p_trx_id: transactionId || null,
  });

  const parsed = z
    .discriminatedUnion("ok", [
      z.object({ ok: z.literal(false), code: z.string() }),
      z.object({
        ok: z.literal(true),
        enrollment_id: z.string().uuid(),
        public_ref: z.string().regex(CROCKFORD_REF_REGEX),
        is_free: z.boolean(),
        status: z.enum(["application_in_process", "confirmed"]),
        outbox_id: z.string().uuid().nullish(),
      }),
    ])
    .safeParse(rawResult);

  const code = isDuplicateEnrollmentContact(error)
    ? "DUPLICATE_ENROLLMENT"
    : !error && parsed.success && !parsed.data.ok
      ? parsed.data.code
      : null;
  if (code && Object.hasOwn(manualEnrollmentErrors, code)) {
    const { message, status } = manualEnrollmentErrors[code];
    throw new AppError(message, code, status);
  }
  if (error || !parsed.success || !parsed.data.ok) {
    throw new AppError(
      "Unable to save your application right now. Keep your bKash receipt and try again.",
      "ENROLLMENT_SAVE_FAILED",
      503
    );
  }

  const saved = parsed.data;
  if (saved.outbox_id) {
    await dispatchEmailOutboxById(saved.outbox_id, {
      senderOverride: options.emailSenderOverride,
      adminOverride: options.adminOverride,
    }).catch(() => null);
  }

  return {
    isFree: saved.is_free,
    applicationReference: saved.public_ref,
    status: saved.status === "confirmed" ? "confirmed" : "pending",
    outcomeToken: signEnrollmentOutcomeToken(saved.public_ref, saved.enrollment_id),
  };
}

export async function startEnrollmentCheckout(
  rawInput: unknown,
  options: {
    origin: string;
    programQuestionsSnapshot: ProgramQuestion[];
    adminOverride?: SupabaseClient;
    gatewayOverride?: PaymentGatewayClient;
    emailSenderOverride?: OutboxEmailSender;
    checkoutModeOverride?: "closed" | "mock" | "live";
  }
): Promise<StartEnrollmentCheckoutResult> {
  const mode = options.checkoutModeOverride ?? getEnrollmentRuntimeConfig().checkoutMode;
  if (mode === "closed") {
    throw new AppError("Online enrollment checkout is currently closed.", "CHECKOUT_CLOSED", 503);
  }

  const enrollment = validateEnrollmentSubmission(rawInput, options.programQuestionsSnapshot);

  const admin = options.adminOverride ?? createSupabaseAdminClient();
  const publicRef = generateSecureEnrollmentReference();

  const { data: rpcRaw, error: rpcError } = await admin.rpc("start_enrollment", {
    p_public_ref: publicRef,
    ...enrollment,
  });

  if (isDuplicateEnrollmentContact(rpcError)) {
    throw new AppError(
      "An active application or confirmed enrollment already uses this email or phone number in the selected batch.",
      "DUPLICATE_ENROLLMENT",
      409
    );
  }
  if (rpcError || !rpcRaw || typeof rpcRaw !== "object") {
    throw new AppError(
      "Unable to save your application right now. Please try again.",
      "ENROLLMENT_SAVE_FAILED",
      503
    );
  }

  const rpc = rpcRaw as Record<string, unknown>;
  if (rpc.ok !== true) {
    const errCode = String(rpc.code ?? "ENROLLMENT_REJECTED");
    if (errCode === "BATCH_NOT_FOUND") {
      throw new AppError("Selected batch could not be found.", "BATCH_NOT_FOUND", 404);
    }
    if (errCode === "BATCH_CLOSED") {
      throw new AppError("Enrollment is not currently open for this batch.", "BATCH_CLOSED", 409);
    }
    if (errCode === "BATCH_FULL") {
      throw new AppError("No seats remain available in this batch right now.", "BATCH_FULL", 409);
    }
    if (errCode === "DUPLICATE_ENROLLMENT") {
      throw new AppError(
        "An active application or confirmed enrollment already exists for this email address in the selected batch.",
        "DUPLICATE_ENROLLMENT",
        409
      );
    }
    throw new AppError("Unable to start enrollment.", errCode, 400);
  }

  const savedRef = String(rpc.public_ref);
  const enrollmentId = String(rpc.enrollment_id);
  const outcomeToken = signEnrollmentOutcomeToken(savedRef, enrollmentId);

  if (rpc.is_free === true) {
    const outboxId = rpc.outbox_id ? String(rpc.outbox_id) : null;
    if (outboxId) {
      // NFR-AVL-01: Outbox persistence guarantees confirmation; provider blip never blocks registration
      await dispatchEmailOutboxById(outboxId, {
        senderOverride: options.emailSenderOverride,
        adminOverride: options.adminOverride,
      }).catch(() => null);
    }

    return {
      isFree: true,
      applicationReference: savedRef,
      status: "confirmed",
      outcomeToken,
    };
  }

  const attemptId = String(rpc.attempt_id);
  const tranId = String(rpc.tran_id);
  const amountPoisha = parseBigIntPoisha(rpc.amount_poisha);
  const holdExpiresAt = rpc.hold_expires_at ? String(rpc.hold_expires_at) : null;
  const cleanOrigin = options.origin.replace(/\/+$/, "");

  const gateway = options.gatewayOverride ?? getPaymentGatewayClient(cleanOrigin);
  let createdPaymentId: string | null = null;
  try {
    const init = await gateway.initiateCheckout({
      attemptId,
      tranId,
      amountPoisha,
      currency: "BDT",
      payerReference: savedRef,
      callbackUrl: `${cleanOrigin}/api/payments/bkash/callback`,
    });
    createdPaymentId = init.paymentId;

    const { error: persistAttemptError } = await admin
      .from("payment_attempts")
      .update({
        payment_id: init.paymentId,
        status: "pending",
        ...(init.callbackSignature
          ? {
              bkash_callback_signature_hash: hashBkashCallbackSignature(init.callbackSignature),
              bkash_sandbox_v2: init.sandboxV2 === true,
            }
          : {}),
      })
      .eq("id", attemptId);
    if (persistAttemptError) {
      throw new AppError(
        "Unable to save bKash session reference. Please retry your payment.",
        "PAYMENT_SESSION_SAVE_FAILED",
        503
      );
    }

    return {
      isFree: false,
      applicationReference: savedRef,
      status: "pending",
      checkoutUrl: init.redirectUrl,
      holdExpiresAt,
      outcomeToken,
    };
  } catch (err) {
    try {
      await admin.rpc("record_payment_outcome", {
        p_attempt_id: attemptId,
        p_next_status: "failed",
        p_payment_id: createdPaymentId,
        p_failure_reason: "BKASH_CREATE_FAILED",
        p_gateway_status_code: "CREATE_ERROR",
        p_gateway_status_message: "Unable to initiate bKash checkout session",
      });
    } catch {
      // Ignore rollback logging error so primary checkout failure surfaces cleanly
    }

    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError(
      "Unable to reach bKash checkout right now. Your application and seat hold remain saved for retry.",
      "BKASH_CREATE_FAILED",
      502
    );
  }
}

/**
 * Initiates a fresh bKash attempt for an existing unexpired pending hold after cancel/failure (AT-02).
 * Protected by HMAC outcome token ownership proof (Rule R8 requireOwnership).
 */
export async function retryEnrollmentCheckout(
  rawInput: unknown,
  options: {
    origin: string;
    adminOverride?: SupabaseClient;
    gatewayOverride?: PaymentGatewayClient;
    checkoutModeOverride?: "closed" | "mock" | "live";
  }
): Promise<RetryEnrollmentCheckoutResult> {
  const mode = options.checkoutModeOverride ?? getEnrollmentRuntimeConfig().checkoutMode;
  if (mode === "closed") {
    throw new AppError("Online enrollment checkout is currently closed.", "CHECKOUT_CLOSED", 503);
  }

  const parsed = retryEnrollmentPayloadSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("Invalid retry request.", "VALIDATION_ERROR", 400);
  }

  const verified = verifyEnrollmentOutcomeToken(
    parsed.data.outcomeToken,
    parsed.data.applicationReference
  );
  if (!verified) {
    throw new AppError(
      "Session token expired or invalid. Please submit a new enrollment if needed.",
      "INVALID_OWNERSHIP_TOKEN",
      403
    );
  }

  const admin = options.adminOverride ?? createSupabaseAdminClient();
  const { data: rpcRaw, error: rpcError } = await admin.rpc("retry_enrollment_payment", {
    p_public_ref: verified.publicRef,
  });

  if (rpcError || !rpcRaw || typeof rpcRaw !== "object") {
    throw new AppError("Unable to retry payment right now.", "RETRY_FAILED", 503);
  }

  const rpc = rpcRaw as Record<string, unknown>;
  if (rpc.ok !== true) {
    const code = String(rpc.code ?? "NOT_RETRYABLE");
    if (code === "HOLD_EXPIRED") {
      throw new AppError(
        "Your 30-minute seat hold has expired. Please start a new application if seats remain open.",
        "HOLD_EXPIRED",
        410
      );
    }
    if (code === "ALREADY_CONFIRMED") {
      throw new AppError("This enrollment is already confirmed.", "ALREADY_CONFIRMED", 409);
    }
    throw new AppError("This application cannot retry payment right now.", code, 409);
  }

  const attemptId = String(rpc.attempt_id);
  const tranId = String(rpc.tran_id);
  const amountPoisha = parseBigIntPoisha(rpc.amount_poisha);
  const holdExpiresAt = rpc.hold_expires_at ? String(rpc.hold_expires_at) : null;
  const cleanOrigin = options.origin.replace(/\/+$/, "");

  const gateway = options.gatewayOverride ?? getPaymentGatewayClient(cleanOrigin);
  let createdPaymentId: string | null = null;
  try {
    const init = await gateway.initiateCheckout({
      attemptId,
      tranId,
      amountPoisha,
      currency: "BDT",
      payerReference: verified.publicRef,
      callbackUrl: `${cleanOrigin}/api/payments/bkash/callback`,
    });
    createdPaymentId = init.paymentId;

    const { error: persistAttemptError } = await admin
      .from("payment_attempts")
      .update({
        payment_id: init.paymentId,
        status: "pending",
        ...(init.callbackSignature
          ? {
              bkash_callback_signature_hash: hashBkashCallbackSignature(init.callbackSignature),
              bkash_sandbox_v2: init.sandboxV2 === true,
            }
          : {}),
      })
      .eq("id", attemptId);
    if (persistAttemptError) {
      throw new AppError(
        "Unable to save bKash session reference. Please retry your payment.",
        "PAYMENT_SESSION_SAVE_FAILED",
        503
      );
    }

    const freshToken = signEnrollmentOutcomeToken(verified.publicRef, String(rpc.enrollment_id));

    return {
      applicationReference: verified.publicRef,
      checkoutUrl: init.redirectUrl,
      holdExpiresAt,
      outcomeToken: freshToken,
    };
  } catch (err) {
    try {
      await admin.rpc("record_payment_outcome", {
        p_attempt_id: attemptId,
        p_next_status: "failed",
        p_payment_id: createdPaymentId,
        p_failure_reason: "BKASH_RETRY_CREATE_FAILED",
        p_gateway_status_code: "CREATE_ERROR",
        p_gateway_status_message: "Unable to initiate retry bKash checkout",
      });
    } catch {
      // Ignore rollback logging error so retry error surfaces cleanly
    }

    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Unable to reach bKash checkout right now.", "BKASH_CREATE_FAILED", 502);
  }
}

/**
 * Authoritative bKash callback processor implementing Rule 10 §2 (T1, T2, T3, FR-PAY-005..009):
 * 1. Saves redacted callback payload in append-only payment_events.
 * 2. Resolves payment_attempts + enforces idempotent terminal checks.
 * 3. Cancel/failure browser redirects NEVER release 30-min seat holds.
 * 4. Success redirects MUST perform server-to-server executePayment + queryPaymentStatus.
 * 5. Any invoice, amount poisha, or BDT currency mismatch quarantines to review_hold.
 * 6. Confirms strictly via confirm_payment() RPC and triggers decoupled outbox email once.
 */
export async function processBkashCallback(
  params: {
    paymentID?: string | null;
    status?: string | null;
    merchantInvoiceNumber?: string | null;
    tranId?: string | null;
    mockSig?: string | null;
    signature?: string | null;
    rawParams?: Record<string, unknown>;
  },
  options: {
    origin: string;
    adminOverride?: SupabaseClient;
    gatewayOverride?: PaymentGatewayClient;
    emailSenderOverride?: OutboxEmailSender;
  }
): Promise<BkashCallbackProcessResult> {
  const admin = options.adminOverride ?? createSupabaseAdminClient();
  const cleanOrigin = options.origin.replace(/\/+$/, "");
  const paymentId = params.paymentID?.trim() || null;
  const statusParam = (params.status ?? "").trim().toLowerCase();

  const invalidResult: BkashCallbackProcessResult = {
    outcome: "invalid",
    redirectUrl: `${cleanOrigin}/enroll?outcome=invalid`,
  };
  if (
    !paymentId ||
    paymentId.length > 128 ||
    !["success", "cancel", "failure"].includes(statusParam)
  ) {
    return invalidResult;
  }

  const { data: attempt, error: attemptError } = await admin
    .from("payment_attempts")
    .select(
      "id, enrollment_id, tran_id, payment_id, amount_poisha, currency, status, bkash_callback_signature_hash"
    )
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (attemptError) {
    throw new AppError("Unable to look up the bKash payment.", "BKASH_CALLBACK_LOOKUP_FAILED", 503);
  }
  if (!attempt) return invalidResult;

  const verifiedScenario = verifyMockScenarioToken(params.mockSig, paymentId);
  const checkoutMode = getEnrollmentRuntimeConfig().checkoutMode;
  if (attempt.bkash_callback_signature_hash) {
    if (!matchesBkashCallbackSignature(attempt.bkash_callback_signature_hash, params.signature)) {
      return invalidResult;
    }
  } else if (
    !options.gatewayOverride &&
    (checkoutMode === "closed" ||
      (checkoutMode === "mock" && !verifiedScenario) ||
      (checkoutMode === "live" && parseCurrentServerEnv().BKASH_API_VERSION === "v2"))
  ) {
    return invalidResult;
  }

  await admin.from("payment_events").insert({
    payment_attempt_id: attempt.id,
    tran_id: attempt.tran_id,
    payment_id: paymentId,
    source: verifiedScenario ? "mock_callback" : "callback",
    event_status: statusParam,
    redacted_payload: redactBkashPayload(params.rawParams ?? { paymentId, status: statusParam }),
  });

  const { data: enrollmentRow } = await admin
    .from("enrollments")
    .select("id, public_ref, status")
    .eq("id", attempt.enrollment_id)
    .maybeSingle();

  if (!enrollmentRow) {
    return {
      outcome: "invalid",
      redirectUrl: `${cleanOrigin}/enroll?outcome=invalid`,
    };
  }

  const publicRef = String(enrollmentRow.public_ref);
  const enrollmentId = String(enrollmentRow.id);
  const buildRedirect = (outcome: EnrollmentOutcomeType): string => {
    const token = signEnrollmentOutcomeToken(publicRef, enrollmentId, {
      paymentAttemptId: String(attempt.id),
      paymentOutcome: outcome,
    });
    const search = new URLSearchParams({ outcome, ref: publicRef, token });
    return `${cleanOrigin}/enroll?${search}`;
  };

  // 1. Strict Idempotency Guards (FR-PAY-006, AT-03)
  if (attempt.status === "validated" || enrollmentRow.status === "confirmed") {
    return {
      outcome: "confirmed",
      alreadyProcessed: true,
      applicationReference: publicRef,
      redirectUrl: buildRedirect("confirmed"),
    };
  }

  if (attempt.status === "review_hold" || enrollmentRow.status === "review_hold") {
    return {
      outcome: "review_hold",
      alreadyProcessed: true,
      applicationReference: publicRef,
      redirectUrl: buildRedirect("review_hold"),
    };
  }

  if (attempt.status === "failed" || attempt.status === "cancelled") {
    const existingOutcome: EnrollmentOutcomeType =
      attempt.status === "cancelled" ? "cancelled" : "failed";
    return {
      outcome: existingOutcome,
      alreadyProcessed: true,
      applicationReference: publicRef,
      redirectUrl: buildRedirect(existingOutcome),
    };
  }

  const result = (outcome: EnrollmentOutcomeType): BkashCallbackProcessResult => ({
    outcome,
    applicationReference: publicRef,
    redirectUrl: buildRedirect(outcome),
  });

  // Only one callback may move a gateway attempt forward. A replay never sends
  // Execute twice, including while the first request is in flight.
  const gateway =
    statusParam === "success"
      ? (options.gatewayOverride ?? getPaymentGatewayClient(cleanOrigin))
      : null;
  const shouldClaim = checkoutMode === "live" || Boolean(attempt.bkash_callback_signature_hash);
  if (shouldClaim) {
    if (checkoutMode === "closed" && !options.gatewayOverride) return result("pending");
    const { data: claimed, error } = await admin
      .from("payment_attempts")
      .update({
        failure_reason: statusParam === "success" ? "EXECUTE_STARTED" : "CALLBACK_STARTED",
        bkash_execute_claimed: statusParam === "success",
      })
      .eq("id", attempt.id)
      .eq("payment_id", paymentId)
      .in("status", ["initiated", "pending"])
      .is("failure_reason", null)
      .select("id")
      .maybeSingle();
    if (error?.code === "23505") return result("pending");
    if (error) {
      throw new AppError("Unable to claim bKash callback.", "BKASH_CALLBACK_CLAIM_FAILED", 503);
    }
    if (!claimed) return result("pending");
  }

  const recordOutcome = async (
    nextStatus: "cancelled" | "failed" | "pending" | "review_hold",
    reason: string,
    code: string,
    message: string
  ) => {
    const { error } = await admin.rpc("record_payment_outcome", {
      p_attempt_id: attempt.id,
      p_next_status: nextStatus,
      p_payment_id: paymentId,
      p_failure_reason: reason,
      p_gateway_status_code: code,
      p_gateway_status_message: message,
    });
    if (error)
      throw new AppError("Unable to save payment outcome.", "BKASH_OUTCOME_SAVE_FAILED", 503);
    return result(nextStatus);
  };

  if (statusParam === "cancel") {
    return recordOutcome("cancelled", "USER_CANCELLED", "CANCEL", "bKash checkout was cancelled.");
  }
  if (statusParam === "failure") {
    return recordOutcome(
      "failed",
      "GATEWAY_FAILURE",
      "FAILURE",
      "bKash checkout did not complete."
    );
  }

  const expectedPoisha = parseBigIntPoisha(attempt.amount_poisha);
  const mockContext = {
    tranId: String(attempt.tran_id),
    amountPoisha: expectedPoisha,
    ...(verifiedScenario ? { scenario: verifiedScenario } : {}),
  };
  if (!gateway) return invalidResult;
  let execRes: Awaited<ReturnType<typeof gateway.executePayment>>;
  try {
    execRes = await gateway.executePayment(paymentId, mockContext);
  } catch (error) {
    // A failed token lookup never sent Execute, so a later callback can retry.
    if (shouldClaim && error instanceof BkashRequestNotSentError) {
      await admin
        .from("payment_attempts")
        .update({ failure_reason: null, bkash_execute_claimed: false })
        .eq("id", attempt.id)
        .eq("failure_reason", "EXECUTE_STARTED");
    }
    throw error;
  }

  const recordGatewayResponse = (
    source: "execute" | "query_status",
    response: {
      transactionStatus: string;
      rawRedacted: Record<string, unknown>;
    }
  ) =>
    admin.from("payment_events").insert({
      payment_attempt_id: attempt.id,
      tran_id: attempt.tran_id,
      payment_id: paymentId,
      source,
      event_status: response.transactionStatus,
      redacted_payload: response.rawRedacted,
    });

  await recordGatewayResponse("execute", execRes);

  let verified: typeof execRes | PaymentStatusResult = execRes;
  if (execRes.outcome === "pending" && execRes.statusCode === "TIMEOUT") {
    // Record the missing Execute response before using the fallback so that
    // background reconciliation can recover this payment if Query also times out.
    const pending = await recordOutcome(
      "pending",
      EXECUTE_NO_RESPONSE,
      execRes.statusCode,
      execRes.statusMessage
    );
    try {
      verified = await gateway.queryPaymentStatus(paymentId, mockContext);
    } catch {
      return pending;
    }
    await recordGatewayResponse("query_status", verified);

    if (
      ["Failed", "Cancelled"].includes(verified.transactionStatus) &&
      verified.paymentId === paymentId
    ) {
      return recordOutcome(
        "failed",
        "GATEWAY_DECLINED",
        verified.statusCode,
        verified.statusMessage
      );
    }
    if (verified.transactionStatus !== "Completed") return pending;
  } else if (execRes.outcome !== "completed" || execRes.transactionStatus !== "Completed") {
    return recordOutcome("failed", "GATEWAY_DECLINED", execRes.statusCode, execRes.statusMessage);
  }

  const trxId = verified.trxId?.trim();
  const currency = verified.currency?.trim().toUpperCase();
  const mismatch =
    verified.paymentId !== paymentId
      ? "PAYMENT_ID_MISMATCH"
      : verified.merchantInvoiceNumber !== attempt.tran_id
        ? "INVOICE_MISMATCH"
        : !trxId
          ? "MISSING_TRX_ID"
          : null;
  if (mismatch) {
    const flagged = await recordOutcome(
      "review_hold",
      mismatch,
      verified.statusCode,
      "bKash returned mismatched payment references."
    );
    await admin.from("audit_events").insert({
      actor_role: "system",
      action: "payment_flagged_review_hold",
      target_entity: "payment_attempts",
      target_id: attempt.id,
      after_state: { reason: mismatch },
    });
    return flagged;
  }

  // The RPC makes amount, currency and duplicate transaction checks atomic
  // with the seat confirmation. A missing value is passed as a mismatch.
  const { data: confirmRaw, error: confirmError } = await admin.rpc("confirm_payment", {
    p_attempt_id: attempt.id,
    p_payment_id: paymentId,
    p_trx_id: trxId,
    p_verified_poisha: (verified.amountPoisha ?? 0n).toString(),
    p_currency: currency || "UNKNOWN",
    p_gateway_status_code: verified.statusCode === "0000" ? "0000" : "MISMATCH",
    p_gateway_status_message: verified.statusMessage || "Processed",
  });

  if (confirmError || !confirmRaw || typeof confirmRaw !== "object") {
    throw new AppError("Failed to confirm payment transaction.", "CONFIRM_PAYMENT_FAILED", 500);
  }

  const confirmRes = confirmRaw as Record<string, unknown>;
  const confirmStatus = String(confirmRes.status ?? "");

  if (confirmStatus === "validated" || confirmStatus === "already_validated") {
    const alreadyValidated = Boolean(confirmRes.already_validated);
    const outboxId = confirmRes.outbox_id ? String(confirmRes.outbox_id) : null;

    if (!alreadyValidated && outboxId) {
      // Decoupled confirmation email dispatch (NFR-AVL-01)
      await dispatchEmailOutboxById(outboxId, {
        senderOverride: options.emailSenderOverride,
        adminOverride: options.adminOverride,
      }).catch(() => null);
    }

    return {
      outcome: "confirmed",
      alreadyProcessed: alreadyValidated,
      applicationReference: publicRef,
      redirectUrl: buildRedirect("confirmed"),
    };
  }

  return {
    outcome: "review_hold",
    applicationReference: publicRef,
    redirectUrl: buildRedirect("review_hold"),
  };
}

/**
 * Loads sanitized non-PII return summary on /enroll?outcome=...&ref=...&token=...
 */
export async function getEnrollmentOutcomeSummaryByToken(
  outcomeParam: string | undefined,
  publicRefParam: string | undefined,
  tokenParam: string | undefined,
  adminOverride?: SupabaseClient
): Promise<EnrollmentOutcomeSummary | null> {
  if (!publicRefParam || !tokenParam) {
    return null;
  }

  const verified = verifyEnrollmentOutcomeToken(tokenParam, publicRefParam);
  if (!verified) {
    return null;
  }

  if (!adminOverride && !hasConfiguredSupabaseServerEnv()) {
    return null;
  }

  const admin = adminOverride ?? createSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("enrollments")
    .select(
      "id, public_ref, payable_poisha, payment_method, status, hold_expires_at, courses(title), batches!enrollments_batch_id_fkey(name)"
    )
    .eq("id", verified.enrollmentId)
    .eq("public_ref", verified.publicRef)
    .maybeSingle();

  if (error || !row) {
    return null;
  }

  const courseRel = unwrapRelation(row.courses as { title?: string } | { title?: string }[] | null);
  const batchRel = unwrapRelation(row.batches as { name?: string } | { name?: string }[] | null);

  let paymentErrorMessage: string | undefined;
  const requestedOutcome = verified.paymentOutcome ?? outcomeParam;
  let derivedOutcome: EnrollmentOutcomeType = "pending";
  const dbStatus = String(row.status);
  if (dbStatus === "confirmed") {
    derivedOutcome = "confirmed";
  } else if (dbStatus === "review_hold") {
    derivedOutcome = "review_hold";
  } else if (requestedOutcome === "cancelled") {
    derivedOutcome = "cancelled";
  } else if (requestedOutcome === "failed") {
    derivedOutcome = "failed";
  }

  if (derivedOutcome === "failed" && verified.paymentAttemptId) {
    const { data: failedAttempt } = await admin
      .from("payment_attempts")
      .select("gateway_status_message")
      .eq("enrollment_id", verified.enrollmentId)
      .eq("id", verified.paymentAttemptId)
      .eq("status", "failed")
      .maybeSingle();
    if (typeof failedAttempt?.gateway_status_message === "string") {
      paymentErrorMessage = failedAttempt.gateway_status_message.trim().slice(0, 300) || undefined;
    }
  }

  const holdExpiresAt = row.hold_expires_at ? String(row.hold_expires_at) : null;
  const holdValid = holdExpiresAt === null || new Date(holdExpiresAt).getTime() > Date.now();
  const canRetry =
    (derivedOutcome === "failed" || derivedOutcome === "cancelled") &&
    dbStatus === "pending" &&
    row.payment_method === "bkash" &&
    holdValid;

  return {
    outcome: derivedOutcome,
    applicationReference: String(row.public_ref),
    courseTitle: courseRel?.title ?? "Lead Nation Academy Program",
    batchName: batchRel?.name ?? "Cohort",
    payablePoisha: parseSafeIntegerPoisha(row.payable_poisha),
    paymentMethod: row.payment_method as EnrollmentOutcomeSummary["paymentMethod"],
    status: dbStatus,
    holdExpiresAt,
    canRetry,
    ...(paymentErrorMessage ? { paymentErrorMessage } : {}),
    outcomeToken: tokenParam,
  };
}

function mapDbStatusToPublicStatus(dbStatus: string): ApplicationStatusValue {
  switch (dbStatus) {
    case "confirmed":
      return "Enrollment confirmed";
    case "expired":
      return "Reservation expired";
    case "cancelled":
      return "Cancelled";
    default:
      return "Application in process";
  }
}

/**
 * Public status lookup requiring Crockford LNA Application ID + (email OR phone).
 * Returns uniform null when unknown or contact fails to match (anti-enumeration T14).
 */
export async function lookupEnrollmentStatus(
  query: StatusLookupQuery,
  adminOverride?: SupabaseClient
): Promise<SafeStatusLookupResult | null> {
  const normalizedRef = normalizeApplicationRef(query.applicationId);
  if (!CROCKFORD_REF_REGEX.test(normalizedRef)) {
    return null;
  }

  if (!adminOverride && !hasConfiguredSupabaseServerEnv()) {
    return null;
  }

  const admin = adminOverride ?? createSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("enrollments")
    .select(
      "public_ref, full_name, email, phone, answers, payment_method, status, courses(title), batches!enrollments_batch_id_fkey(name)"
    )
    .eq("public_ref", normalizedRef)
    .maybeSingle();

  if (error || !row) {
    return null;
  }

  const matches =
    query.verificationType === "email"
      ? normalizeEmail(String(row.email)) === normalizeEmail(query.contactValue)
      : normalizeBdPhone(String(row.phone)) === normalizeBdPhone(query.contactValue);

  if (!matches) {
    return null;
  }

  const courseRel = unwrapRelation(row.courses as { title?: string } | { title?: string }[] | null);
  const batchRel = unwrapRelation(row.batches as { name?: string } | { name?: string }[] | null);
  const answersObj =
    row.answers && typeof row.answers === "object" && !Array.isArray(row.answers)
      ? (row.answers as Record<string, unknown>)
      : {};
  const university = typeof answersObj.university === "string" ? answersObj.university : undefined;

  return projectSafeStatusResult({
    applicationReference: String(row.public_ref),
    fullName: String(row.full_name),
    university,
    courseTitle: courseRel?.title ?? "Lead Nation Academy Program",
    batchName: batchRel?.name ?? "Cohort",
    paymentMethod: row.payment_method as SafeStatusLookupResult["paymentMethod"],
    status: mapDbStatusToPublicStatus(String(row.status)),
  });
}

function sanitizePostgrestSearchTerm(input: string): string {
  return input
    .trim()
    .replace(/[^a-zA-Z0-9@._+\-\s]/g, "")
    .slice(0, 80);
}

function assertVerifiedSuperAdmin(staff: VerifiedStaffContext): void {
  if (staff.role !== "super_admin" || staff.accountState !== "active" || staff.aal !== "aal2") {
    throw new AppError("You do not have permission to access this resource.", "FORBIDDEN", 403);
  }
}

/**
 * Superadmin read-only enrollment listing with search, status filtering, and pagination.
 * Caller MUST already be verified by requireStaff("enrollments:read").
 */
export async function listAdminEnrollments(
  filters: {
    search?: string;
    status?: string;
    batchId?: string;
    courseId?: string;
    archived?: boolean;
    currentOnly?: boolean;
    page?: number;
    pageSize?: number;
  },
  staff: VerifiedStaffContext,
  adminOverride?: SupabaseClient
): Promise<AdminEnrollmentListResult> {
  assertVerifiedSuperAdmin(staff);

  const admin = adminOverride ?? createSupabaseAdminClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = admin
    .from("enrollments")
    .select(
      "id, public_ref, full_name, email, phone, payment_method, payment_status, status, payable_poisha, currency, hold_expires_at, confirmed_at, created_at, updated_at, archived_at, legacy_duplicate_phone, staff_payment_recorded_by, applicant_payment_submitted, submitted_payment_ref, is_dev_fixture, courses(slug, title), batches!enrollments_batch_id_fkey(slug, name)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .order("id")
    .range(from, to);

  query = filters.archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  if (filters.batchId) {
    const batchId = z.string().uuid().parse(filters.batchId);
    query = query.eq("batch_id", batchId);
  }

  if (filters.courseId) {
    const courseId = z.string().uuid().parse(filters.courseId);
    query = query.eq("course_id", courseId);
  }

  const status = admissionStatus.safeParse(filters.status);
  if (status.success) query = query.eq("status", status.data);
  else if (filters.currentOnly) query = query.not("status", "in", "(expired,cancelled)");

  const cleanSearch = sanitizePostgrestSearchTerm(filters.search ?? "");
  if (cleanSearch) {
    query = query.or(
      `public_ref.ilike.%${cleanSearch}%,full_name.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%`
    );
  }

  const { data, count, error } = await query;
  if (error) {
    console.error("[admin:enrollments] list query failed", {
      code: error.code ?? null,
    });
    throw new AppError("Failed to query enrollment records.", "ADMIN_LIST_FAILED", 503, {
      pgCode: error.code ?? null,
    });
  }

  const items: AdminEnrollmentListItem[] = (data ?? []).map((row) => {
    const courseRel = unwrapRelation(
      row.courses as { slug?: string; title?: string } | { slug?: string; title?: string }[] | null
    );
    const batchRel = unwrapRelation(
      row.batches as { slug?: string; name?: string } | { slug?: string; name?: string }[] | null
    );
    return {
      id: String(row.id),
      publicRef: String(row.public_ref),
      fullName: String(row.full_name),
      email: String(row.email),
      phone: String(row.phone),
      courseSlug: courseRel?.slug ?? "",
      courseTitle: courseRel?.title ?? "Program",
      batchSlug: batchRel?.slug ?? "",
      batchName: batchRel?.name ?? "Batch",
      paymentMethod: row.payment_method as AdminEnrollmentListItem["paymentMethod"],
      paymentStatus: String(row.payment_status),
      status: String(row.status),
      payablePoisha: parseSafeIntegerPoisha(row.payable_poisha),
      currency: String(row.currency),
      holdExpiresAt: row.hold_expires_at ? String(row.hold_expires_at) : null,
      confirmedAt: row.confirmed_at ? String(row.confirmed_at) : null,
      createdAt: String(row.created_at),
      isDevFixture: Boolean(row.is_dev_fixture),
      legacyDuplicatePhone: Boolean(row.legacy_duplicate_phone),
      archivedAt: row.archived_at ? String(row.archived_at) : null,
      updatedAt: String(row.updated_at),
      isStaffManualPayment: Boolean(row.staff_payment_recorded_by),
      isApplicantManualPayment: Boolean(row.applicant_payment_submitted),
      submittedPaymentRef:
        (row.staff_payment_recorded_by || row.applicant_payment_submitted) &&
        row.status === "application_in_process" &&
        !row.archived_at &&
        row.submitted_payment_ref
          ? String(row.submitted_payment_ref)
          : null,
    };
  });

  return {
    items,
    totalCount: count ?? items.length,
    page,
    pageSize,
  };
}

/**
 * Superadmin read-only enrollment detail including redacted payment timeline & email outbox.
 * Records an immutable audit_events view trace.
 */
export async function getAdminEnrollmentDetail(
  idOrRef: string,
  staff: VerifiedStaffContext,
  adminOverride?: SupabaseClient
): Promise<AdminEnrollmentDetailResult | null> {
  assertVerifiedSuperAdmin(staff);

  const admin = adminOverride ?? createSupabaseAdminClient();
  const trimmed = idOrRef.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
  const isRef = CROCKFORD_REF_REGEX.test(normalizeApplicationRef(trimmed));

  if (!isUuid && !isRef) {
    return null;
  }

  let query = admin
    .from("enrollments")
    .select(
      "id, public_ref, full_name, email, phone, answers, program_questions_snapshot, payment_method, payment_status, submitted_payment_ref, staff_payment_recorded_by, applicant_payment_submitted, archived_at, legacy_duplicate_phone, base_fee_poisha, discount_amount_poisha, payable_poisha, currency, status, hold_expires_at, verified_at, confirmed_at, verification_notes, is_dev_fixture, fixture_label, created_at, updated_at, courses(slug, title), batches!enrollments_batch_id_fkey(slug, name, start_date, venue)"
    );

  query = isUuid
    ? query.eq("id", trimmed)
    : query.eq("public_ref", normalizeApplicationRef(trimmed));

  const { data: row, error } = await query.maybeSingle();
  if (error) {
    console.error("[admin:enrollments] detail query failed", {
      code: error.code ?? null,
    });
    throw new AppError("Failed to query enrollment detail.", "ADMIN_DETAIL_FAILED", 503, {
      pgCode: error.code ?? null,
    });
  }
  if (!row) {
    return null;
  }

  const enrollmentId = String(row.id);

  const [attemptsRes, outboxRes] = await Promise.all([
    admin
      .from("payment_attempts")
      .select(
        "id, tran_id, payment_id, trx_id, amount_poisha, validated_amount_poisha, currency, status, gateway_status_code, gateway_status_message, failure_reason, executed_at, created_at"
      )
      .eq("enrollment_id", enrollmentId)
      .order("created_at", { ascending: false }),
    admin
      .from("email_outbox")
      .select(
        "id, template, recipient_email, status, provider_message_id, retry_count, last_error, sent_at, created_at"
      )
      .eq("enrollment_id", enrollmentId)
      .order("created_at", { ascending: false }),
  ]);

  const attemptIds = (attemptsRes.data ?? []).map((a) => String(a.id));
  let eventsData: AdminPaymentEventView[] = [];
  if (attemptIds.length > 0) {
    const eventsRes = await admin
      .from("payment_events")
      .select("id, payment_attempt_id, source, event_status, redacted_payload, received_at")
      .in("payment_attempt_id", attemptIds)
      .order("received_at", { ascending: false });

    eventsData = (eventsRes.data ?? []).map((ev) => ({
      id: String(ev.id),
      paymentAttemptId: ev.payment_attempt_id ? String(ev.payment_attempt_id) : null,
      source: String(ev.source),
      eventStatus: ev.event_status ? String(ev.event_status) : null,
      redactedPayload:
        ev.redacted_payload && typeof ev.redacted_payload === "object"
          ? (ev.redacted_payload as Record<string, unknown>)
          : {},
      receivedAt: String(ev.received_at),
    }));
  }

  try {
    await admin.from("audit_events").insert({
      actor_id: staff.userId,
      actor_role: staff.role,
      action: "admin_viewed_enrollment_detail",
      target_entity: "enrollments",
      target_id: enrollmentId,
      after_state: { public_ref: String(row.public_ref) },
    });
  } catch {
    // Non-fatal audit write blip should not hide read-only view
  }

  const courseRel = unwrapRelation(
    row.courses as { slug?: string; title?: string } | { slug?: string; title?: string }[] | null
  );
  const batchRel = unwrapRelation(
    row.batches as
      | { slug?: string; name?: string; start_date?: string; venue?: string }
      | { slug?: string; name?: string; start_date?: string; venue?: string }[]
      | null
  );

  const rawAnswers =
    row.answers && typeof row.answers === "object" && !Array.isArray(row.answers)
      ? (row.answers as Record<string, unknown>)
      : {};
  const cleanAnswers: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawAnswers)) {
    cleanAnswers[k] = typeof v === "string" ? v : String(v ?? "");
  }

  return {
    id: enrollmentId,
    publicRef: String(row.public_ref),
    fullName: String(row.full_name),
    email: String(row.email),
    phone: String(row.phone),
    courseSlug: courseRel?.slug ?? "",
    courseTitle: courseRel?.title ?? "Program",
    batchSlug: batchRel?.slug ?? "",
    batchName: batchRel?.name ?? "Batch",
    batchStartDate: batchRel?.start_date ?? "",
    batchVenue: batchRel?.venue ?? "",
    answers: cleanAnswers,
    programQuestionsSnapshot: Array.isArray(row.program_questions_snapshot)
      ? (row.program_questions_snapshot as ProgramQuestion[])
      : [],
    paymentMethod: row.payment_method as AdminEnrollmentDetailResult["paymentMethod"],
    paymentStatus: String(row.payment_status),
    submittedPaymentRef: row.submitted_payment_ref ? String(row.submitted_payment_ref) : null,
    isStaffManualPayment: Boolean(row.staff_payment_recorded_by),
    isApplicantManualPayment: Boolean(row.applicant_payment_submitted),
    legacyDuplicatePhone: Boolean(row.legacy_duplicate_phone),
    archivedAt: row.archived_at ? String(row.archived_at) : null,
    baseFeePoisha: parseSafeIntegerPoisha(row.base_fee_poisha),
    discountAmountPoisha: parseSafeIntegerPoisha(row.discount_amount_poisha),
    payablePoisha: parseSafeIntegerPoisha(row.payable_poisha),
    currency: String(row.currency),
    status: String(row.status),
    holdExpiresAt: row.hold_expires_at ? String(row.hold_expires_at) : null,
    verifiedAt: row.verified_at ? String(row.verified_at) : null,
    confirmedAt: row.confirmed_at ? String(row.confirmed_at) : null,
    verificationNotes: row.verification_notes ? String(row.verification_notes) : null,
    isDevFixture: Boolean(row.is_dev_fixture),
    fixtureLabel: row.fixture_label ? String(row.fixture_label) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    paymentAttempts: (attemptsRes.data ?? []).map((a) => ({
      id: String(a.id),
      tranId: String(a.tran_id),
      paymentId: a.payment_id ? String(a.payment_id) : null,
      trxId: a.trx_id ? String(a.trx_id) : null,
      amountPoisha: parseSafeIntegerPoisha(a.amount_poisha),
      validatedAmountPoisha:
        a.validated_amount_poisha !== null && a.validated_amount_poisha !== undefined
          ? parseSafeIntegerPoisha(a.validated_amount_poisha)
          : null,
      currency: String(a.currency),
      status: String(a.status),
      gatewayStatusCode: a.gateway_status_code ? String(a.gateway_status_code) : null,
      gatewayStatusMessage: a.gateway_status_message ? String(a.gateway_status_message) : null,
      failureReason: a.failure_reason ? String(a.failure_reason) : null,
      executedAt: a.executed_at ? String(a.executed_at) : null,
      createdAt: String(a.created_at),
    })),
    paymentEvents: eventsData,
    emailOutbox: (outboxRes.data ?? []).map((o) => ({
      id: String(o.id),
      template: String(o.template),
      recipientEmail: String(o.recipient_email),
      status: String(o.status),
      providerMessageId: o.provider_message_id ? String(o.provider_message_id) : null,
      retryCount: parseSafeIntegerPoisha(o.retry_count ?? 0),
      lastError: o.last_error ? String(o.last_error) : null,
      sentAt: o.sent_at ? String(o.sent_at) : null,
      createdAt: String(o.created_at),
    })),
  };
}

export interface ReconcilePendingBkashResult {
  checkoutMode: "closed" | "mock" | "live";
  skippedClosed?: boolean;
  checked: number;
  confirmed: number;
  failed: number;
  reviewHold: number;
  stillPending: number;
  skipped: number;
}

/**
 * Reconciles attempts after an observed missing Execute response. Other
 * initiated and pending attempts never use the gateway fallback query.
 */
export async function reconcilePendingBkashPayments(
  options: {
    publicRef?: string;
    maxAttempts?: number;
    minAgeSeconds?: number;
    staleInitiatedMinutes?: number;
    origin?: string;
    adminOverride?: SupabaseClient;
    gatewayOverride?: PaymentGatewayClient;
    emailSenderOverride?: OutboxEmailSender;
  } = {}
): Promise<ReconcilePendingBkashResult> {
  const runtimeMode = getEnrollmentRuntimeConfig().checkoutMode;
  if (runtimeMode === "closed" && !options.gatewayOverride) {
    return {
      checkoutMode: "closed",
      skippedClosed: true,
      checked: 0,
      confirmed: 0,
      failed: 0,
      reviewHold: 0,
      stillPending: 0,
      skipped: 0,
    };
  }

  const admin = options.adminOverride ?? createSupabaseAdminClient();
  let enrollmentIdFilter: string | null = null;

  if (options.publicRef) {
    const cleanRef = normalizeApplicationRef(options.publicRef);
    if (!CROCKFORD_REF_REGEX.test(cleanRef)) {
      throw new AppError("Invalid LNA Application ID format.", "VALIDATION_ERROR", 400);
    }
    const { data: targetRow, error: targetError } = await admin
      .from("enrollments")
      .select("id")
      .eq("public_ref", cleanRef)
      .maybeSingle();

    if (targetError) {
      throw new AppError("Failed to query enrollment for reconciliation.", "RECONCILE_FAILED", 503);
    }
    if (!targetRow) {
      throw new AppError("Enrollment not found.", "ENROLLMENT_NOT_FOUND", 404);
    }
    enrollmentIdFilter = String(targetRow.id);
  }

  const limit = Math.min(25, Math.max(1, options.maxAttempts ?? 15));
  const minAgeMs = Math.max(0, options.minAgeSeconds ?? (options.publicRef ? 0 : 60)) * 1000;
  const staleInitiatedMs = Math.max(1, options.staleInitiatedMinutes ?? 20) * 60 * 1000;

  let attemptsQuery = admin
    .from("payment_attempts")
    .select(
      "id, enrollment_id, tran_id, payment_id, trx_id, amount_poisha, currency, status, created_at, updated_at"
    )
    .eq("gateway", "bkash")
    .eq("failure_reason", EXECUTE_NO_RESPONSE)
    .in("status", ["initiated", "pending"])
    .not("payment_id", "is", null)
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (enrollmentIdFilter) {
    attemptsQuery = attemptsQuery.eq("enrollment_id", enrollmentIdFilter);
  }

  const { data: attemptRows, error: attemptsError } = await attemptsQuery;
  if (attemptsError) {
    throw new AppError("Failed to load pending bKash payment attempts.", "RECONCILE_FAILED", 503);
  }

  const rows = (attemptRows ?? []) as Array<{
    id: string;
    enrollment_id: string;
    tran_id: string;
    payment_id: string | null;
    trx_id: string | null;
    amount_poisha: number | string;
    currency: string;
    status: string;
    created_at: string;
    updated_at: string;
  }>;

  if (rows.length === 0) {
    return {
      checkoutMode: runtimeMode,
      checked: 0,
      confirmed: 0,
      failed: 0,
      reviewHold: 0,
      stillPending: 0,
      skipped: 0,
    };
  }

  const enrollmentIds = Array.from(new Set(rows.map((row) => String(row.enrollment_id))));
  const { data: enrollmentRows, error: enrollmentLookupError } = await admin
    .from("enrollments")
    .select("id, public_ref, status, hold_expires_at")
    .in("id", enrollmentIds);

  if (enrollmentLookupError) {
    throw new AppError(
      "Failed to load enrollment status for reconciliation.",
      "RECONCILE_FAILED",
      503
    );
  }

  const enrollmentMap = new Map<
    string,
    { id: string; public_ref: string; status: string; hold_expires_at: string | null }
  >();
  for (const er of (enrollmentRows ?? []) as Array<{
    id: string;
    public_ref: string;
    status: string;
    hold_expires_at: string | null;
  }>) {
    enrollmentMap.set(String(er.id), er);
  }

  const nowMs = Date.now();
  const eligibleRows = rows.filter((row) => {
    const enrollment = enrollmentMap.get(String(row.enrollment_id));
    if (!enrollment || enrollment.status === "review_hold") {
      return false;
    }
    const createdMs = new Date(row.updated_at ?? row.created_at).getTime();
    if (minAgeMs > 0 && Number.isFinite(createdMs) && nowMs - createdMs < minAgeMs) {
      return false;
    }
    return Boolean(row.payment_id && String(row.payment_id).trim().length > 0);
  });

  if (eligibleRows.length === 0) {
    return {
      checkoutMode: runtimeMode,
      checked: 0,
      confirmed: 0,
      failed: 0,
      reviewHold: 0,
      stillPending: 0,
      skipped: rows.length,
    };
  }

  const cleanOrigin = (options.origin ?? parseCurrentServerEnv().APP_URL).replace(/\/+$/, "");
  const gateway = options.gatewayOverride ?? getPaymentGatewayClient(cleanOrigin);

  const summary: ReconcilePendingBkashResult = {
    checkoutMode: runtimeMode,
    checked: 0,
    confirmed: 0,
    failed: 0,
    reviewHold: 0,
    stillPending: 0,
    skipped: rows.length - eligibleRows.length,
  };

  for (const attempt of eligibleRows) {
    const enrollment = enrollmentMap.get(String(attempt.enrollment_id));
    const paymentId = String(attempt.payment_id).trim();
    if (!enrollment) {
      summary.skipped += 1;
      continue;
    }

    summary.checked += 1;

    let queryRes: PaymentStatusResult;
    try {
      queryRes = await gateway.queryPaymentStatus(paymentId, {
        tranId: String(attempt.tran_id),
        amountPoisha: parseBigIntPoisha(attempt.amount_poisha),
      });
    } catch {
      summary.stillPending += 1;
      continue;
    }

    await admin.from("payment_events").insert({
      payment_attempt_id: attempt.id,
      tran_id: attempt.tran_id,
      payment_id: paymentId,
      source: "query_status",
      event_status: queryRes.transactionStatus,
      redacted_payload: queryRes.rawRedacted,
    });

    const effectiveTrxId = (queryRes.trxId || "").trim();
    const queryCompleted =
      queryRes.transactionStatus === "Completed" &&
      queryRes.statusCode === "0000" &&
      Boolean(effectiveTrxId);

    if (queryRes.transactionStatus === "Completed" && !effectiveTrxId) {
      await admin.rpc("record_payment_outcome", {
        p_attempt_id: attempt.id,
        p_next_status: "review_hold",
        p_payment_id: paymentId,
        p_failure_reason: "MISSING_TRX_ID",
        p_gateway_status_code: queryRes.statusCode || "MISMATCH",
        p_gateway_status_message:
          "Completed payment status missing gateway trxID during reconciliation",
      });
      summary.reviewHold += 1;
      continue;
    }

    if (queryCompleted) {
      const mismatch =
        queryRes.paymentId !== paymentId
          ? "PAYMENT_ID_MISMATCH"
          : queryRes.merchantInvoiceNumber !== attempt.tran_id
            ? "INVOICE_MISMATCH"
            : null;
      if (mismatch) {
        await admin.rpc("record_payment_outcome", {
          p_attempt_id: attempt.id,
          p_next_status: "review_hold",
          p_payment_id: paymentId,
          p_failure_reason: mismatch,
          p_gateway_status_code: queryRes.statusCode || "MISMATCH",
          p_gateway_status_message: "Gateway invoice reference mismatch during reconciliation",
        });

        await admin.from("audit_events").insert({
          actor_role: "system",
          action: "payment_flagged_review_hold",
          target_entity: "payment_attempts",
          target_id: attempt.id,
          after_state: {
            expected_tran_id: attempt.tran_id,
            query_tran_id: queryRes.merchantInvoiceNumber,
          },
        });

        summary.reviewHold += 1;
        continue;
      }

      const verifiedPoisha = queryRes.amountPoisha ?? 0n;
      const effectiveCurrency = (queryRes.currency || "UNKNOWN").trim().toUpperCase();

      const { data: confirmRaw, error: confirmError } = await admin.rpc("confirm_payment", {
        p_attempt_id: attempt.id,
        p_payment_id: paymentId,
        p_trx_id: effectiveTrxId,
        p_verified_poisha: verifiedPoisha.toString(),
        p_currency: effectiveCurrency || "UNKNOWN",
        p_gateway_status_code: queryRes.statusCode || "0000",
        p_gateway_status_message: queryRes.statusMessage || "Reconciled via queryPaymentStatus",
      });

      if (confirmError || !confirmRaw || typeof confirmRaw !== "object") {
        summary.stillPending += 1;
        continue;
      }

      const confirmRes = confirmRaw as Record<string, unknown>;
      const confirmStatus = String(confirmRes.status ?? "");
      if (confirmStatus === "validated" || confirmStatus === "already_validated") {
        const alreadyValidated = Boolean(confirmRes.already_validated);
        const outboxId = confirmRes.outbox_id ? String(confirmRes.outbox_id) : null;
        if (!alreadyValidated && outboxId) {
          await dispatchEmailOutboxById(outboxId, {
            senderOverride: options.emailSenderOverride,
            adminOverride: options.adminOverride,
          }).catch(() => null);
        }
        if (alreadyValidated) {
          summary.skipped += 1;
        } else {
          summary.confirmed += 1;
        }
      } else {
        summary.reviewHold += 1;
      }
      continue;
    }

    const queryDeclined =
      queryRes.transactionStatus === "Cancelled" || queryRes.transactionStatus === "Failed";
    const createdMs = new Date(String(attempt.created_at)).getTime();
    const isHoldExpired = Boolean(
      enrollment.hold_expires_at && new Date(String(enrollment.hold_expires_at)).getTime() <= nowMs
    );
    const isStaleInitiated =
      (queryRes.transactionStatus === "Initiated" || queryRes.transactionStatus === "Unknown") &&
      Number.isFinite(createdMs) &&
      (isHoldExpired || nowMs - createdMs >= staleInitiatedMs);

    if (!effectiveTrxId && (queryDeclined || isStaleInitiated)) {
      await admin.rpc("record_payment_outcome", {
        p_attempt_id: attempt.id,
        p_next_status: "failed",
        p_payment_id: paymentId,
        p_failure_reason: queryDeclined
          ? "GATEWAY_DECLINED_RECONCILED"
          : "SESSION_EXPIRED_UNCOMPLETED",
        p_gateway_status_code: queryRes.statusCode || queryRes.transactionStatus.toUpperCase(),
        p_gateway_status_message:
          queryRes.statusMessage ||
          `Reconciled terminal gateway status=${queryRes.transactionStatus}`,
      });
      summary.failed += 1;
      continue;
    }

    summary.stillPending += 1;
  }

  return summary;
}
