// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OutboxEmailSender } from "@/server/email/resend";
import { signMockScenarioToken, type PaymentGatewayClient } from "@/server/payments/bkash";
import type { VerifiedStaffContext } from "@/server/auth/require-staff";
import {
  getEnrollmentOutcomeSummaryByToken,
  listAdminEnrollments,
  getAdminEnrollmentDetail,
  lookupEnrollmentStatus,
  processBkashCallback,
  reconcilePendingBkashPayments,
  retryEnrollmentCheckout,
  signEnrollmentOutcomeToken,
  startEnrollmentCheckout,
} from "./service";

const SAMPLE_STAFF: VerifiedStaffContext = {
  userId: "staff-user-1",
  email: "superadmin@lnabd.org",
  role: "super_admin",
  accountState: "active",
  aal: "aal2",
  fullName: "LNA Super Admin",
};

interface MockTableState {
  enrollmentsSelectSingle?: Record<string, unknown> | null;
  enrollmentsList?: { data: Array<Record<string, unknown>>; count?: number; error?: unknown };
  paymentAttemptsSelectSingle?: Record<string, unknown> | null;
  paymentAttemptsList?: Array<Record<string, unknown>>;
  paymentEventsList?: Array<Record<string, unknown>>;
  emailOutboxSelectSingle?: Record<string, unknown> | null;
  emailOutboxList?: Array<Record<string, unknown>>;
  rpcHandlers?: Record<
    string,
    (params: Record<string, unknown>) => { data: unknown; error: unknown }
  >;
}

