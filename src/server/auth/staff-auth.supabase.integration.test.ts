// @vitest-environment node
import crypto from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { isLocalLoopbackSupabaseUrl } from "@/server/env";
import { createSupabaseAdminClient } from "@/server/supabase/clients";
import { getStaffSessionContext, requireStaff, requireSuperAdmin } from "./require-staff";
import { getAdminEnrollmentDetail, listAdminEnrollments } from "@/server/enrollment/service";
import { manageEnrollmentRecord } from "@/app/admin/enrollments/enrollment-record-actions";
import { deleteStudent, saveStudent } from "@/app/admin/students/actions";
import { loadPurgeImpact } from "@/app/admin/record-purge-actions";
import AdminSettingsPage from "@/app/admin/settings/page";
import { POST as sandboxRefundPost } from "@/app/api/payments/bkash/sandbox-refund/route";
import { GET as reconcileCronGet } from "@/app/api/cron/reconcile-payments/route";

let activeCookieJar = new Map<string, string>();

const { gatewayVerifyAuthMock, gatewayRefundMock } = vi.hoisted(() => ({
  gatewayVerifyAuthMock: vi.fn(() => {
    throw new Error("External gateway must never be called during Admin auth denial test.");
  }),
  gatewayRefundMock: vi.fn(() => {
    throw new Error("External gateway must never be called during Admin auth denial test.");
  }),
}));

class NextRedirectSignal extends Error {
  constructor(public readonly location: string) {
    super(`NEXT_REDIRECT:${location}`);
  }
}

vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => Array.from(activeCookieJar.entries(), ([name, value]) => ({ name, value })),
    set: (name: string, value: string, options?: { maxAge?: number }) => {
      if (!value || options?.maxAge === 0) {
        activeCookieJar.delete(name);
      } else {
        activeCookieJar.set(name, value);
      }
    },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (location: string) => {
    throw new NextRedirectSignal(location);
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/server/payments/bkash", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/payments/bkash")>()),
  createLiveBkashClientFromEnv: () => ({
    verifyAuthentication: gatewayVerifyAuthMock,
    refundSandboxPayment: gatewayRefundMock,
  }),
}));

function assertIsolatedTestEnvironment(): { supabaseUrl: string; publishableKey: string } {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!isLocalLoopbackSupabaseUrl(supabaseUrl)) {
    throw new Error(
      `Integration test refused non-loopback Supabase URL: ${supabaseUrl ?? "undefined"}`
    );
  }
  if (process.env.VERCEL === "1" || process.env.VERCEL_ENV) {
    throw new Error("Integration test refused to run with VERCEL deployment variables set.");
  }
  if (!publishableKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required.");
  }
  return { supabaseUrl: supabaseUrl!, publishableKey };
}

function decodeBase32(secret: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = secret.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const ch of normalized) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function generateTotpCode(secret: string, timestampMs = Date.now()): string {
  const counter = Math.floor(timestampMs / 1000 / 30);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter), 0);

  const key = decodeBase32(secret);
  const digest = crypto.createHmac("sha1", key).update(counterBuf).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    (((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff)) %
    1_000_000;

  return code.toString().padStart(6, "0");
}

async function createSessionCookieSnapshots(
  supabaseUrl: string,
  publishableKey: string,
  email: string,
  password: string
): Promise<{ aal1: Map<string, string>; aal2: Map<string, string> }> {
  const jar = new Map<string, string>();
  const client = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll: () => Array.from(jar.entries(), ([name, value]) => ({ name, value })),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          if (!value || options?.maxAge === 0) {
            jar.delete(name);
          } else {
            jar.set(name, value);
          }
        }
      },
    },
  });

  const signInRes = await client.auth.signInWithPassword({ email, password });
  if (signInRes.error || !signInRes.data.user) {
    throw new Error(
      `Failed signInWithPassword for ${email}: ${signInRes.error?.message ?? "no user"}`
    );
  }
  const aal1 = new Map(jar);

  const enrollRes = await client.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `CI-TOTP-${crypto.randomUUID().slice(0, 8)}`,
  });
  if (enrollRes.error || !enrollRes.data || enrollRes.data.type !== "totp") {
    throw new Error(
      `Failed TOTP MFA enrollment for ${email}: ${enrollRes.error?.message ?? "missing secret"}`
    );
  }

  const secret = enrollRes.data.totp.secret;
  const factorId = enrollRes.data.id;
  const verifyRes = await client.auth.mfa.challengeAndVerify({
    factorId,
    code: generateTotpCode(secret),
  });
  if (verifyRes.error) {
    throw new Error(`Failed TOTP MFA challengeAndVerify for ${email}: ${verifyRes.error.message}`);
  }

  const aalCheck = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalCheck.error || aalCheck.data?.currentLevel !== "aal2") {
    throw new Error(
      `Expected AAL2 session after TOTP verify for ${email}, got ${aalCheck.data?.currentLevel ?? "null"}`
    );
  }

  return { aal1, aal2: new Map(jar) };
}

