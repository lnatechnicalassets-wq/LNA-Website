// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { manualAdmissionCopy as copy } from "@/lib/admin-manual-admission";
import { AppError } from "@/lib/errors";
import { getEnrollmentConfig } from "@/lib/enrollment/config";
import { loadProgramQuestionSets } from "@/server/enrollment/program-questions";
import { getManualAdmissionBatch } from "@/server/admin/manual-admission";
import { requireStaff } from "@/server/auth/require-staff";
import { dispatchEmailOutboxById } from "@/server/email/resend";
import { createSupabaseAdminClient } from "@/server/supabase/clients";
import { createManualAdmission } from "./actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw new Error(href);
  },
}));
vi.mock("@/server/admin/manual-admission", () => ({ getManualAdmissionBatch: vi.fn() }));
vi.mock("@/server/enrollment/program-questions", () => ({ loadProgramQuestionSets: vi.fn() }));
vi.mock("@/server/auth/require-staff", () => ({ requireStaff: vi.fn() }));
vi.mock("@/server/email/resend", () => ({ dispatchEmailOutboxById: vi.fn() }));
vi.mock("@/server/supabase/clients", () => ({ createSupabaseAdminClient: vi.fn() }));

const target = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  revision: "2026-11-16T00:00:00+00:00",
};
const actor = "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const enrollmentId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const outboxId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const batch = {
  id: target.id,
  course_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Fixture batch",
  start_date: "2026-12-01",
  status: "open_for_enrollment" as const,
  archived_at: null,
  enrollment_opens_at: null,
  enrollment_closes_at: null,
  updated_at: target.revision,
  fee_poisha: 750000n,
  discount_fee_poisha: null,
  feePoisha: 750000n,
  isOpen: true,
  courses: {
    slug: "mto-readiness",
    title: "Fixture course",
    status: "published" as const,
    archived_at: null,
  },
};
const rpc = vi.fn();

function application(revision = target.revision) {
  const form = new FormData();
  form.set("batchId", target.id);
  form.set("batchRevision", revision);
  form.set("paymentMethod", "bkash");
  form.set("paymentReference", " TXFIXTURE001 ");
  form.set("adjustedFee", "7500.00");
  form.set("attested", "on");
  form.set("fullName", "  Fixture Student ");
  form.set("email", " Student@Example.Invalid ");
  form.set("phone", "+880 1711 000001");
  form.set("answer_university", "Fixture University");
  form.set("answer_department", "Business");
  form.set("answer_professionalPhase", "Recent graduate");
  return form;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireStaff).mockResolvedValue({
    userId: actor,
    email: "staff@example.invalid",
    fullName: "Staff Fixture",
    role: "super_admin",
    accountState: "active",
    aal: "aal2",
  });
  vi.mocked(getManualAdmissionBatch).mockResolvedValue(batch);
  vi.mocked(loadProgramQuestionSets).mockResolvedValue({
    programQuestions: getEnrollmentConfig().programQuestions,
    programQuestionVersions: { "mto-readiness": 0 },
  });
  vi.mocked(createSupabaseAdminClient).mockReturnValue({ rpc } as unknown as SupabaseClient);
  vi.mocked(dispatchEmailOutboxById).mockResolvedValue({ sent: false, mode: "disabled" });
});

