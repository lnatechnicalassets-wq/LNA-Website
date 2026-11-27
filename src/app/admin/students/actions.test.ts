// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { peopleCopy as copy } from "@/lib/admin-people";
import { purgeCopy } from "@/lib/admin-record-purge";
import { AppError } from "@/lib/errors";
import { requireStaff, requireSuperAdmin } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";
import { deleteStudent, saveCourseHistory, saveStudent } from "./actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/auth/require-staff", () => ({
  requireStaff: vi.fn(),
  requireSuperAdmin: vi.fn(),
}));
vi.mock("@/server/supabase/clients", () => ({ createSupabaseAdminClient: vi.fn() }));

const actorId = "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const studentId = "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const courseId = "ccccccc1-cccc-4ccc-8ccc-cccccccccccc";
const batchId = "ddddddd1-dddd-4ddd-8ddd-dddddddddddd";
const revision = "2026-11-16T00:00:00Z";
const impactToken = "a".repeat(32);
const rpc = vi.fn();

function studentForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  const values = {
    fullName: "Nadia Sultana",
    email: "Nadia@Example.COM",
    phone: "01711223344",
    university: "University of Dhaka",
    ...overrides,
  };
  for (const [k, v] of Object.entries(values)) {
    form.set(k, v);
  }
  return form;
}

function deleteForm(confirmation = "nadia@example.com") {
  const form = new FormData();
  form.set("confirmation", confirmation);
  form.set("impactToken", impactToken);
  return form;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireStaff).mockResolvedValue({
    userId: actorId,
    email: "staff@example.invalid",
    fullName: "Fixture Staff",
    role: "super_admin",
    accountState: "active",
    aal: "aal2",
  });
  vi.mocked(requireSuperAdmin).mockResolvedValue({
    userId: actorId,
    email: "sa@example.invalid",
    fullName: "Fixture SA",
    role: "super_admin",
    accountState: "active",
    aal: "aal2",
  });
  vi.mocked(createSupabaseAdminClient).mockReturnValue({ rpc } as unknown as SupabaseClient);
});

describe("Student directory actions characterization", () => {
  it("enforces students:edit and maps optimistic locking and duplicate contact states in saveStudent", async () => {
    vi.mocked(requireStaff).mockRejectedValueOnce(new AppError("Forbidden", "FORBIDDEN", 403));
    await expect(
      saveStudent({ operation: "edit", id: studentId, revision }, {}, studentForm())
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(requireStaff).toHaveBeenCalledWith("students:edit");
    expect(rpc).not.toHaveBeenCalled();

    rpc.mockResolvedValueOnce({ data: "STALE", error: null });
    await expect(
      saveStudent({ operation: "edit", id: studentId, revision }, {}, studentForm())
    ).resolves.toEqual({ message: copy.stale });

    rpc.mockResolvedValueOnce({ data: "DUPLICATE", error: null });
    await expect(
      saveStudent({ operation: "edit", id: studentId, revision }, {}, studentForm())
    ).resolves.toEqual({ message: copy.duplicate });

    rpc.mockResolvedValueOnce({ data: "OK", error: null });
    await expect(
      saveStudent({ operation: "edit", id: studentId, revision }, {}, studentForm())
    ).resolves.toEqual({ success: true });

    expect(rpc).toHaveBeenLastCalledWith("manage_staff_student", {
      p_actor: actorId,
      p_operation: "edit",
      p_id: studentId,
      p_revision: revision,
      p_name: "Nadia Sultana",
      p_email: "nadia@example.com",
      p_phone: "01711223344",
      p_university: "University of Dhaka",
      p_course: null,
      p_batch: null,
      p_completed: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/students");
  });

  it("enforces actor derivation, optimistic locking, impact token, and payment protection in deleteStudent", async () => {
    vi.mocked(requireSuperAdmin).mockRejectedValueOnce(new AppError("Forbidden", "FORBIDDEN", 403));
    const target = { id: studentId, revision, operation: "delete" as const };
    await expect(deleteStudent(target, {}, deleteForm())).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(requireSuperAdmin).toHaveBeenCalledWith("enrollments:manage");
    expect(rpc).not.toHaveBeenCalled();

    rpc.mockResolvedValueOnce({ data: "STALE", error: null });
    await expect(deleteStudent(target, {}, deleteForm())).resolves.toEqual({
      message: copy.stale,
    });

    rpc.mockResolvedValueOnce({ data: "IMPACT_CHANGED", error: null });
    await expect(deleteStudent(target, {}, deleteForm())).resolves.toEqual({
      message: purgeCopy.changed,
    });

    rpc.mockResolvedValueOnce({ data: "PAYMENT_PROTECTED", error: null });
    await expect(deleteStudent(target, {}, deleteForm())).resolves.toEqual({
      message: copy.deleteStudentPaymentProtected,
    });

    rpc.mockResolvedValueOnce({ data: "OK", error: null });
    await expect(deleteStudent(target, {}, deleteForm())).resolves.toEqual({
      success: true,
    });

    expect(rpc).toHaveBeenLastCalledWith("purge_staff_record", {
      p_actor: actorId,
      p_kind: "student",
      p_id: studentId,
      p_revision: revision,
      p_confirmation: "nadia@example.com",
      p_impact_token: impactToken,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/students");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/enrollments");
  });

  it("passes authenticated actor and validates duplicate/date responses in saveCourseHistory", async () => {
    rpc.mockResolvedValueOnce({ data: "ALREADY_RECORDED", error: null });
    await expect(
      saveCourseHistory({ operation: "add", id: studentId, courseId, batchId })
    ).resolves.toEqual({ message: copy.recorded });

    rpc.mockResolvedValueOnce({ data: "INVALID_DATE", error: null });
    await expect(
      saveCourseHistory({
        operation: "date",
        id: studentId,
        completionId: batchId,
        date: "2026-11-20",
      })
    ).resolves.toEqual({ message: copy.invalidCompletionDate });

    rpc.mockResolvedValueOnce({ data: "OK", error: null });
    await expect(
      saveCourseHistory({ operation: "add", id: studentId, courseId, batchId: null })
    ).resolves.toEqual({ success: true });
    expect(rpc).toHaveBeenLastCalledWith("manage_staff_course_history", {
      p_actor: actorId,
      p_student: studentId,
      p_course: courseId,
      p_batch: null,
      p_completion: null,
      p_completed: null,
    });
  });
});
