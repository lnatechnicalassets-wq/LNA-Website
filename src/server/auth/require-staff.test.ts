import { describe, it, expect, vi, afterEach } from "vitest";
import { AppError } from "@/lib/errors";
import { isAdminRuntimeActivationEnabled } from "@/server/env";
import * as supabaseClients from "@/server/supabase/clients";
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

    expect(() =>
      assertStaffContextPermission({ ...verifiedSa, role: "admin" }, "enrollments:read")
    ).toThrowError(AppError);

    expect(
      assertStaffContextPermission(
        { ...verifiedSa, role: "admin", adminActivated: true },
        "enrollments:read"
      ).role
    ).toBe("admin");
  });

  describe("W2A-T03 coordinated Admin activation and M19 compatibility gate", () => {
    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllEnvs();
    });

    const activeAdminProfile: StaffProfileLookupResult = {
      id: "user-admin-m19",
      email: "ops@lnabd.org",
      full_name: "Ops Admin",
      role: "admin",
      account_state: "active",
    };

    it("fails closed unless explicitly enabled for an isolated loopback Supabase URL outside Vercel Preview/Production", () => {
      expect(isAdminRuntimeActivationEnabled({})).toBe(false);
      expect(
        isAdminRuntimeActivationEnabled({
          ENABLE_ADMIN_ROLE_RUNTIME: "false",
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        })
      ).toBe(false);
      expect(
        isAdminRuntimeActivationEnabled({
          ENABLE_ADMIN_ROLE_RUNTIME: "true",
          NEXT_PUBLIC_SUPABASE_URL: "https://xyzcompany.supabase.co",
        })
      ).toBe(false);
      expect(
        isAdminRuntimeActivationEnabled({
          ENABLE_ADMIN_ROLE_RUNTIME: "true",
          NEXT_PUBLIC_SUPABASE_URL: "not-a-valid-url",
        })
      ).toBe(false);
      expect(
        isAdminRuntimeActivationEnabled({
          ENABLE_ADMIN_ROLE_RUNTIME: "true",
          VERCEL_ENV: "production",
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        })
      ).toBe(false);
      expect(
        isAdminRuntimeActivationEnabled({
          ENABLE_ADMIN_ROLE_RUNTIME: "true",
          VERCEL_ENV: "preview",
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        })
      ).toBe(false);
      expect(
        isAdminRuntimeActivationEnabled({
          ENABLE_ADMIN_ROLE_RUNTIME: "true",
          VERCEL: "1",
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        })
      ).toBe(false);
      expect(
        isAdminRuntimeActivationEnabled(
          {
            ENABLE_ADMIN_ROLE_RUNTIME: "true",
            NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
          },
          { resolvedSupabaseUrl: "https://xyzcompany.supabase.co" }
        )
      ).toBe(false);
      expect(
        isAdminRuntimeActivationEnabled(
          {
            ENABLE_ADMIN_ROLE_RUNTIME: "true",
            NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
          },
          { resolvedSupabaseUrl: "http://127.0.0.1:54321" }
        )
      ).toBe(true);
      expect(
        isAdminRuntimeActivationEnabled({
          ENABLE_ADMIN_ROLE_RUNTIME: "true",
          NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        })
      ).toBe(true);
      expect(
        isAdminRuntimeActivationEnabled({
          ENABLE_ADMIN_ROLE_RUNTIME: "true",
          NEXT_PUBLIC_SUPABASE_URL: "http://[::1]:54321",
        })
      ).toBe(true);
    });

    it("denies active AAL2 Admin when isolated activation flag is off, rejects hosted env, or fails M19 compatibility", async () => {
      await expect(
        requireStaff("overview:read", {
          isConfigured: () => true,
          isAdminActivationEnabled: () => false,
          checkAdminDatabaseCompatibility: async () => true,
          getSessionClient: async () =>
            makeSessionClient({ userId: activeAdminProfile.id, currentLevel: "aal2" }),
          lookupProfileById: async () => activeAdminProfile,
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });

      await expect(
        requireStaff("overview:read", {
          isConfigured: () => true,
          isAdminActivationEnabled: () => true,
          checkAdminDatabaseCompatibility: async () => false,
          getSessionClient: async () =>
            makeSessionClient({ userId: activeAdminProfile.id, currentLevel: "aal2" }),
          lookupProfileById: async () => activeAdminProfile,
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });

      vi.stubEnv("ENABLE_ADMIN_ROLE_RUNTIME", "true");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://hosted-project.supabase.co");
      await expect(
        requireStaff("overview:read", {
          isConfigured: () => true,
          checkAdminDatabaseCompatibility: async () => true,
          getSessionClient: async () =>
            makeSessionClient({ userId: activeAdminProfile.id, currentLevel: "aal2" }),
          lookupProfileById: async () => activeAdminProfile,
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
    });

    it("fails closed against incompatible M18 schemas and unexpected DB/connection errors during compatibility checks", async () => {
      vi.spyOn(supabaseClients, "createSupabaseAdminClient").mockReturnValueOnce({
        from: () => ({
          select: () => ({
            limit: async () => ({
              data: null,
              error: { code: "42703", message: "column audit_scope does not exist" },
            }),
          }),
        }),
        rpc: async () => ({
          data: null,
          error: { code: "PGRST202", message: "Could not find is_staff_actor_authorized" },
        }),
      } as unknown as ReturnType<typeof supabaseClients.createSupabaseAdminClient>);

      await expect(
        requireStaff("overview:read", {
          isConfigured: () => true,
          isAdminActivationEnabled: () => true,
          getSessionClient: async () =>
            makeSessionClient({ userId: activeAdminProfile.id, currentLevel: "aal2" }),
          lookupProfileById: async () => activeAdminProfile,
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });

      // Thrown connection/client exception during default compatibility check must fail closed
      vi.spyOn(supabaseClients, "createSupabaseAdminClient").mockImplementationOnce(() => {
        throw new Error("ECONNREFUSED local socket");
      });
      await expect(
        requireStaff("overview:read", {
          isConfigured: () => true,
          isAdminActivationEnabled: () => true,
          getSessionClient: async () =>
            makeSessionClient({ userId: activeAdminProfile.id, currentLevel: "aal2" }),
          lookupProfileById: async () => activeAdminProfile,
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });

      // Rejected RPC promise or thrown activation check must also fail closed
      vi.spyOn(supabaseClients, "createSupabaseAdminClient").mockReturnValueOnce({
        from: () => ({
          select: () => ({
            limit: async () => ({ data: [], error: null }),
          }),
        }),
        rpc: async () => {
          throw new Error("network timeout");
        },
      } as unknown as ReturnType<typeof supabaseClients.createSupabaseAdminClient>);
      await expect(
        requireStaff("overview:read", {
          isConfigured: () => true,
          isAdminActivationEnabled: () => true,
          getSessionClient: async () =>
            makeSessionClient({ userId: activeAdminProfile.id, currentLevel: "aal2" }),
          lookupProfileById: async () => activeAdminProfile,
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
    });

    it("accepts M19 compatibility check (columns + RPC) and grants operational permissions while denying Super Admin-only permissions", async () => {
      vi.spyOn(supabaseClients, "createSupabaseAdminClient").mockReturnValue({
        from: () => ({
          select: () => ({
            limit: async () => ({ data: [], error: null }),
          }),
        }),
        rpc: async () => ({ data: true, error: null }),
      } as unknown as ReturnType<typeof supabaseClients.createSupabaseAdminClient>);

      const aal1Check = await getStaffSessionContext("overview:read", {
        isConfigured: () => true,
        isAdminActivationEnabled: () => true,
        getSessionClient: async () =>
          makeSessionClient({
            userId: activeAdminProfile.id,
            currentLevel: "aal1",
            verifiedTotpCount: 1,
          }),
        lookupProfileById: async () => activeAdminProfile,
      });
      expect(aal1Check).toMatchObject({ ok: false, reason: "mfa_required", role: "admin" });

      const staff = await requireStaff("enrollments:read", {
        isConfigured: () => true,
        isAdminActivationEnabled: () => true,
        getSessionClient: async () =>
          makeSessionClient({ userId: activeAdminProfile.id, currentLevel: "aal2" }),
        lookupProfileById: async () => activeAdminProfile,
      });
      expect(staff).toMatchObject({
        userId: activeAdminProfile.id,
        role: "admin",
        adminActivated: true,
        aal: "aal2",
      });

      for (const superOnly of [
        "settings:manage",
        "staff:manage",
        "payments:correct-manual",
        "activity:read-global",
      ] as const) {
        await expect(
          requireStaff(superOnly, {
            isConfigured: () => true,
            isAdminActivationEnabled: () => true,
            getSessionClient: async () =>
              makeSessionClient({ userId: activeAdminProfile.id, currentLevel: "aal2" }),
            lookupProfileById: async () => activeAdminProfile,
          })
        ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
      }
    });
  });
});
