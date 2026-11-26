import { describe, it, expect } from "vitest";
import { AppError } from "@/lib/errors";
import {
  assertStaffContextPermission,
  getStaffSessionContext,
  requireAllStaffPermissions,
  requireStaff,
  requireSuperAdmin,
  type StaffPermission,
  type StaffProfileLookupResult,
  type StaffSessionClientLike,
} from "./require-staff";

function makeSessionClient(overrides?: {
  userId?: string | null;
  email?: string | null;
  currentLevel?: string | null;
  verifiedTotpCount?: number;
}): StaffSessionClientLike {
  const userId = overrides && "userId" in overrides ? (overrides.userId ?? null) : "user-1";
  const currentLevel: string | null =
    overrides && "currentLevel" in overrides ? (overrides.currentLevel ?? null) : "aal2";
  const totpCount = overrides?.verifiedTotpCount ?? 1;
  const factors = Array.from({ length: totpCount }, (_, i) => ({
    id: `factor-${i}`,
    factor_type: "totp",
    status: "verified",
  }));

  return {
    auth: {
      getUser: async () => ({
        data: {
          user: userId ? { id: userId, email: overrides?.email ?? "admin@lnabd.org" } : null,
        },
        error: null,
      }),
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel, nextLevel: "aal2" },
          error: null,
        }),
        listFactors: async () => ({
          data: { totp: factors, all: factors },
          error: null,
        }),
      },
    },
  };
}