function createServiceAdminMock(state: MockTableState) {
  const rpcCalls: Array<{ fn: string; params: Record<string, unknown> }> = [];
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const updates: Array<{ table: string; payload: unknown; filters: Array<[string, unknown]> }> = [];
  const queryDebug: {
    orFilter?: string;
    eqFilters: Array<[string, unknown]>;
    selectClauses: Array<{ table: string; columns: string }>;
  } = {
    eqFilters: [],
    selectClauses: [],
  };

  function makeChain(table: string) {
    const localFilters: Array<[string, unknown]> = [];
    let isUpdate = false;
    let updatePayload: unknown = null;
    let selectedCols = "";

    const getAmbiguousBatchError = () => {
      if (table === "enrollments" && /\bbatches\(/.test(selectedCols)) {
        return {
          code: "PGRST201",
          message:
            "Could not embed because more than one relationship was found for 'enrollments' and 'batches'",
        };
      }
      return null;
    };

    const resolveSingle = async () => {
      const fkErr = getAmbiguousBatchError();
      if (fkErr) {
        return { data: null, error: fkErr };
      }
      if (table === "payment_attempts") {
        return { data: state.paymentAttemptsSelectSingle ?? null, error: null };
      }
      if (table === "enrollments") {
        return { data: state.enrollmentsSelectSingle ?? null, error: null };
      }
      if (table === "email_outbox") {
        return { data: state.emailOutboxSelectSingle ?? null, error: null };
      }
      return { data: null, error: null };
    };

    const resolveMany = async () => {
      const fkErr = getAmbiguousBatchError();
      if (fkErr) {
        return { data: null, count: null, error: fkErr };
      }
      if (table === "enrollments") {
        const res = state.enrollmentsList ?? { data: [], count: 0, error: null };
        return { data: res.data, count: res.count ?? res.data.length, error: res.error ?? null };
      }
      if (table === "payment_attempts") {
        return { data: state.paymentAttemptsList ?? [], error: null };
      }
      if (table === "payment_events") {
        return { data: state.paymentEventsList ?? [], error: null };
      }
      if (table === "email_outbox") {
        return { data: state.emailOutboxList ?? [], error: null };
      }
      return { data: [], error: null };
    };

    const chain: Record<string, unknown> = {
      select: (columns = "") => {
        selectedCols = String(columns);
        queryDebug.selectClauses.push({ table, columns: selectedCols });
        return chain;
      },
      eq: (col: string, val: unknown) => {
        localFilters.push([col, val]);
        queryDebug.eqFilters.push([col, val]);
        if (isUpdate) {
          updates.push({ table, payload: updatePayload, filters: [...localFilters] });
          return Promise.resolve({ error: null });
        }
        return chain;
      },
      is: () => chain,
      not: () => chain,
      in: () => chain,
      or: (expr: string) => {
        queryDebug.orFilter = expr;
        return chain;
      },
      order: () => chain,
      limit: () => chain,
      range: () => chain,
      maybeSingle: async () => resolveSingle(),
      update: (payload: unknown) => {
        isUpdate = true;
        updatePayload = payload;
        return chain;
      },
      insert: async (payload: unknown) => {
        inserts.push({ table, payload });
        return { error: null };
      },
      then: (onFulfilled: (val: unknown) => unknown, onRejected?: (err: unknown) => unknown) =>
        resolveMany().then(onFulfilled, onRejected),
    };

    return chain;
  }

  const admin = {
    from: (table: string) => makeChain(table),
    rpc: async (fn: string, params: Record<string, unknown>) => {
      rpcCalls.push({ fn, params });
      const handler = state.rpcHandlers?.[fn];
      if (!handler) {
        return { data: null, error: { message: `Unhandled RPC ${fn}` } };
      }
      return handler(params);
    },
  } as unknown as SupabaseClient;

  return { admin, rpcCalls, inserts, updates, queryDebug };
}

describe("Enrollment & bKash Service (FR-ENR-*, FR-PAY-*, FR-ADM-001)", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("rejects enrollment checkout when mode is closed (503 CHECKOUT_CLOSED)", async () => {
    const { admin } = createServiceAdminMock({});

    await expect(
      startEnrollmentCheckout(
        {
          courseId: "mto-readiness",
          batchId: "batch-mto-2026-01",
          fullName: "Nadia Sultana",
          email: "nadia@example.com",
          whatsapp: "01711223344",
          answers: {},
        },
        {
          origin: "https://lnabd.org",
          programQuestionsSnapshot: [],
          adminOverride: admin,
          checkoutModeOverride: "closed",
        }
      )
    ).rejects.toMatchObject({
      code: "CHECKOUT_CLOSED",
      statusCode: 503,
    });
  });

  it("enforces required program questions and maps DUPLICATE_ENROLLMENT to HTTP 409", async () => {
    const { admin } = createServiceAdminMock({
      rpcHandlers: {
        start_enrollment: () => ({
          data: { ok: false, code: "DUPLICATE_ENROLLMENT" },
          error: null,
        }),
      },
    });

    await expect(
      startEnrollmentCheckout(
        {
          courseId: "mto-readiness",
          batchId: "batch-mto-2026-01",
          fullName: "Nadia Sultana",
          email: "nadia@example.com",
          whatsapp: "+8801711223344",
          answers: {},
        },
        {
          origin: "https://lnabd.org",
          programQuestionsSnapshot: [
            { id: "university", label: "University", type: "text", required: true },
          ],
          adminOverride: admin,
          checkoutModeOverride: "mock",
        }
      )
    ).rejects.toMatchObject({
      code: "MISSING_PROGRAM_ANSWER",
      statusCode: 400,
    });

    await expect(
      startEnrollmentCheckout(
        {
          courseId: "mto-readiness",
          batchId: "batch-mto-2026-01",
          fullName: "Nadia Sultana",
          email: "nadia@example.com",
          whatsapp: "+8801711223344",
          answers: { university: "University of Dhaka" },
        },
        {
          origin: "https://lnabd.org",
          programQuestionsSnapshot: [
            { id: "university", label: "University", type: "text", required: true },
          ],
          adminOverride: admin,
          checkoutModeOverride: "mock",
        }
      )
    ).rejects.toMatchObject({
      code: "DUPLICATE_ENROLLMENT",
      statusCode: 409,
    });
  });

  it("persists paid application via start_enrollment RPC before initiating bKash checkout (ignoring client fee tampering)", async () => {
    const { admin, rpcCalls, updates } = createServiceAdminMock({
      rpcHandlers: {
        start_enrollment: () => ({
          data: {
            ok: true,
            is_free: false,
            enrollment_id: "enr-uuid-1",
            public_ref: "LNA-2M4K-9P7Q",
            attempt_id: "att-uuid-1",
            tran_id: "TXN-LNA-100",
            amount_poisha: 550000,
            hold_expires_at: "2026-11-11T01:00:00Z",
          },
          error: null,
        }),
      },
    });

    const gatewayStub: PaymentGatewayClient = {
      initiateCheckout: vi.fn().mockResolvedValue({
        paymentId: "PAY-SERVER-100",
        redirectUrl: "https://checkout.pay.bka.sh/v1/PAY-SERVER-100",
        statusCode: "0000",
        statusMessage: "Successful",
        rawRedacted: { paymentID: "PAY-SERVER-100" },
      }),
      executePayment: vi.fn(),
      queryPaymentStatus: vi.fn(),
      searchTransaction: vi.fn(),
    };

    const result = await startEnrollmentCheckout(
      {
        courseId: "mto-readiness",
        batchId: "batch-mto-2026-01",
        fullName: "Arif Hasan",
        email: "ARIF@EXAMPLE.COM",
        whatsapp: "+880 1711-223344",
        answers: { university: "IBA, University of Dhaka" },
        payablePoisha: 1,
        feePoisha: 0,
      },
      {
        origin: "https://lnabd.org",
        programQuestionsSnapshot: [
          { id: "university", label: "University", type: "text", required: true },
        ],
        adminOverride: admin,
        gatewayOverride: gatewayStub,
        checkoutModeOverride: "mock",
      }
    );

    expect(rpcCalls[0].fn).toBe("start_enrollment");
    expect(rpcCalls[0].params).toMatchObject({
      p_course_slug: "mto-readiness",
      p_batch_slug: "batch-mto-2026-01",
      p_email: "arif@example.com",
      p_phone: "01711223344",
    });
    expect(gatewayStub.initiateCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptId: "att-uuid-1",
        tranId: "TXN-LNA-100",
        amountPoisha: 550000n,
        currency: "BDT",
        payerReference: "LNA-2M4K-9P7Q",
        callbackUrl: "https://lnabd.org/api/payments/bkash/callback",
      })
    );
    expect(updates[0]).toMatchObject({
      table: "payment_attempts",
      payload: { payment_id: "PAY-SERVER-100", status: "pending" },
    });
    expect(result.isFree).toBe(false);
    expect(result.status).toBe("pending");
    expect(result.applicationReference).toBe("LNA-2M4K-9P7Q");
    expect(result.checkoutUrl).toBe("https://checkout.pay.bka.sh/v1/PAY-SERVER-100");
  });

  it("auto-confirms free batches without calling bKash gateway and dispatches email once (AT-05)", async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "test",
      EMAIL_DISPATCH_MODE: "live",
      RESEND_API_KEY: "re_test_key_123",
    };

    const { admin } = createServiceAdminMock({
      emailOutboxSelectSingle: {
        id: "outbox-free-1",
        template: "enrollment_confirmed_free",
        recipient_email: "free@example.com",
        idempotency_key: "confirm:LNA-FREE-7777",
        payload: {
          public_ref: "LNA-FREE-7777",
          full_name: "Kamal Uddin",
          course_title: "Career Planning Workshop",
          batch_name: "Workshop Cohort 1",
          venue: "LNA Campus",
          start_date: "2026-12-10",
          payable_poisha: 0,
          payment_method: "free",
        },
        status: "pending",
        provider_message_id: null,
        retry_count: 0,
      },
      rpcHandlers: {
        start_enrollment: () => ({
          data: {
            ok: true,
            is_free: true,
            enrollment_id: "enr-free-1",
            public_ref: "LNA-FREE-7777",
            outbox_id: "outbox-free-1",
          },
          error: null,
        }),
      },
    });

    const gatewayStub: PaymentGatewayClient = {
      initiateCheckout: vi.fn(),
      executePayment: vi.fn(),
      queryPaymentStatus: vi.fn(),
      searchTransaction: vi.fn(),
    };
    const emailSenderStub: OutboxEmailSender = {
      send: vi.fn().mockResolvedValue({ id: "resend_free_1" }),
    };

    const result = await startEnrollmentCheckout(
      {
        courseId: "career-planning-workshop",
        batchId: "batch-workshop-1",
        fullName: "Kamal Uddin",
        email: "free@example.com",
        whatsapp: "01811223344",
        answers: {},
      },
      {
        origin: "https://lnabd.org",
        programQuestionsSnapshot: [],
        adminOverride: admin,
        gatewayOverride: gatewayStub,
        emailSenderOverride: emailSenderStub,
        checkoutModeOverride: "mock",
      }
    );

    expect(gatewayStub.initiateCheckout).not.toHaveBeenCalled();
    expect(emailSenderStub.send).toHaveBeenCalledTimes(1);
    expect(result.isFree).toBe(true);
    expect(result.status).toBe("confirmed");
    expect(result.applicationReference).toBe("LNA-FREE-7777");
  });

  it("enforces HMAC ownership and handles HOLD_EXPIRED when retrying checkout (AT-02)", async () => {
    const { admin } = createServiceAdminMock({
      rpcHandlers: {
        retry_enrollment_payment: () => ({
          data: { ok: false, code: "HOLD_EXPIRED" },
          error: null,
        }),
      },
    });

    const validToken = signEnrollmentOutcomeToken("LNA-2M4K-9P7Q", "enr-uuid-1");

    await expect(
      retryEnrollmentCheckout(
        {
          applicationReference: "LNA-2M4K-9P7Q",
          outcomeToken: "tampered.invalid.token",
        },
        {
          origin: "https://lnabd.org",
          adminOverride: admin,
          checkoutModeOverride: "mock",
        }
      )
    ).rejects.toMatchObject({
      code: "INVALID_OWNERSHIP_TOKEN",
      statusCode: 403,
    });

    await expect(
      retryEnrollmentCheckout(
        {
          applicationReference: "LNA-9999-9999",
          outcomeToken: validToken,
        },
        {
          origin: "https://lnabd.org",
          adminOverride: admin,
          checkoutModeOverride: "mock",
        }
      )
    ).rejects.toMatchObject({
      code: "INVALID_OWNERSHIP_TOKEN",
      statusCode: 403,
    });

    await expect(
      retryEnrollmentCheckout(
        {
          applicationReference: "LNA-2M4K-9P7Q",
          outcomeToken: validToken,
        },
        {
          origin: "https://lnabd.org",
          adminOverride: admin,
          checkoutModeOverride: "mock",
        }
      )
    ).rejects.toMatchObject({
      code: "HOLD_EXPIRED",
      statusCode: 410,
    });
  });

  it("verifies bKash success server-side (execute + query), confirms seat via RPC, and sends confirmation email once (AT-01)", async () => {
    process.env = { ...process.env, NODE_ENV: "test", EMAIL_DISPATCH_MODE: "mock" };

    const { admin, rpcCalls, inserts } = createServiceAdminMock({
      paymentAttemptsSelectSingle: {
        id: "att-1",
        enrollment_id: "enr-1",
        tran_id: "TXN-100",
        payment_id: "PAY-100",
        trx_id: null,
        amount_poisha: 550000,
        currency: "BDT",
        status: "pending",
      },
      enrollmentsSelectSingle: {
        id: "enr-1",
        public_ref: "LNA-2M4K-9P7Q",
        status: "pending",
      },
      emailOutboxSelectSingle: {
        id: "outbox-paid-1",
        template: "enrollment_confirmed_paid",
        recipient_email: "nadia@example.com",
        idempotency_key: "confirm:LNA-2M4K-9P7Q",
        payload: {
          public_ref: "LNA-2M4K-9P7Q",
          full_name: "Nadia Sultana",
          course_title: "MTO Readiness Program",
          batch_name: "MTO Cohort 1",
          venue: "LNA Campus",
          start_date: "2026-12-01",
          payable_poisha: 550000,
          payment_method: "bkash",
        },
        status: "pending",
        provider_message_id: null,
        retry_count: 0,
      },
      rpcHandlers: {
        confirm_payment: () => ({
          data: {
            ok: true,
            status: "validated",
            already_validated: false,
            outbox_id: "outbox-paid-1",
          },
          error: null,
        }),
      },
    });

    const gatewayStub: PaymentGatewayClient = {
      initiateCheckout: vi.fn(),
      executePayment: vi.fn().mockResolvedValue({
        outcome: "completed",
        paymentId: "PAY-100",
        trxId: "TRX-BKASH-901",
        amountPoisha: 550000n,
        currency: "BDT",
        merchantInvoiceNumber: "TXN-100",
        transactionStatus: "Completed",
        statusCode: "0000",
        statusMessage: "Successful",
        rawRedacted: { statusCode: "0000", trxID: "TRX-BKASH-901" },
      }),
      queryPaymentStatus: vi.fn().mockResolvedValue({
        paymentId: "PAY-100",
        trxId: "TRX-BKASH-901",
        merchantInvoiceNumber: "TXN-100",
        amountPoisha: 550000n,
        currency: "BDT",
        transactionStatus: "Completed",
        statusCode: "0000",
        statusMessage: "Successful",
        verificationStatus: "Completed",
        rawRedacted: { statusCode: "0000", verificationStatus: "Completed" },
      }),
      searchTransaction: vi.fn(),
    };

    const res = await processBkashCallback(
      {
        paymentID: "PAY-100",
        status: "success",
      },
      {
        origin: "https://lnabd.org",
        adminOverride: admin,
        gatewayOverride: gatewayStub,
      }
    );

    expect(gatewayStub.executePayment).toHaveBeenCalledTimes(1);
    expect(gatewayStub.queryPaymentStatus).toHaveBeenCalledTimes(1);
    expect(rpcCalls[0].fn).toBe("confirm_payment");
    expect(rpcCalls[0].params).toMatchObject({
      p_attempt_id: "att-1",
      p_trx_id: "TRX-BKASH-901",
      p_verified_poisha: "550000",
      p_currency: "BDT",
      p_gateway_status_code: "0000",
    });
    expect(inserts.filter((i) => i.table === "payment_events")).toHaveLength(3);
    expect(res.outcome).toBe("confirmed");
    expect(res.alreadyProcessed).toBe(false);
    expect(res.redirectUrl).toContain(
      "https://lnabd.org/enroll?outcome=confirmed&ref=LNA-2M4K-9P7Q&token="
    );
  });

  it("handles repeated callbacks idempotently without duplicate execution or second email (AT-03)", async () => {
    const { admin } = createServiceAdminMock({
      paymentAttemptsSelectSingle: {
        id: "att-1",
        enrollment_id: "enr-1",
        tran_id: "TXN-100",
        payment_id: "PAY-100",
        trx_id: "TRX-BKASH-901",
        amount_poisha: 550000,
        currency: "BDT",
        status: "validated",
      },
      enrollmentsSelectSingle: {
        id: "enr-1",
        public_ref: "LNA-2M4K-9P7Q",
        status: "confirmed",
      },
    });

    const gatewayStub: PaymentGatewayClient = {
      initiateCheckout: vi.fn(),
      executePayment: vi.fn(),
      queryPaymentStatus: vi.fn(),
      searchTransaction: vi.fn(),
    };
    const emailSenderStub: OutboxEmailSender = {
      send: vi.fn(),
    };

    const res = await processBkashCallback(
      {
        paymentID: "PAY-100",
        status: "success",
      },
      {
        origin: "https://lnabd.org",
        adminOverride: admin,
        gatewayOverride: gatewayStub,
        emailSenderOverride: emailSenderStub,
      }
    );

    expect(gatewayStub.executePayment).not.toHaveBeenCalled();
    expect(gatewayStub.queryPaymentStatus).not.toHaveBeenCalled();
    expect(emailSenderStub.send).not.toHaveBeenCalled();
    expect(res.outcome).toBe("confirmed");
    expect(res.alreadyProcessed).toBe(true);
  });

  it("retains seat hold on browser cancel/failure callback and handles pending gateway timeouts safely (AT-02)", async () => {
    const { admin, rpcCalls } = createServiceAdminMock({
      paymentAttemptsSelectSingle: {
        id: "att-2",
        enrollment_id: "enr-2",
        tran_id: "TXN-200",
        payment_id: "PAY-200",
        trx_id: null,
        amount_poisha: 550000,
        currency: "BDT",
        status: "pending",
      },
      enrollmentsSelectSingle: {
        id: "enr-2",
        public_ref: "LNA-CANC-1234",
        status: "pending",
      },
      rpcHandlers: {
        record_payment_outcome: () => ({ data: { ok: true }, error: null }),
      },
    });

    const gatewayStub: PaymentGatewayClient = {
      initiateCheckout: vi.fn(),
      executePayment: vi.fn(),
      queryPaymentStatus: vi.fn(),
      searchTransaction: vi.fn(),
    };

    const cancelRes = await processBkashCallback(
      { paymentID: "PAY-200", status: "cancel" },
      { origin: "https://lnabd.org", adminOverride: admin, gatewayOverride: gatewayStub }
    );

    expect(gatewayStub.executePayment).not.toHaveBeenCalled();
    expect(rpcCalls[0]).toMatchObject({
      fn: "record_payment_outcome",
      params: expect.objectContaining({
        p_attempt_id: "att-2",
        p_next_status: "cancelled",
      }),
    });
    expect(cancelRes.outcome).toBe("cancelled");

    // Simulate gateway network timeout during execute on success callback -> pending hold preserved
    const timeoutGateway: PaymentGatewayClient = {
      initiateCheckout: vi.fn(),
      executePayment: vi.fn().mockResolvedValue({
        outcome: "pending",
        paymentId: "PAY-200",
        trxId: null,
        amountPoisha: null,
        currency: null,
        merchantInvoiceNumber: null,
        transactionStatus: "Pending",
        statusCode: "TIMEOUT",
        statusMessage: "Timed out",
        rawRedacted: { statusCode: "TIMEOUT" },
      }),
      queryPaymentStatus: vi.fn().mockRejectedValue(new Error("Gateway unreachable")),
      searchTransaction: vi.fn(),
    };

    const pendingRes = await processBkashCallback(
      { paymentID: "PAY-200", status: "success" },
      { origin: "https://lnabd.org", adminOverride: admin, gatewayOverride: timeoutGateway }
    );

    expect(pendingRes.outcome).toBe("pending");
    expect(rpcCalls[1]).toMatchObject({
      fn: "record_payment_outcome",
      params: expect.objectContaining({ p_next_status: "pending" }),
    });
  });

  it("quarantines invoice mismatch into review_hold and writes immutable audit event (FR-PAY-008)", async () => {
    const { admin, rpcCalls, inserts } = createServiceAdminMock({
      paymentAttemptsSelectSingle: {
        id: "att-3",
        enrollment_id: "enr-3",
        tran_id: "TXN-EXPECTED",
        payment_id: "PAY-300",
        trx_id: null,
        amount_poisha: 550000,
        currency: "BDT",
        status: "pending",
      },
      enrollmentsSelectSingle: {
        id: "enr-3",
        public_ref: "LNA-HOLD-5678",
        status: "pending",
      },
      rpcHandlers: {
        record_payment_outcome: () => ({ data: { ok: true }, error: null }),
      },
    });

    const mismatchGateway: PaymentGatewayClient = {
      initiateCheckout: vi.fn(),
      executePayment: vi.fn().mockResolvedValue({
        outcome: "completed",
        paymentId: "PAY-300",
        trxId: "TRX-SPOOF",
        amountPoisha: 550000n,
        currency: "BDT",
        merchantInvoiceNumber: "TXN-TAMPERED-OTHER",
        transactionStatus: "Completed",
        statusCode: "0000",
        statusMessage: "Successful",
        rawRedacted: { statusCode: "0000" },
      }),
      queryPaymentStatus: vi.fn().mockResolvedValue({
        paymentId: "PAY-300",
        trxId: "TRX-SPOOF",
        merchantInvoiceNumber: "TXN-TAMPERED-OTHER",
        amountPoisha: 550000n,
        currency: "BDT",
        transactionStatus: "Completed",
        statusCode: "0000",
        statusMessage: "Successful",
        verificationStatus: "Completed",
        rawRedacted: { statusCode: "0000" },
      }),
      searchTransaction: vi.fn(),
    };

    const res = await processBkashCallback(
      { paymentID: "PAY-300", status: "success" },
      { origin: "https://lnabd.org", adminOverride: admin, gatewayOverride: mismatchGateway }
    );

    expect(res.outcome).toBe("review_hold");
    expect(rpcCalls[0]).toMatchObject({
      fn: "record_payment_outcome",
      params: expect.objectContaining({
        p_next_status: "review_hold",
        p_failure_reason: "INVOICE_MISMATCH",
      }),
    });
    expect(inserts.some((i) => i.table === "audit_events")).toBe(true);
  });

  it("enforces LNA Application ID + contact verification on lookupEnrollmentStatus without leaking PII (FR-ENR-004)", async () => {
    const { admin } = createServiceAdminMock({
      enrollmentsSelectSingle: {
        public_ref: "LNA-2M4K-9P7Q",
        full_name: "Nadia Sultana",
        email: "nadia@example.com",
        phone: "01711223344",
        answers: { university: "University of Dhaka" },
        payment_method: "bkash",
        status: "confirmed",
        courses: { title: "MTO Readiness Program" },
        batches: { name: "MTO Cohort 1" },
      },
    });

    const invalidRef = await lookupEnrollmentStatus(
      { applicationId: "NOT-VALID", verificationType: "email", contactValue: "nadia@example.com" },
      admin
    );
    expect(invalidRef).toBeNull();

    const wrongEmail = await lookupEnrollmentStatus(
      {
        applicationId: "LNA-2M4K-9P7Q",
        verificationType: "email",
        contactValue: "wrong@example.com",
      },
      admin
    );
    expect(wrongEmail).toBeNull();

    const byPhone = await lookupEnrollmentStatus(
      {
        applicationId: "lna-2m4k-9p7q",
        verificationType: "phone",
        contactValue: "+880 1711-223344",
      },
      admin
    );
    expect(byPhone).toEqual({
      applicationReference: "LNA-2M4K-9P7Q",
      fullName: "Nadia Sultana",
      university: "University of Dhaka",
      courseTitle: "MTO Readiness Program",
      batchName: "MTO Cohort 1",
      paymentMethod: "bkash",
      status: "Enrollment confirmed",
    });
    expect("email" in (byPhone ?? {})).toBe(false);
    expect("phone" in (byPhone ?? {})).toBe(false);
  });

  it("verifies outcome token before loading retryable outcome summary", async () => {
    const futureHold = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    const { admin } = createServiceAdminMock({
      enrollmentsSelectSingle: {
        id: "enr-retry-1",
        public_ref: "LNA-2M4K-9P7Q",
        payable_poisha: 550000,
        payment_method: "bkash",
        status: "pending",
        hold_expires_at: futureHold,
        courses: { title: "MTO Readiness Program" },
        batches: { name: "MTO Cohort 1" },
      },
    });

    expect(
      await getEnrollmentOutcomeSummaryByToken("cancelled", "LNA-2M4K-9P7Q", "tampered", admin)
    ).toBeNull();

    const token = signEnrollmentOutcomeToken("LNA-2M4K-9P7Q", "enr-retry-1");
    const summary = await getEnrollmentOutcomeSummaryByToken(
      "cancelled",
      "LNA-2M4K-9P7Q",
      token,
      admin
    );
    expect(summary).toMatchObject({
      outcome: "cancelled",
      applicationReference: "LNA-2M4K-9P7Q",
      payablePoisha: 550000,
      canRetry: true,
    });
  });

  it("sanitizes admin search filters, maps read-only detail, and logs detail view audit event", async () => {
    const { admin, inserts, queryDebug } = createServiceAdminMock({
      enrollmentsList: {
        data: [
          {
            id: "enr-admin-1",
            public_ref: "LNA-2M4K-9P7Q",
            full_name: "Nadia Sultana",
            email: "nadia@example.com",
            phone: "01711223344",
            payment_method: "bkash",
            payment_status: "validated",
            status: "confirmed",
            payable_poisha: 550000,
            currency: "BDT",
            hold_expires_at: null,
            confirmed_at: "2026-11-11T00:00:00Z",
            created_at: "2026-11-10T23:45:00Z",
            is_dev_fixture: false,
            courses: { slug: "mto-readiness", title: "MTO Readiness Program" },
            batches: { slug: "batch-mto-1", name: "MTO Cohort 1" },
          },
        ],
        count: 1,
      },
      enrollmentsSelectSingle: {
        id: "11111111-2222-3333-4444-555555555555",
        public_ref: "LNA-2M4K-9P7Q",
        full_name: "Nadia Sultana",
        email: "nadia@example.com",
        phone: "01711223344",
        answers: { university: "University of Dhaka" },
        program_questions_snapshot: [
          { id: "university", label: "University", type: "text", required: true },
        ],
        payment_method: "bkash",
        payment_status: "validated",
        submitted_payment_ref: null,
        base_fee_poisha: 750000,
        discount_amount_poisha: 200000,
        payable_poisha: 550000,
        currency: "BDT",
        status: "confirmed",
        hold_expires_at: null,
        verified_at: "2026-11-11T00:00:00Z",
        confirmed_at: "2026-11-11T00:00:00Z",
        verification_notes: null,
        is_dev_fixture: false,
        fixture_label: null,
        created_at: "2026-11-10T23:45:00Z",
        updated_at: "2026-11-11T00:00:00Z",
        courses: { slug: "mto-readiness", title: "MTO Readiness Program" },
        batches: {
          slug: "batch-mto-1",
          name: "MTO Cohort 1",
          start_date: "2026-12-01",
          venue: "LNA Campus",
        },
      },
      paymentAttemptsList: [
        {
          id: "att-9",
          tran_id: "TXN-9",
          payment_id: "PAY-9",
          trx_id: "TRX-9",
          amount_poisha: 550000,
          validated_amount_poisha: 550000,
          currency: "BDT",
          status: "validated",
          gateway_status_code: "0000",
          gateway_status_message: "Successful",
          failure_reason: null,
          executed_at: "2026-11-11T00:00:00Z",
          created_at: "2026-11-10T23:45:00Z",
        },
      ],
      paymentEventsList: [
        {
          id: "ev-1",
          payment_attempt_id: "att-9",
          source: "execute",
          event_status: "Completed",
          redacted_payload: { statusCode: "0000", id_token: "[REDACTED]" },
          received_at: "2026-11-11T00:00:00Z",
        },
      ],
      emailOutboxList: [
        {
          id: "em-1",
          template: "enrollment_confirmed_paid",
          recipient_email: "nadia@example.com",
          status: "sent",
          provider_message_id: "resend_123",
          retry_count: 0,
          last_error: null,
          sent_at: "2026-11-11T00:00:05Z",
          created_at: "2026-11-11T00:00:00Z",
        },
      ],
    });

    const list = await listAdminEnrollments(
      { search: "Nadia,email.eq.1()%*", status: "confirmed", page: 1 },
      SAMPLE_STAFF,
      admin
    );
    expect(list.items).toHaveLength(1);
    expect(queryDebug.selectClauses[0]?.columns).toContain("batches!enrollments_batch_id_fkey");
    expect(queryDebug.orFilter).toContain("public_ref.ilike.%Nadiaemail.eq.1%");
    expect(queryDebug.orFilter).not.toContain("(");
    expect(queryDebug.orFilter).not.toContain("*");

    const detail = await getAdminEnrollmentDetail(
      "11111111-2222-3333-4444-555555555555",
      SAMPLE_STAFF,
      admin
    );
    expect(detail?.payablePoisha).toBe(550000);
    expect(detail?.paymentAttempts[0].trxId).toBe("TRX-9");
    expect(detail?.paymentEvents[0].redactedPayload.id_token).toBe("[REDACTED]");
    expect(detail?.emailOutbox[0].providerMessageId).toBe("resend_123");
    expect(
      inserts.some(
        (i) =>
          i.table === "audit_events" &&
          (i.payload as Record<string, unknown>).action === "admin_viewed_enrollment_detail"
      )
    ).toBe(true);
  });

  it("handles an empty enrollment table, rejects unauthorized staff contexts, and sanitizes DB errors", async () => {
    const { admin: emptyAdmin } = createServiceAdminMock({
      enrollmentsList: { data: [], count: 0, error: null },
    });

    const emptyList = await listAdminEnrollments({ page: 1 }, SAMPLE_STAFF, emptyAdmin);
    expect(emptyList).toEqual({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 20,
    });

    await expect(
      listAdminEnrollments({ page: 1 }, { ...SAMPLE_STAFF, role: "admin" }, emptyAdmin)
    ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });

    await expect(
      getAdminEnrollmentDetail(
        "11111111-2222-3333-4444-555555555555",
        { ...SAMPLE_STAFF, aal: "aal1" as unknown as "aal2" },
        emptyAdmin
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { admin: failingAdmin } = createServiceAdminMock({
      enrollmentsList: {
        data: [],
        error: { code: "PGRST201", message: "Could not embed" },
      },
    });

    await expect(
      listAdminEnrollments({ page: 1 }, SAMPLE_STAFF, failingAdmin)
    ).rejects.toMatchObject({
      code: "ADMIN_LIST_FAILED",
      statusCode: 503,
      details: { pgCode: "PGRST201" },
    });
    expect(errorSpy).toHaveBeenCalledWith("[admin:enrollments] list query failed", {
      code: "PGRST201",
    });
  });

  it("auto-confirms free batches when EMAIL_DISPATCH_MODE=disabled without RESEND_API_KEY", async () => {
    const nextEnv: NodeJS.ProcessEnv = {
      ...process.env,
      NODE_ENV: "development",
      BKASH_CHECKOUT_MODE: "mock",
      EMAIL_DISPATCH_MODE: "disabled",
      STATUS_LOOKUP_ENABLED: "true",
    };
    delete nextEnv.RESEND_API_KEY;
    process.env = nextEnv;

    const { admin, updates } = createServiceAdminMock({
      emailOutboxSelectSingle: {
        id: "outbox-free-disabled",
        template: "enrollment_confirmed_free",
        recipient_email: "free@example.com",
        idempotency_key: "confirm:enr-free-disabled",
        payload: {},
        status: "pending",
        provider_message_id: null,
        retry_count: 0,
      },
      rpcHandlers: {
        start_enrollment: () => ({
          data: {
            ok: true,
            is_free: true,
            enrollment_id: "enr-free-disabled",
            public_ref: "LNA-FREE-8888",
            outbox_id: "outbox-free-disabled",
          },
          error: null,
        }),
      },
    });

    const emailSenderStub: OutboxEmailSender = {
      send: vi.fn(),
    };

    const result = await startEnrollmentCheckout(
      {
        courseId: "career-planning-workshop",
        batchId: "batch-workshop-1",
        fullName: "Nusrat Jahan",
        email: "free@example.com",
        whatsapp: "01811223344",
        answers: {},
      },
      {
        origin: "http://localhost:3000",
        programQuestionsSnapshot: [],
        adminOverride: admin,
        emailSenderOverride: emailSenderStub,
        checkoutModeOverride: "mock",
      }
    );

    expect(result.isFree).toBe(true);
    expect(result.status).toBe("confirmed");
    expect(result.applicationReference).toBe("LNA-FREE-8888");
    expect(emailSenderStub.send).not.toHaveBeenCalled();
    expect(updates.filter((u) => u.table === "email_outbox")).toHaveLength(0);
  });

  it("completes end-to-end mock bKash journey with cancel, retry, confirm, replay guard, /status lookup, and Superadmin detail while EMAIL_DISPATCH_MODE=disabled", async () => {
    const nextEnv: NodeJS.ProcessEnv = {
      ...process.env,
      NODE_ENV: "development",
      APP_URL: "http://localhost:3000",
      APP_SECRET: "test_secret_key_for_hmac_tokens_minimum_32_characters",
      BKASH_CHECKOUT_MODE: "mock",
      EMAIL_DISPATCH_MODE: "disabled",
      STATUS_LOOKUP_ENABLED: "true",
    };
    delete nextEnv.RESEND_API_KEY;
    process.env = nextEnv;

    const futureHold = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const enrollmentState: Record<string, unknown> = {
      id: "22222222-3333-4444-5555-666666666666",
      public_ref: "",
      full_name: "Samira Rahman",
      email: "samira@example.com",
      phone: "01711223344",
      answers: { university: "Dhaka University", department: "Finance" },
      program_questions_snapshot: [
        { id: "university", label: "University", type: "text", required: true },
      ],
      payment_method: "bkash",
      payment_status: "initiated",
      submitted_payment_ref: null,
      base_fee_poisha: 750000,
      discount_amount_poisha: 0,
      payable_poisha: 750000,
      currency: "BDT",
      status: "pending",
      hold_expires_at: futureHold,
      verified_at: null,
      confirmed_at: null,
      verification_notes: null,
      is_dev_fixture: true,
      fixture_label: "mock_e2e_test",
      created_at: "2026-11-11T00:00:00Z",
      updated_at: "2026-11-11T00:00:00Z",
      courses: { slug: "mto-readiness", title: "MTO Readiness Program" },
      batches: {
        slug: "batch-mto-2026-01",
        name: "MTO Readiness Cohort 1",
        start_date: "2026-12-01",
        venue: "LNA Executive Campus, Dhaka",
      },
    };
    const attempts: Array<Record<string, unknown>> = [];
    const paymentEvents: Array<Record<string, unknown>> = [];
    const emailOutbox: Array<Record<string, unknown>> = [];
    const auditEvents: Array<Record<string, unknown>> = [];

    function createStatefulAdmin(): SupabaseClient {
      const applyFilters = (
        rows: Array<Record<string, unknown>>,
        filters: Array<{ op: string; col: string; val: unknown }>
      ) =>
        rows.filter((row) =>
          filters.every((f) => {
            if (f.op === "eq") return String(row[f.col] ?? "") === String(f.val ?? "");
            if (f.op === "in") return Array.isArray(f.val) && f.val.includes(row[f.col]);
            return true;
          })
        );

      const makeChain = (table: string) => {
        const filters: Array<{ op: string; col: string; val: unknown }> = [];
        let updatePayload: Record<string, unknown> | null = null;

        const getRows = () => {
          if (table === "enrollments") return enrollmentState.public_ref ? [enrollmentState] : [];
          if (table === "payment_attempts") return attempts;
          if (table === "payment_events") return paymentEvents;
          if (table === "email_outbox") return emailOutbox;
          if (table === "audit_events") return auditEvents;
          return [];
        };

        const chain: Record<string, unknown> = {
          select: () => chain,
          eq: (col: string, val: unknown) => {
            filters.push({ op: "eq", col, val });
            if (updatePayload) {
              const target = applyFilters(getRows(), filters);
              for (const r of target) {
                Object.assign(r, updatePayload);
              }
              return Promise.resolve({ error: null });
            }
            return chain;
          },
          in: (col: string, val: unknown[]) => {
            filters.push({ op: "in", col, val });
            return chain;
          },
          is: () => chain,
          or: () => chain,
          order: () => chain,
          range: () => chain,
          maybeSingle: async () => {
            const matched = applyFilters(getRows(), filters);
            return { data: matched[0] ?? null, error: null };
          },
          update: (payload: Record<string, unknown>) => {
            updatePayload = payload;
            return chain;
          },
          insert: async (payload: Record<string, unknown>) => {
            if (table === "payment_events") {
              paymentEvents.push({
                id: `ev-${paymentEvents.length + 1}`,
                received_at: new Date().toISOString(),
                ...payload,
              });
            } else if (table === "audit_events") {
              auditEvents.push({
                id: `aud-${auditEvents.length + 1}`,
                created_at: new Date().toISOString(),
                ...payload,
              });
            }
            return { error: null };
          },
          then: (
            onFulfilled: (val: unknown) => unknown,
            onRejected?: (err: unknown) => unknown
          ) => {
            const matched = applyFilters(getRows(), filters);
            return Promise.resolve({ data: matched, count: matched.length, error: null }).then(
              onFulfilled,
              onRejected
            );
          },
        };
        return chain;
      };

      return {
        from: (table: string) => makeChain(table),
        rpc: async (fn: string, params: Record<string, unknown>) => {
          if (fn === "start_enrollment") {
            enrollmentState.public_ref = String(params.p_public_ref);
            const attId = `att-${attempts.length + 1}`;
            const tranId = `TXN-E2E-${attempts.length + 1}`;
            attempts.push({
              id: attId,
              enrollment_id: enrollmentState.id,
              tran_id: tranId,
              payment_id: null,
              trx_id: null,
              amount_poisha: 750000,
              validated_amount_poisha: null,
              currency: "BDT",
              status: "initiated",
              gateway_status_code: null,
              gateway_status_message: null,
              failure_reason: null,
              executed_at: null,
              created_at: new Date().toISOString(),
            });
            return {
              data: {
                ok: true,
                is_free: false,
                enrollment_id: enrollmentState.id,
                public_ref: enrollmentState.public_ref,
                attempt_id: attId,
                tran_id: tranId,
                amount_poisha: "750000",
                hold_expires_at: futureHold,
              },
              error: null,
            };
          }

          if (fn === "record_payment_outcome") {
            const attempt = attempts.find((a) => a.id === params.p_attempt_id);
            if (attempt) {
              attempt.status = params.p_next_status;
              attempt.failure_reason = params.p_failure_reason;
              attempt.gateway_status_code = params.p_gateway_status_code;
              attempt.gateway_status_message = params.p_gateway_status_message;
              if (params.p_next_status === "review_hold") {
                enrollmentState.status = "review_hold";
              }
            }
            return { data: { ok: true }, error: null };
          }

          if (fn === "retry_enrollment_payment") {
            const attId = `att-${attempts.length + 1}`;
            const tranId = `TXN-E2E-${attempts.length + 1}`;
            attempts.push({
              id: attId,
              enrollment_id: enrollmentState.id,
              tran_id: tranId,
              payment_id: null,
              trx_id: null,
              amount_poisha: 750000,
              validated_amount_poisha: null,
              currency: "BDT",
              status: "initiated",
              gateway_status_code: null,
              gateway_status_message: null,
              failure_reason: null,
              executed_at: null,
              created_at: new Date().toISOString(),
            });
            return {
              data: {
                ok: true,
                enrollment_id: enrollmentState.id,
                attempt_id: attId,
                tran_id: tranId,
                amount_poisha: "750000",
                hold_expires_at: futureHold,
              },
              error: null,
            };
          }

          if (fn === "confirm_payment") {
            const attempt = attempts.find((a) => a.id === params.p_attempt_id);
            const already = enrollmentState.status === "confirmed";
            if (!already && attempt) {
              attempt.status = "validated";
              attempt.trx_id = params.p_trx_id;
              attempt.validated_amount_poisha = params.p_verified_poisha;
              attempt.gateway_status_code = params.p_gateway_status_code;
              attempt.gateway_status_message = params.p_gateway_status_message;
              attempt.executed_at = new Date().toISOString();
              enrollmentState.status = "confirmed";
              enrollmentState.payment_status = "validated";
              enrollmentState.confirmed_at = new Date().toISOString();
              enrollmentState.hold_expires_at = null;
              emailOutbox.push({
                id: "outbox-e2e-1",
                enrollment_id: enrollmentState.id,
                template: "enrollment_confirmed_paid",
                recipient_email: enrollmentState.email,
                idempotency_key: `confirm:${String(enrollmentState.id)}`,
                payload: {
                  public_ref: enrollmentState.public_ref,
                  full_name: enrollmentState.full_name,
                  course_title: "MTO Readiness Program",
                  batch_name: "MTO Readiness Cohort 1",
                  venue: "LNA Executive Campus, Dhaka",
                  start_date: "2026-12-01",
                  payable_poisha: 750000,
                  payment_method: "bkash",
                },
                status: "pending",
                provider_message_id: null,
                retry_count: 0,
                last_error: null,
                sent_at: null,
                created_at: new Date().toISOString(),
              });
            }
            return {
              data: {
                ok: true,
                status: already ? "already_validated" : "validated",
                already_validated: already,
                outbox_id: "outbox-e2e-1",
              },
              error: null,
            };
          }

          return { data: null, error: { message: `Unhandled RPC ${fn}` } };
        },
      } as unknown as SupabaseClient;
    }

    const statefulAdmin = createStatefulAdmin();
    const emailSpy: OutboxEmailSender = { send: vi.fn() };

    // 1. Start paid checkout using real MockBkashClient
    const started = await startEnrollmentCheckout(
      {
        courseId: "mto-readiness",
        batchId: "batch-mto-2026-01",
        fullName: "Samira Rahman",
        email: "samira@example.com",
        whatsapp: "01711223344",
        answers: { university: "Dhaka University", department: "Finance" },
      },
      {
        origin: "http://localhost:3000",
        programQuestionsSnapshot: [
          { id: "university", label: "University", type: "text", required: true },
        ],
        adminOverride: statefulAdmin,
        checkoutModeOverride: "mock",
      }
    );

    expect(started.isFree).toBe(false);
    expect(started.checkoutUrl).toContain("/api/payments/bkash/mock-checkout?token=");
    const firstPaymentId = String(attempts[0].payment_id);
    expect(firstPaymentId).toMatch(/^MOCKPAY-/);

    // 2. User cancels first attempt -> seat hold retained & retry allowed
    const cancelCallback = await processBkashCallback(
      { paymentID: firstPaymentId, status: "cancel" },
      {
        origin: "http://localhost:3000",
        adminOverride: statefulAdmin,
        emailSenderOverride: emailSpy,
      }
    );
    expect(cancelCallback.outcome).toBe("cancelled");
    expect(enrollmentState.status).toBe("pending");

    const cancelSummary = await getEnrollmentOutcomeSummaryByToken(
      "cancelled",
      started.applicationReference,
      started.outcomeToken,
      statefulAdmin
    );
    expect(cancelSummary?.canRetry).toBe(true);

    // 3. Applicant retries inside unexpired 30-minute hold
    const retried = await retryEnrollmentCheckout(
      {
        applicationReference: started.applicationReference,
        outcomeToken: started.outcomeToken,
      },
      {
        origin: "http://localhost:3000",
        adminOverride: statefulAdmin,
        checkoutModeOverride: "mock",
      }
    );
    expect(retried.checkoutUrl).toContain("/api/payments/bkash/mock-checkout?token=");
    const secondPaymentId = String(attempts[1].payment_id);
    expect(secondPaymentId).not.toBe(firstPaymentId);

    // 4. Signed mock success executes server-side execute+query via MockBkashClient and confirms enrollment
    const mockSig = signMockScenarioToken(secondPaymentId, "success");
    const successCallback = await processBkashCallback(
      { paymentID: secondPaymentId, status: "success", mockSig },
      {
        origin: "http://localhost:3000",
        adminOverride: statefulAdmin,
        emailSenderOverride: emailSpy,
      }
    );
    expect(successCallback.outcome).toBe("confirmed");
    expect(successCallback.alreadyProcessed).toBe(false);
    expect(enrollmentState.status).toBe("confirmed");
    // Email dispatch is disabled: outbox stays safely queued as pending and no email is sent
    expect(emailSpy.send).not.toHaveBeenCalled();
    expect(emailOutbox[0]?.status).toBe("pending");

    // 5. Replay callback -> idempotent confirmation without duplicate email or mutation
    const replayCallback = await processBkashCallback(
      { paymentID: secondPaymentId, status: "success", mockSig },
      {
        origin: "http://localhost:3000",
        adminOverride: statefulAdmin,
        emailSenderOverride: emailSpy,
      }
    );
    expect(replayCallback.outcome).toBe("confirmed");
    expect(replayCallback.alreadyProcessed).toBe(true);

    // 6. Applicant tracks enrollment cleanly on /status by email and phone without email/trx leak
    const statusByEmail = await lookupEnrollmentStatus(
      {
        applicationId: started.applicationReference,
        verificationType: "email",
        contactValue: "SAMIRA@EXAMPLE.COM",
      },
      statefulAdmin
    );
    const statusByPhone = await lookupEnrollmentStatus(
      {
        applicationId: started.applicationReference,
        verificationType: "phone",
        contactValue: "+880 1711-223344",
      },
      statefulAdmin
    );
    expect(statusByEmail).toEqual({
      applicationReference: started.applicationReference,
      fullName: "Samira Rahman",
      university: "Dhaka University",
      courseTitle: "MTO Readiness Program",
      batchName: "MTO Readiness Cohort 1",
      paymentMethod: "bkash",
      status: "Enrollment confirmed",
    });
    expect(statusByPhone).toEqual(statusByEmail);

    // 7. Superadmin read-only portal sees confirmed enrollment, retry history, and pending outbox
    const adminList = await listAdminEnrollments({ page: 1 }, SAMPLE_STAFF, statefulAdmin);
    expect(adminList.items).toHaveLength(1);
    expect(adminList.items[0].status).toBe("confirmed");

    const adminDetail = await getAdminEnrollmentDetail(
      started.applicationReference,
      SAMPLE_STAFF,
      statefulAdmin
    );
    expect(adminDetail?.status).toBe("confirmed");
    expect(adminDetail?.paymentAttempts).toHaveLength(2);
    expect(adminDetail?.paymentAttempts[0].status).toBe("cancelled");
    expect(adminDetail?.paymentAttempts[1].status).toBe("validated");
    expect(adminDetail?.paymentAttempts[1].trxId).toMatch(/^MOCKTRX/);
    expect(adminDetail?.emailOutbox[0]?.status).toBe("pending");
    expect(auditEvents.some((e) => e.action === "admin_viewed_enrollment_detail")).toBe(true);
  });

  it("marks real gateway decline without trxID (e.g. 2023 + Initiated) as failed while retaining seat hold for retry", async () => {
    const { admin, rpcCalls } = createServiceAdminMock({
      paymentAttemptsSelectSingle: {
        id: "att-decline-1",
        enrollment_id: "enr-decline-1",
        tran_id: "LNA-DCLN-0001",
        payment_id: "TR-DECLINE-1",
        trx_id: null,
        amount_poisha: 750000,
        currency: "BDT",
        status: "pending",
      },
      enrollmentsSelectSingle: {
        id: "enr-decline-1",
        public_ref: "LNA-DCLN-0001",
        status: "pending",
      },
      rpcHandlers: {
        record_payment_outcome: () => ({ data: { ok: true }, error: null }),
      },
    });

    const gatewayMock: PaymentGatewayClient = {
      initiateCheckout: vi.fn(),
      executePayment: vi.fn().mockResolvedValue({
        paymentId: "TR-DECLINE-1",
        trxId: null,
        merchantInvoiceNumber: null,
        amountPoisha: null,
        currency: null,
        transactionStatus: "",
        statusCode: "2023",
        statusMessage: "Insufficient Balance",
        outcome: "failed",
        rawRedacted: { statusCode: "2023" },
      }),
      queryPaymentStatus: vi.fn().mockResolvedValue({
        paymentId: "TR-DECLINE-1",
        trxId: null,
        merchantInvoiceNumber: "LNA-DCLN-0001",
        amountPoisha: 750000n,
        currency: "BDT",
        transactionStatus: "Initiated",
        statusCode: "0000",
        statusMessage: "Successful",
        verificationStatus: "Incomplete",
        rawRedacted: { transactionStatus: "Initiated" },
      }),
      searchTransaction: vi.fn(),
    };

    const result = await processBkashCallback(
      { paymentID: "TR-DECLINE-1", status: "success" },
      { origin: "https://lnabd.org", adminOverride: admin, gatewayOverride: gatewayMock }
    );

    expect(result.outcome).toBe("failed");
    expect(rpcCalls.find((c) => c.fn === "confirm_payment")).toBeUndefined();
    const outcomeCall = rpcCalls.find((c) => c.fn === "record_payment_outcome");
    expect(outcomeCall?.params).toMatchObject({
      p_next_status: "failed",
      p_failure_reason: "GATEWAY_DECLINED",
      p_gateway_status_code: "2023",
    });
  });

  it("recovers confirmation when execute returns 2062/timeout and queryPaymentStatus verifies Completed trxID", async () => {
    const emailSpy: OutboxEmailSender = { send: vi.fn().mockResolvedValue({ messageId: null }) };
    const { admin, rpcCalls } = createServiceAdminMock({
      paymentAttemptsSelectSingle: {
        id: "att-recover-1",
        enrollment_id: "enr-recover-1",
        tran_id: "LNA-RECV-0001",
        payment_id: "TR-RECOVER-1",
        trx_id: null,
        amount_poisha: 750000,
        currency: "BDT",
        status: "pending",
      },
      enrollmentsSelectSingle: {
        id: "enr-recover-1",
        public_ref: "LNA-RECV-0001",
        status: "pending",
      },
      rpcHandlers: {
        confirm_payment: () => ({
          data: {
            ok: true,
            status: "validated",
            already_validated: false,
            outbox_id: "outbox-recv-1",
          },
          error: null,
        }),
      },
    });

    const gatewayMock: PaymentGatewayClient = {
      initiateCheckout: vi.fn(),
      executePayment: vi.fn().mockResolvedValue({
        paymentId: "TR-RECOVER-1",
        trxId: null,
        merchantInvoiceNumber: null,
        amountPoisha: null,
        currency: null,
        transactionStatus: "Pending",
        statusCode: "2062",
        statusMessage: "The payment has already been completed",
        outcome: "pending",
        rawRedacted: { statusCode: "2062" },
      }),
      queryPaymentStatus: vi.fn().mockResolvedValue({
        paymentId: "TR-RECOVER-1",
        trxId: "TRX-RECOVERED-888",
        merchantInvoiceNumber: "LNA-RECV-0001",
        amountPoisha: 750000n,
        currency: "BDT",
        transactionStatus: "Completed",
        statusCode: "0000",
        statusMessage: "Successful",
        verificationStatus: "Completed",
        rawRedacted: { transactionStatus: "Completed", statusCode: "0000" },
      }),
      searchTransaction: vi.fn(),
    };

    const result = await processBkashCallback(
      { paymentID: "TR-RECOVER-1", status: "success" },
      {
        origin: "https://lnabd.org",
        adminOverride: admin,
        gatewayOverride: gatewayMock,
        emailSenderOverride: emailSpy,
      }
    );

    expect(result.outcome).toBe("confirmed");
    const confirmCall = rpcCalls.find((c) => c.fn === "confirm_payment");
    expect(confirmCall?.params).toMatchObject({
      p_attempt_id: "att-recover-1",
      p_payment_id: "TR-RECOVER-1",
      p_trx_id: "TRX-RECOVERED-888",
      p_verified_poisha: "750000",
      p_currency: "BDT",
      p_gateway_status_code: "0000",
    });
  });

  it("reconcilePendingBkashPayments() recovers stalled completed payment and closes stale uncompleted sessions safely", async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "test",
      APP_URL: "https://lnabd.org",
      APP_SECRET: "test_secret_key_for_hmac_tokens_minimum_32_characters",
      BKASH_CHECKOUT_MODE: "mock",
      EMAIL_DISPATCH_MODE: "disabled",
    };

    const oldIso = new Date(Date.now() - 35 * 60 * 1000).toISOString();
    const freshIso = new Date(Date.now() - 10 * 1000).toISOString();
    const { admin, inserts, rpcCalls } = createServiceAdminMock({
      paymentAttemptsList: [
        {
          id: "att-rec-1",
          enrollment_id: "enr-rec-1",
          tran_id: "TXN-REC-1",
          payment_id: "PAY-REC-1",
          trx_id: null,
          amount_poisha: 750000,
          currency: "BDT",
          status: "pending",
          created_at: oldIso,
        },
        {
          id: "att-rec-2",
          enrollment_id: "enr-rec-2",
          tran_id: "TXN-REC-2",
          payment_id: "PAY-REC-2",
          trx_id: null,
          amount_poisha: 750000,
          currency: "BDT",
          status: "initiated",
          created_at: oldIso,
        },
        {
          id: "att-rec-fresh",
          enrollment_id: "enr-rec-3",
          tran_id: "TXN-REC-3",
          payment_id: "PAY-REC-3",
          trx_id: null,
          amount_poisha: 750000,
          currency: "BDT",
          status: "initiated",
          created_at: freshIso,
        },
      ],
      enrollmentsList: {
        data: [
          {
            id: "enr-rec-1",
            public_ref: "LNA-REC1-0001",
            status: "pending",
            hold_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          },
          {
            id: "enr-rec-2",
            public_ref: "LNA-REC2-0002",
            status: "pending",
            hold_expires_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          },
          {
            id: "enr-rec-3",
            public_ref: "LNA-REC3-0003",
            status: "pending",
            hold_expires_at: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
          },
        ],
      },
      rpcHandlers: {
        confirm_payment: () => ({
          data: { ok: true, status: "validated", already_validated: false, outbox_id: "ob-rec-1" },
          error: null,
        }),
        record_payment_outcome: () => ({ data: { ok: true }, error: null }),
      },
    });

    const gatewayMock: PaymentGatewayClient = {
      initiateCheckout: vi.fn(),
      executePayment: vi.fn(),
      queryPaymentStatus: vi
        .fn()
        .mockResolvedValueOnce({
          paymentId: "PAY-REC-1",
          trxId: "TRX-CRON-999",
          merchantInvoiceNumber: "TXN-REC-1",
          amountPoisha: 750000n,
          currency: "BDT",
          transactionStatus: "Completed",
          statusCode: "0000",
          statusMessage: "Successful",
          verificationStatus: "Completed",
          rawRedacted: { statusCode: "0000", transactionStatus: "Completed" },
        })
        .mockResolvedValueOnce({
          paymentId: "PAY-REC-2",
          trxId: null,
          merchantInvoiceNumber: "TXN-REC-2",
          amountPoisha: 750000n,
          currency: "BDT",
          transactionStatus: "Initiated",
          statusCode: "0000",
          statusMessage: "Initiated",
          verificationStatus: "Incomplete",
          rawRedacted: { transactionStatus: "Initiated" },
        }),
      searchTransaction: vi.fn(),
    };

    const emailSpy: OutboxEmailSender = { send: vi.fn() };
    const summary = await reconcilePendingBkashPayments({
      minAgeSeconds: 60,
      adminOverride: admin,
      gatewayOverride: gatewayMock,
      emailSenderOverride: emailSpy,
    });

    expect(summary).toEqual({
      checkoutMode: "mock",
      checked: 2,
      confirmed: 1,
      failed: 1,
      reviewHold: 0,
      stillPending: 0,
      skipped: 1,
    });
    expect(emailSpy.send).not.toHaveBeenCalled();
    expect(inserts.filter((i) => i.table === "payment_events")).toHaveLength(2);
    expect(
      inserts.every((i) => (i.payload as Record<string, unknown>).source === "query_status")
    ).toBe(true);
    expect(rpcCalls.find((c) => c.fn === "confirm_payment")?.params).toMatchObject({
      p_attempt_id: "att-rec-1",
      p_trx_id: "TRX-CRON-999",
      p_verified_poisha: "750000",
    });
    expect(rpcCalls.find((c) => c.fn === "record_payment_outcome")?.params).toMatchObject({
      p_attempt_id: "att-rec-2",
      p_next_status: "failed",
      p_failure_reason: "SESSION_EXPIRED_UNCOMPLETED",
    });
  });
});