const RUN_M19_INTEGRATION = process.env.RUN_ISOLATED_SUPABASE_AUTH_INT === "true";
const RUN_M18_REJECTION = process.env.RUN_ISOLATED_M18_COMPAT_INT === "true";

describe.runIf(RUN_M18_REJECTION)(
  "W2A-T03-F02 Real M18 Database Admin Activation Rejection (Incremental Upgrade Stage)",
  () => {
    const runTag = crypto.randomUUID().slice(0, 8);
    const adminEmail = `w2a-t03-m18-admin-${runTag}@example.invalid`;
    const superAdminEmail = `w2a-t03-m18-sa-${runTag}@example.invalid`;
    const testPassword = `Lna!M18#${runTag}99`;

    let adminUserId = "";
    let superAdminUserId = "";
    let adminCookiesAal2 = new Map<string, string>();
    let superAdminCookiesAal2 = new Map<string, string>();

    beforeAll(async () => {
      const { supabaseUrl, publishableKey } = assertIsolatedTestEnvironment();
      const db = createSupabaseAdminClient();

      const [adminUser, superUser] = await Promise.all([
        db.auth.admin.createUser({
          email: adminEmail,
          password: testPassword,
          email_confirm: true,
          user_metadata: { role: "super_admin", account_state: "active" },
        }),
        db.auth.admin.createUser({
          email: superAdminEmail,
          password: testPassword,
          email_confirm: true,
        }),
      ]);

      if (adminUser.error || !adminUser.data.user) {
        throw new Error(`Failed creating M18 admin user: ${adminUser.error?.message}`);
      }
      if (superUser.error || !superUser.data.user) {
        throw new Error(`Failed creating M18 super_admin user: ${superUser.error?.message}`);
      }

      adminUserId = adminUser.data.user.id;
      superAdminUserId = superUser.data.user.id;

      const { error: profilesError } = await db.from("profiles").insert([
        {
          id: adminUserId,
          email: adminEmail,
          full_name: "M18 Blocked Admin",
          role: "admin",
          account_state: "active",
        },
        {
          id: superAdminUserId,
          email: superAdminEmail,
          full_name: "M18 Active Super Admin",
          role: "super_admin",
          account_state: "active",
        },
      ]);
      if (profilesError) {
        throw new Error(`Failed seeding M18 staff profiles: ${profilesError.message}`);
      }

      const [adminSessions, superSessions] = await Promise.all([
        createSessionCookieSnapshots(supabaseUrl, publishableKey, adminEmail, testPassword),
        createSessionCookieSnapshots(supabaseUrl, publishableKey, superAdminEmail, testPassword),
      ]);
      adminCookiesAal2 = adminSessions.aal2;
      superAdminCookiesAal2 = superSessions.aal2;
    }, 30_000);

    afterEach(() => {
      activeCookieJar = new Map();
      vi.unstubAllEnvs();
    });

    it("fails closed for active AAL2 Admin on an M18 database even when ENABLE_ADMIN_ROLE_RUNTIME=true while preserving Super Admin", async () => {
      vi.stubEnv("ENABLE_ADMIN_ROLE_RUNTIME", "true");

      activeCookieJar = new Map(adminCookiesAal2);
      const adminCheck = await getStaffSessionContext("overview:read");
      expect(adminCheck).toMatchObject({
        ok: false,
        reason: "forbidden",
        userId: adminUserId,
        role: "admin",
      });
      await expect(requireStaff("overview:read")).rejects.toMatchObject({
        code: "FORBIDDEN",
        statusCode: 403,
      });

      activeCookieJar = new Map(superAdminCookiesAal2);
      const superStaff = await requireStaff("overview:read");
      expect(superStaff).toMatchObject({
        userId: superAdminUserId,
        role: "super_admin",
        accountState: "active",
        aal: "aal2",
      });
    });
  }
);