describe("requireStaff & getStaffSessionContext (Rule R8, FR-AUT-002..004, AT-08)", () => {
  it("fails closed with SUPABASE_NOT_CONFIGURED when Supabase env is absent", async () => {
    const check = await getStaffSessionContext("enrollments:read", {
      isConfigured: () => false,
    });
    expect(check).toEqual({ ok: false, reason: "not_configured" });

    await expect(
      requireStaff("enrollments:read", { isConfigured: () => false })
    ).rejects.toThrowError(AppError);
  });

  it("rejects unauthenticated requests", async () => {
    await expect(
      requireStaff("enrollments:read", {
        isConfigured: () => true,
        getSessionClient: async () => makeSessionClient({ userId: null }),
      })
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED", statusCode: 401 });
  });

  it("rejects authenticated users missing an authoritative public.profiles row (user_metadata cannot grant access)", async () => {
    await expect(
      requireStaff("enrollments:read", {
        isConfigured: () => true,
        getSessionClient: async () => makeSessionClient({ userId: "spoofed-user" }),
        lookupProfileById: async () => null,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
  });

  it("rejects disabled or archived staff profiles cleanly", async () => {
    const disabledProfile: StaffProfileLookupResult = {
      id: "user-disabled",
      email: "old@lnabd.org",
      full_name: "Former Staff",
      role: "super_admin",
      account_state: "disabled",
    };

    await expect(
      requireStaff("enrollments:read", {
        isConfigured: () => true,
        getSessionClient: async () => makeSessionClient({ userId: "user-disabled" }),
        lookupProfileById: async () => disabledProfile,
      })
    ).rejects.toMatchObject({ code: "ACCOUNT_INACTIVE", statusCode: 403 });
  });

  it("rejects standard admin role for super_admin-only enrollment inspection", async () => {
    const regularAdmin: StaffProfileLookupResult = {
      id: "user-admin",
      email: "editor@lnabd.org",
      full_name: "Content Editor",
      role: "admin",
      account_state: "active",
    };

    await expect(
      requireStaff("enrollments:read", {
        isConfigured: () => true,
        getSessionClient: async () => makeSessionClient({ userId: "user-admin" }),
        lookupProfileById: async () => regularAdmin,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
  });

  it("requires AAL2 TOTP step-up verification even for active super_admin", async () => {
    const superAdmin: StaffProfileLookupResult = {
      id: "user-sa",
      email: "super@lnabd.org",
      full_name: "Founder Superadmin",
      role: "super_admin",
      account_state: "active",
    };

    const aal1Check = await getStaffSessionContext("enrollments:read", {
      isConfigured: () => true,
      getSessionClient: async () =>
        makeSessionClient({ userId: "user-sa", currentLevel: "aal1", verifiedTotpCount: 0 }),
      lookupProfileById: async () => superAdmin,
    });
    expect(aal1Check).toEqual({
      ok: false,
      reason: "mfa_required",
      userId: "user-sa",
      email: "super@lnabd.org",
      role: "super_admin",
      hasVerifiedTotpFactor: false,
    });

    await expect(
      requireStaff("enrollments:read", {
        isConfigured: () => true,
        getSessionClient: async () =>
          makeSessionClient({ userId: "user-sa", currentLevel: "aal1", verifiedTotpCount: 1 }),
        lookupProfileById: async () => superAdmin,
      })
    ).rejects.toMatchObject({ code: "MFA_REQUIRED", statusCode: 403 });

    await expect(
      requireStaff("enrollments:read", {
        isConfigured: () => true,
        getSessionClient: async () =>
          makeSessionClient({ userId: "user-sa", currentLevel: "aal2", verifiedTotpCount: 0 }),
        lookupProfileById: async () => superAdmin,
      })
    ).rejects.toMatchObject({ code: "MFA_REQUIRED", statusCode: 403 });
  });

  it("allows active super_admin verified at AAL2 with verified TOTP factor", async () => {
    const superAdmin: StaffProfileLookupResult = {
      id: "user-sa",
      email: "super@lnabd.org",
      full_name: "Founder Superadmin",
      role: "super_admin",
      account_state: "active",
    };

    const staff = await requireStaff("enrollments:read", {
      isConfigured: () => true,
      getSessionClient: async () =>
        makeSessionClient({ userId: "user-sa", currentLevel: "aal2", verifiedTotpCount: 1 }),
      lookupProfileById: async () => superAdmin,
    });

    expect(staff).toEqual({
      userId: "user-sa",
      email: "super@lnabd.org",
      fullName: "Founder Superadmin",
      role: "super_admin",
      accountState: "active",
      aal: "aal2",
    });
  });

  it("denies active AAL2 Admin accounts across all operational and Super Admin permissions until coordinated activation", async () => {
    const activeAdmin: StaffProfileLookupResult = {
      id: "user-admin-aal2",
      email: "ops@lnabd.org",
      full_name: "Ops Admin",
      role: "admin",
      account_state: "active",
    };

    const guardedPermissions: ReadonlyArray<StaffPermission> = [
      "overview:read",
      "catalog:edit",
      "catalog:publish",
      "enrollments:read",
      "enrollments:create",
      "enrollments:manage",
      "enrollments:verify-payment",
      "students:edit",
      "transactions:read",
      "reports:export",
      "cms:edit",
      "notifications:send",
      "payments:correct-manual",
      "staff:manage",
      "settings:manage",
      "activity:read-global",
    ];

    for (const permission of guardedPermissions) {
      await expect(
        requireStaff(permission, {
          isConfigured: () => true,
          getSessionClient: async () =>
            makeSessionClient({
              userId: "user-admin-aal2",
              currentLevel: "aal2",
              verifiedTotpCount: 1,
            }),
          lookupProfileById: async () => activeAdmin,
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
    }
  });

  it("fails closed for unknown profile roles and unknown permission strings", async () => {
    const unknownRoleProfile: StaffProfileLookupResult = {
      id: "user-unknown-role",
      email: "role@lnabd.org",
      full_name: "Spoofed Role",
      role: "owner",
      account_state: "active",
    };

    await expect(
      requireStaff("enrollments:read", {
        isConfigured: () => true,
        getSessionClient: async () =>
          makeSessionClient({
            userId: "user-unknown-role",
            currentLevel: "aal2",
            verifiedTotpCount: 1,
          }),
        lookupProfileById: async () => unknownRoleProfile,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });

    const superAdmin: StaffProfileLookupResult = {
      id: "user-sa",
      email: "super@lnabd.org",
      full_name: "Founder Superadmin",
      role: "super_admin",
      account_state: "active",
    };

    await expect(
      requireStaff("records:routine-purge" as StaffPermission, {
        isConfigured: () => true,
        getSessionClient: async () =>
          makeSessionClient({ userId: "user-sa", currentLevel: "aal2", verifiedTotpCount: 1 }),
        lookupProfileById: async () => superAdmin,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
  });

  it("enforces requireSuperAdmin, requireAllStaffPermissions, and assertStaffContextPermission fail-closed boundaries", async () => {
    const superAdmin: StaffProfileLookupResult = {
      id: "user-sa",
      email: "super@lnabd.org",
      full_name: "Founder Superadmin",
      role: "super_admin",
      account_state: "active",
    };
    const activeAdmin: StaffProfileLookupResult = {
      id: "user-admin",
      email: "ops@lnabd.org",
      full_name: "Ops Admin",
      role: "admin",
      account_state: "active",
    };

    await expect(
      requireSuperAdmin("staff:manage", {
        isConfigured: () => true,
        getSessionClient: async () => makeSessionClient({ userId: "user-admin" }),
        lookupProfileById: async () => activeAdmin,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });

    const verifiedSa = await requireSuperAdmin("staff:manage", {
      isConfigured: () => true,
      getSessionClient: async () => makeSessionClient({ userId: "user-sa" }),
      lookupProfileById: async () => superAdmin,
    });
    expect(verifiedSa.role).toBe("super_admin");

    await expect(
      requireAllStaffPermissions([], {
        isConfigured: () => true,
        getSessionClient: async () => makeSessionClient({ userId: "user-sa" }),
        lookupProfileById: async () => superAdmin,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });

    const allPermsSa = await requireAllStaffPermissions(
      ["enrollments:read", "payments:correct-manual", "staff:manage"],
      {
        isConfigured: () => true,
        getSessionClient: async () => makeSessionClient({ userId: "user-sa" }),
        lookupProfileById: async () => superAdmin,
      }
    );
    expect(allPermsSa.userId).toBe("user-sa");

    expect(() =>
      assertStaffContextPermission({ ...verifiedSa, role: "admin" }, "staff:manage")
    ).toThrowError(AppError);

    expect(() =>
      assertStaffContextPermission(
        { ...verifiedSa, accountState: "disabled" as unknown as "active" },
        "enrollments:read"
      )
    ).toThrowError(AppError);

    expect(() =>
      assertStaffContextPermission(
        { ...verifiedSa, aal: "aal1" as unknown as "aal2" },
        "enrollments:read"
      )
    ).toThrowError(AppError);
  });
});