describe("Staff manual enrollment", () => {
  it("authorizes staff before reading or writing admissions data", async () => {
    vi.mocked(requireStaff).mockRejectedValue(new AppError("Forbidden", "FORBIDDEN"));
    await expect(createManualAdmission({}, application())).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(requireStaff).toHaveBeenCalledWith("enrollments:create");
    expect(getManualAdmissionBatch).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects outdated question versions before writing admission", async () => {
    vi.mocked(loadProgramQuestionSets).mockResolvedValue({
      programQuestions: getEnrollmentConfig().programQuestions,
      programQuestionVersions: { "mto-readiness": 2 },
    });
    const form = application();
    form.set("questionVersion", "1");
    await expect(createManualAdmission({}, form)).resolves.toMatchObject({
      message: expect.stringContaining("questions have changed"),
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("validates batch details and the selected course’s required questions", async () => {
    const form = application();
    form.delete("answer_university");
    form.set("answer_professionalPhase", "Invalid option");
    await expect(createManualAdmission({}, form)).resolves.toMatchObject({
      fieldErrors: {
        answer_university: [copy.invalidAnswer],
        answer_professionalPhase: [copy.invalidAnswer],
      },
    });
    await expect(createManualAdmission({}, application("2026-11-15T00:00:00Z"))).resolves.toEqual({
      message: copy.stale,
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("saves normalized fields without accepting payment state or fees from the form", async () => {
    rpc.mockResolvedValue({
      data: {
        ok: true,
        enrollment_id: enrollmentId,
        student_id: null,
        public_ref: "LNA-TEST-0001",
        collected_poisha: "750000",
        outbox_id: null,
      },
      error: null,
    });
    const form = application();
    form.set("status", "confirmed");
    form.set("payable_poisha", "0");
    form.set("actor_id", enrollmentId);

    await expect(createManualAdmission({}, form)).resolves.toMatchObject({
      success: { enrollmentId },
    });
    expect(rpc).toHaveBeenCalledWith("create_confirmed_staff_admission", {
      p_actor_id: actor,
      p_batch_id: target.id,
      p_expected_updated_at: target.revision,
      p_public_ref: expect.stringMatching(/^LNA-[0-9A-Z]{4}-[0-9A-Z]{4}$/),
      p_full_name: "Fixture Student",
      p_email: "student@example.invalid",
      p_phone: "01711000001",
      p_kind: "bkash",
      p_channel: "bkash",
      p_payment_ref: "TXFIXTURE001",
      p_adjusted_poisha: "750000",
      p_waiver_poisha: "0",
      p_waiver_reason: null,
      p_reuse_ack: false,
      p_attested: true,
      p_notify: false,
      p_answers: {
        university: "Fixture University",
        department: "Business",
        professionalPhase: "Recent graduate",
      },
      p_program_questions_snapshot: expect.arrayContaining([
        expect.objectContaining({ id: "university", required: true }),
      ]),
    });
    expect(dispatchEmailOutboxById).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/admin/enrollments");
  });

  it("returns the existing record for a duplicate and reports a full batch", async () => {
    rpc.mockResolvedValueOnce({
      data: { ok: false, code: "DUPLICATE_ENROLLMENT", existing_id: enrollmentId },
      error: null,
    });
    rpc.mockResolvedValueOnce({ data: { ok: false, code: "BATCH_FULL" }, error: null });
    await expect(createManualAdmission({}, application())).resolves.toEqual({
      message: copy.duplicate,
      existingId: enrollmentId,
    });
    await expect(createManualAdmission({}, application())).resolves.toEqual({
      message: copy.full,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("reuses the existing confirmation sender when the database queues a free confirmation", async () => {
    vi.mocked(getManualAdmissionBatch).mockResolvedValue({ ...batch, feePoisha: 0n });
    rpc.mockResolvedValue({
      data: {
        ok: true,
        enrollment_id: enrollmentId,
        student_id: null,
        public_ref: "LNA-TEST-0001",
        collected_poisha: "0",
        outbox_id: outboxId,
      },
      error: null,
    });
    vi.mocked(dispatchEmailOutboxById).mockRejectedValueOnce(
      new Error("Outbox transport unavailable")
    );
    await expect(createManualAdmission({}, application())).resolves.toMatchObject({
      success: { enrollmentId, email: "queued" },
    });
    expect(rpc).toHaveBeenCalledWith(
      "create_confirmed_staff_admission",
      expect.objectContaining({
        p_kind: "free",
        p_payment_ref: null,
        p_adjusted_poisha: "0",
        p_waiver_poisha: "0",
      })
    );
    expect(dispatchEmailOutboxById).toHaveBeenCalledWith(outboxId);
  });

  it("requires a reference for a paid batch and accepts a bank reference without starting checkout", async () => {
    const form = application();
    form.set("paymentMethod", "bank_transfer");
    form.set("paymentReference", "");
    await expect(createManualAdmission({}, form)).resolves.toMatchObject({
      fieldErrors: { paymentReference: ["Enter a reference (1 to 128 characters)."] },
    });
    expect(rpc).not.toHaveBeenCalled();
    form.set("paymentReference", " bank/001 ");
    rpc.mockResolvedValue({
      data: {
        ok: true,
        enrollment_id: enrollmentId,
        student_id: null,
        public_ref: "LNA-TEST-0001",
        collected_poisha: "750000",
        outbox_id: null,
      },
      error: null,
    });
    await expect(createManualAdmission({}, form)).resolves.toMatchObject({
      success: { enrollmentId },
    });
    expect(rpc).toHaveBeenCalledWith(
      "create_confirmed_staff_admission",
      expect.objectContaining({
        p_kind: "bank_transfer",
        p_channel: "bank_transfer",
        p_payment_ref: "BANK/001",
      })
    );
    expect(dispatchEmailOutboxById).not.toHaveBeenCalled();
  });

  it.each([
    ["PGRST202", copy.setupRequired],
    ["42501", copy.accessUnavailable],
    ["23514", copy.failure],
  ])(
    "gives staff an actionable failure for database code %s without logging record data",
    async (code, message) => {
      rpc.mockResolvedValue({ data: null, error: { code, message: "Private database details" } });
      const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
      try {
        await expect(createManualAdmission({}, application())).resolves.toEqual({ message });
        expect(log).toHaveBeenCalledExactlyOnceWith("[admin:manual-admission] save failed", {
          code,
        });
        expect(revalidatePath).not.toHaveBeenCalled();
      } finally {
        log.mockRestore();
      }
    }
  );
});