describe.runIf(RUN_M19_INTEGRATION)(
  "W2A-T03-F01 Real App-to-Supabase Auth/AAL2/M19 Integration",
  () => {
    const runTag = crypto.randomUUID().slice(0, 8);
    const crockfordSuffix = runTag.slice(0, 4).toUpperCase();
    const courseId = crypto.randomUUID();
    const batchId = crypto.randomUUID();
    const enrollmentId = crypto.randomUUID();
    const publicRef = `LNA-T300-${crockfordSuffix}`;

    const adminEmail = `w2a-t03-admin-${runTag}@example.invalid`;
    const inactiveAdminEmail = `w2a-t03-inactive-${runTag}@example.invalid`;
    const superAdminEmail = `w2a-t03-sa-${runTag}@example.invalid`;
    const createdStudentEmail = `w2a-t03-student-${runTag}@example.invalid`;
    const testPassword = `Lna!Ci#${runTag}99`;

    let adminUserId = "";
    let inactiveAdminUserId = "";
    let superAdminUserId = "";

    let adminCookiesAal1 = new Map<string, string>();
    let adminCookiesAal2 = new Map<string, string>();
    let inactiveAdminCookiesAal2 = new Map<string, string>();
    let superAdminCookiesAal2 = new Map<string, string>();
    let enrollmentRevision = "";

    beforeAll(async () => {
      const { supabaseUrl, publishableKey } = assertIsolatedTestEnvironment();
      const db = createSupabaseAdminClient();

      // Create auth users with intentionally spoofed user_metadata to verify server ignores metadata claims.
      const [adminUser, inactiveUser, superUser] = await Promise.all([
        db.auth.admin.createUser({
          email: adminEmail,
          password: testPassword,
          email_confirm: true,
          user_metadata: { role: "super_admin", account_state: "active" },
        }),
        db.auth.admin.createUser({
          email: inactiveAdminEmail,
          password: testPassword,
          email_confirm: true,
          user_metadata: { role: "super_admin", account_state: "active" },
        }),
        db.auth.admin.createUser({
          email: superAdminEmail,
          password: testPassword,
          email_confirm: true,
          user_metadata: { role: "admin" },
        }),
      ]);

      if (adminUser.error || !adminUser.data.user) {
        throw new Error(`Failed creating admin auth user: ${adminUser.error?.message}`);
      }
      if (inactiveUser.error || !inactiveUser.data.user) {
        throw new Error(`Failed creating inactive auth user: ${inactiveUser.error?.message}`);
      }
      if (superUser.error || !superUser.data.user) {
        throw new Error(`Failed creating super_admin auth user: ${superUser.error?.message}`);
      }

      adminUserId = adminUser.data.user.id;
      inactiveAdminUserId = inactiveUser.data.user.id;
      superAdminUserId = superUser.data.user.id;

      const { error: profilesError } = await db.from("profiles").insert([
        {
          id: adminUserId,
          email: adminEmail,
          full_name: "CI Operational Admin",
          role: "admin",
          account_state: "active",
        },
        {
          id: inactiveAdminUserId,
          email: inactiveAdminEmail,
          full_name: "CI Disabled Admin",
          role: "admin",
          account_state: "disabled",
        },
        {
          id: superAdminUserId,
          email: superAdminEmail,
          full_name: "CI Super Admin",
          role: "super_admin",
          account_state: "active",
        },
      ]);
      if (profilesError) {
        throw new Error(`Failed seeding CI staff profiles: ${profilesError.message}`);
      }

      const [adminSessions, inactiveSessions, superSessions] = await Promise.all([
        createSessionCookieSnapshots(supabaseUrl, publishableKey, adminEmail, testPassword),
        createSessionCookieSnapshots(supabaseUrl, publishableKey, inactiveAdminEmail, testPassword),
        createSessionCookieSnapshots(supabaseUrl, publishableKey, superAdminEmail, testPassword),
      ]);

      adminCookiesAal1 = adminSessions.aal1;
      adminCookiesAal2 = adminSessions.aal2;
      inactiveAdminCookiesAal2 = inactiveSessions.aal2;
      superAdminCookiesAal2 = superSessions.aal2;

      const { error: courseError } = await db.from("courses").insert({
        id: courseId,
        slug: `w2a-t03-int-course-${runTag}`,
        title: "CI Integration Course",
        subtitle: "Synthetic isolated verification course",
        category: "Training",
        summary: "Synthetic course summary for isolated Auth integration verification.",
        description: "Synthetic course description for isolated Auth integration verification.",
        venue: "Dhaka",
        status: "published",
        published_at: new Date().toISOString(),
        provenance: { class: "B", verified: false, source: "W2A-T03-F01 CI integration test" },
      });
      if (courseError) throw new Error(`Failed seeding fixture course: ${courseError.message}`);

      const { error: batchError } = await db.from("batches").insert({
        id: batchId,
        course_id: courseId,
        slug: `w2a-t03-int-batch-${runTag}`,
        batch_number: 1,
        name: "CI Integration Batch",
        start_date: "2027-01-15",
        end_date: "2027-01-20",
        schedule_description: "Weekend sessions",
        capacity: 25,
        fee_poisha: 0,
        venue: "Dhaka",
        status: "open_for_enrollment",
        provenance: { class: "B", verified: false, source: "W2A-T03-F01 CI integration test" },
      });
      if (batchError) throw new Error(`Failed seeding fixture batch: ${batchError.message}`);

      const { data: enrollmentRow, error: enrError } = await db
        .from("enrollments")
        .insert({
          id: enrollmentId,
          public_ref: publicRef,
          course_id: courseId,
          batch_id: batchId,
          full_name: "CI Integration Applicant",
          email: `w2a-t03-applicant-${runTag}@example.invalid`,
          phone: "01799000111",
          payment_method: "free",
          payment_status: "not_required",
          base_fee_poisha: 0,
          payable_poisha: 0,
          status: "application_in_process",
          is_dev_fixture: true,
          fixture_label: "W2A-T03-F01 CI integration",
        })
        .select("updated_at")
        .single();
      if (enrError || !enrollmentRow) {
        throw new Error(`Failed seeding fixture enrollment: ${enrError?.message ?? "missing row"}`);
      }
      enrollmentRevision = enrollmentRow.updated_at;
    }, 30_000);

    afterEach(() => {
      activeCookieJar = new Map();
      gatewayVerifyAuthMock.mockClear();
      gatewayRefundMock.mockClear();
      vi.unstubAllEnvs();
      vi.restoreAllMocks();
    });

    it("denies active AAL2 Admin when ENABLE_ADMIN_ROLE_RUNTIME is false while preserving Super Admin", async () => {
      vi.stubEnv("ENABLE_ADMIN_ROLE_RUNTIME", "false");

      activeCookieJar = new Map(adminCookiesAal2);
      const adminCheck = await getStaffSessionContext("overview:read");
      expect(adminCheck).toMatchObject({
        ok: false,
        reason: "forbidden",
        userId: adminUserId,
        role: "admin",
      });
      await expect(requireStaff("overview:read")).rejects.toMatchObject({
        code: "FORBIDDEN",
        statusCode: 403,
      });
      await expect(
        manageEnrollmentRecord(
          { id: enrollmentId, revision: enrollmentRevision, operation: "archive" },
          {},
          new FormData()
        )
      ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });

      activeCookieJar = new Map(superAdminCookiesAal2);
      const superStaff = await requireStaff("overview:read");
      expect(superStaff).toMatchObject({
        userId: superAdminUserId,
        role: "super_admin",
        accountState: "active",
        aal: "aal2",
      });
      const listRes = await listAdminEnrollments({ search: publicRef, page: 1 }, superStaff);
      expect(listRes.items.some((item) => item.id === enrollmentId)).toBe(true);
    });

    it("enforces AAL1 MFA step-up and inactive account denial even when activation is enabled", async () => {
      vi.stubEnv("ENABLE_ADMIN_ROLE_RUNTIME", "true");

      activeCookieJar = new Map(adminCookiesAal1);
      const aal1Check = await getStaffSessionContext("overview:read");
      expect(aal1Check).toMatchObject({
        ok: false,
        reason: "mfa_required",
        userId: adminUserId,
        role: "admin",
      });
      await expect(requireStaff("overview:read")).rejects.toMatchObject({
        code: "MFA_REQUIRED",
        statusCode: 403,
      });

      activeCookieJar = new Map(inactiveAdminCookiesAal2);
      const inactiveCheck = await getStaffSessionContext("overview:read");
      expect(inactiveCheck).toMatchObject({
        ok: false,
        reason: "inactive",
        userId: inactiveAdminUserId,
      });
      await expect(requireStaff("overview:read")).rejects.toMatchObject({
        code: "ACCOUNT_INACTIVE",
        statusCode: 403,
      });
    });

    it("grants authorized Admin operational access against M19 DB and records server-derived actor identity", async () => {
      vi.stubEnv("ENABLE_ADMIN_ROLE_RUNTIME", "true");
      vi.stubEnv("BKASH_CHECKOUT_MODE", "closed");
      activeCookieJar = new Map(adminCookiesAal2);

      // Even though Auth user_metadata spoofed role: "super_admin", server derives "admin" from public.profiles.
      const staff = await requireStaff("enrollments:read");
      expect(staff).toEqual({
        userId: adminUserId,
        email: adminEmail,
        fullName: "CI Operational Admin",
        role: "admin",
        accountState: "active",
        aal: "aal2",
        adminActivated: true,
      });

      const listRes = await listAdminEnrollments({ search: publicRef, page: 1 }, staff);
      expect(listRes.items.some((item) => item.id === enrollmentId)).toBe(true);

      const detail = await getAdminEnrollmentDetail(enrollmentId, staff);
      expect(detail?.id).toBe(enrollmentId);

      // Operational archive + restore through manageEnrollmentRecord -> real M19 manage_staff_enrollment RPC
      const archiveResult = await manageEnrollmentRecord(
        { id: enrollmentId, revision: enrollmentRevision, operation: "archive" },
        {},
        new FormData()
      );
      expect(archiveResult).toEqual({ success: true });

      const db = createSupabaseAdminClient();
      const { data: afterArchive } = await db
        .from("enrollments")
        .select("updated_at, archived_at")
        .eq("id", enrollmentId)
        .single();
      expect(afterArchive?.archived_at).not.toBeNull();

      const restoreResult = await manageEnrollmentRecord(
        { id: enrollmentId, revision: afterArchive!.updated_at, operation: "restore" },
        {},
        new FormData()
      );
      expect(restoreResult).toEqual({ success: true });

      const { data: afterRestore } = await db
        .from("enrollments")
        .select("updated_at, archived_at")
        .eq("id", enrollmentId)
        .single();
      expect(afterRestore?.archived_at).toBeNull();
      enrollmentRevision = afterRestore!.updated_at;

      // Operational student creation via saveStudent -> real M19 manage_staff_student RPC
      const studentForm = new FormData();
      studentForm.set("fullName", "CI Created Student");
      studentForm.set("email", createdStudentEmail);
      studentForm.set("phone", "01711000222");
      studentForm.set("university", "Dhaka University");
      expect(await saveStudent({ operation: "create" }, {}, studentForm)).toEqual({
        success: true,
      });

      // Verify server-derived actor identity persisted in real audit_events (never user_metadata super_admin)
      const { data: auditRows, error: auditErr } = await db
        .from("audit_events")
        .select("actor_id, actor_role, action, audit_scope, batch_id")
        .eq("actor_id", adminUserId)
        .order("created_at", { ascending: false });
      expect(auditErr).toBeNull();
      expect(auditRows?.length).toBeGreaterThanOrEqual(2);
      const enrollmentAudit = auditRows?.find((r) => r.action === "staff_archived_enrollment");
      expect(enrollmentAudit).toMatchObject({
        actor_id: adminUserId,
        actor_role: "admin",
        audit_scope: "batch",
        batch_id: batchId,
      });

      // Staff cron reconciliation fallback passes at enrollments:verify-payment without external payment calls
      const cronRes = await reconcileCronGet(
        new NextRequest(`http://127.0.0.1:3000/api/cron/reconcile-payments?ref=${publicRef}`)
      );
      expect(cronRes.status).toBe(200);
      await expect(cronRes.json()).resolves.toMatchObject({
        ok: true,
        checkoutMode: "closed",
        skippedClosed: true,
      });
    });

    it("denies Admin access to Settings, purge actions, sandbox refund (with active live+sandbox v2 config & zero external calls), and Super Admin permissions", async () => {
      vi.stubEnv("ENABLE_ADMIN_ROLE_RUNTIME", "true");
      activeCookieJar = new Map(adminCookiesAal2);

      // /admin/settings enforces requireSuperAdmin and redirects Admin away
      await expect(AdminSettingsPage()).rejects.toMatchObject({
        location: "/admin/login?error=forbidden",
      });
      await expect(requireSuperAdmin("settings:manage")).rejects.toMatchObject({
        code: "FORBIDDEN",
        statusCode: 403,
      });

      for (const restricted of [
        "settings:manage",
        "staff:manage",
        "payments:correct-manual",
        "activity:read-global",
      ] as const) {
        await expect(requireStaff(restricted)).rejects.toMatchObject({
          code: "FORBIDDEN",
          statusCode: 403,
        });
      }

      // Purge preview + legacy delete remain Super Admin-only
      await expect(loadPurgeImpact("admission", enrollmentId)).rejects.toMatchObject({
        code: "FORBIDDEN",
        statusCode: 403,
      });

      const admissionPurgeForm = new FormData();
      admissionPurgeForm.set("confirmation", publicRef);
      admissionPurgeForm.set("impactToken", "a".repeat(32));
      await expect(
        manageEnrollmentRecord(
          { id: enrollmentId, revision: enrollmentRevision, operation: "delete" },
          {},
          admissionPurgeForm
        )
      ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });

      const studentPurgeForm = new FormData();
      studentPurgeForm.set("confirmation", createdStudentEmail);
      studentPurgeForm.set("impactToken", "a".repeat(32));
      await expect(
        deleteStudent(
          { id: crypto.randomUUID(), revision: enrollmentRevision, operation: "delete" },
          {},
          studentPurgeForm
        )
      ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });

      // Configure isolated sandbox-v2 live env so real isBkashSandboxRefundEnabled passes
      // and request reaches actual requireSuperAdmin("enrollments:verify-payment") guard.
      vi.stubEnv("BKASH_CHECKOUT_MODE", "live");
      vi.stubEnv("BKASH_SANDBOX_REFUNDS_ENABLED", "true");
      vi.stubEnv("BKASH_BASE_URL", "https://tokenized.sandbox.bka.sh/v2");
      vi.stubEnv("BKASH_APP_KEY", "isolated-test-app-key-0001");
      vi.stubEnv("BKASH_APP_SECRET", "isolated-test-app-secret-0001");
      vi.stubEnv("BKASH_USERNAME", "isolated-test-username-0001");
      vi.stubEnv("BKASH_PASSWORD", "isolated-test-password-0001");

      const originalFetch = globalThis.fetch;
      const nonLoopbackFetchCalls: string[] = [];
      vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
        const rawUrl =
          typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (!isLocalLoopbackSupabaseUrl(rawUrl)) {
          nonLoopbackFetchCalls.push(rawUrl);
          throw new Error(`Unexpected non-loopback fetch: ${rawUrl}`);
        }
        return originalFetch(input, init);
      });

      const refundRes = await sandboxRefundPost(
        new Request("http://127.0.0.1:3000/api/payments/bkash/sandbox-refund", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://127.0.0.1:3000",
          },
          body: JSON.stringify({ paymentAttemptId: crypto.randomUUID() }),
        })
      );
      expect(refundRes.status).toBe(403);
      await expect(refundRes.json()).resolves.toMatchObject({
        ok: false,
        code: "FORBIDDEN",
      });
      expect(gatewayVerifyAuthMock).not.toHaveBeenCalled();
      expect(gatewayRefundMock).not.toHaveBeenCalled();
      expect(nonLoopbackFetchCalls).toEqual([]);

      // Super Admin retains /admin/settings and purge preview access
      activeCookieJar = new Map(superAdminCookiesAal2);
      const settingsElement = await AdminSettingsPage();
      expect(settingsElement).toBeTruthy();
      const impact = await loadPurgeImpact("admission", enrollmentId);
      expect(impact.status).toBe("eligible");
    });
  }
);
