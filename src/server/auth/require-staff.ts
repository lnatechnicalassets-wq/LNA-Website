import "server-only";
import { getClientEnv } from "@/env.client";
import { AppError } from "@/lib/errors";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  hasConfiguredSupabaseServerEnv,
} from "@/server/supabase/clients";
import { isAdminRuntimeActivationEnabled, parseCurrentServerEnv } from "@/server/env";
import {
  hasRuntimeStaffPermission,
  isStaffPermission,
  isStaffRole,
  type StaffPermission,
  type StaffRole,
} from "./permissions";

export type { StaffPermission, StaffRole };

export interface VerifiedStaffContext {
  userId: string;
  email: string;
  fullName: string;
  role: StaffRole;
  accountState: "active";
  aal: "aal2";
  /**
   * True only when an Admin context passed both isolated local-Supabase activation gating
   * and the M19 column/RPC compatibility check in `getStaffSessionContext`.
   */
  adminActivated?: boolean;
}

export type StaffSessionCheck =
  | { ok: true; staff: VerifiedStaffContext }
  | {
      ok: false;
      reason: "not_configured" | "unauthenticated" | "inactive" | "forbidden" | "mfa_required";
      userId?: string;
      email?: string;
      role?: StaffRole;
      hasVerifiedTotpFactor?: boolean;
    };

export interface StaffSessionClientLike {
  auth: {
    getUser(): Promise<{
      data: { user: { id: string; email?: string | null } | null };
      error: unknown;
    }>;
    mfa: {
      getAuthenticatorAssuranceLevel(): Promise<{
        data: { currentLevel: string | null; nextLevel: string | null } | null;
        error: unknown;
      }>;
      listFactors(): Promise<{
        data: {
          totp?: Array<{ id: string; status: string }>;
          all?: Array<{ id: string; factor_type?: string; status: string }>;
        } | null;
        error: unknown;
      }>;
    };
  };
}

export interface StaffProfileLookupResult {
  id: string;
  email: string;
  full_name: string;
  role: string;
  account_state: string;
}

export interface StaffAuthDeps {
  isConfigured?: () => boolean;
  isAdminActivationEnabled?: () => boolean;
  checkAdminDatabaseCompatibility?: (userId: string) => Promise<boolean>;
  /** @deprecated Prefer checkAdminDatabaseCompatibility; kept for test injection compatibility. */
  verifyAdminDatabaseBaseline?: (userId: string) => Promise<boolean>;
  getSessionClient?: () => Promise<StaffSessionClientLike>;
  lookupProfileById?: (userId: string) => Promise<StaffProfileLookupResult | null>;
}

/**
 * Performs a bounded M19 column/RPC compatibility check (`audit_events` M19 columns
 * and `is_staff_actor_authorized` RPC returning `true`), NOT exhaustive migration
 * verification. Fails closed on any connection, client, schema, or RPC error.
 */
async function defaultCheckAdminM19Compatibility(userId: string): Promise<boolean> {
  try {
    const admin = createSupabaseAdminClient();
    const [auditColsRes, actorRpcRes] = await Promise.all([
      admin
        .from("audit_events")
        .select("reason, audit_scope, batch_id, secondary_batch_id")
        .limit(0),
      admin.rpc("is_staff_actor_authorized", {
        p_actor_id: userId,
        p_allowed_roles: ["admin"],
      }),
    ]);

    if (auditColsRes.error || actorRpcRes.error) {
      return false;
    }

    return actorRpcRes.data === true;
  } catch {
    return false;
  }
}

function resolveDefaultAdminActivationEnabled(): boolean {
  try {
    parseCurrentServerEnv();
    return isAdminRuntimeActivationEnabled(process.env, {
      resolvedSupabaseUrl: getClientEnv().NEXT_PUBLIC_SUPABASE_URL,
    });
  } catch {
    return false;
  }
}

async function defaultLookupProfileById(userId: string): Promise<StaffProfileLookupResult | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, email, full_name, role, account_state")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as StaffProfileLookupResult;
}

/**
 * Evaluates current Supabase Auth SSR user, TOTP AAL2 assurance level, and authoritative
 * public.profiles row without ever trusting user_metadata (Rule R8, FR-AUT-002..004).
 */
export async function getStaffSessionContext(
  requiredPermission: StaffPermission = "enrollments:read",
  deps?: StaffAuthDeps
): Promise<StaffSessionCheck> {
  const configured = deps?.isConfigured ? deps.isConfigured() : hasConfiguredSupabaseServerEnv();
  if (!configured) {
    return { ok: false, reason: "not_configured" };
  }

  const sessionClient = deps?.getSessionClient
    ? await deps.getSessionClient()
    : ((await createSupabaseServerClient()) as unknown as StaffSessionClientLike);

  const {
    data: { user },
    error: userError,
  } = await sessionClient.auth.getUser();

  if (userError || !user?.id) {
    return { ok: false, reason: "unauthenticated" };
  }

  const profile = deps?.lookupProfileById
    ? await deps.lookupProfileById(user.id)
    : await defaultLookupProfileById(user.id);

  if (!profile) {
    return { ok: false, reason: "forbidden", userId: user.id, email: user.email ?? undefined };
  }

  if (profile.account_state !== "active") {
    return {
      ok: false,
      reason: "inactive",
      userId: profile.id,
      email: profile.email,
    };
  }

  if (!isStaffRole(profile.role)) {
    return { ok: false, reason: "forbidden", userId: profile.id, email: profile.email };
  }

  const role: StaffRole = profile.role;
  let adminActivated = false;

  if (role === "admin") {
    let activationEnabled = false;
    try {
      activationEnabled = deps?.isAdminActivationEnabled
        ? deps.isAdminActivationEnabled()
        : resolveDefaultAdminActivationEnabled();
    } catch {
      activationEnabled = false;
    }
    if (!activationEnabled) {
      return {
        ok: false,
        reason: "forbidden",
        userId: profile.id,
        email: profile.email,
        role,
      };
    }

    let m19Compatible = false;
    try {
      const compatibilityCheck =
        deps?.checkAdminDatabaseCompatibility ??
        deps?.verifyAdminDatabaseBaseline ??
        defaultCheckAdminM19Compatibility;
      m19Compatible = await compatibilityCheck(profile.id);
    } catch {
      m19Compatible = false;
    }
    if (!m19Compatible) {
      return {
        ok: false,
        reason: "forbidden",
        userId: profile.id,
        email: profile.email,
        role,
      };
    }

    adminActivated = true;
  }

  if (
    !isStaffPermission(requiredPermission) ||
    !hasRuntimeStaffPermission(role, requiredPermission, { adminActivated })
  ) {
    return {
      ok: false,
      reason: "forbidden",
      userId: profile.id,
      email: profile.email,
      role,
    };
  }

  // Verify MFA state sequentially after getUser() has authenticated the JWT and active session
  // against Supabase Auth. Never call getSession() or trust session.user for authorization:
  // listFactors() calls Auth getUser(), while getAuthenticatorAssuranceLevel() is only used to
  // check the currentLevel === "aal2" claim on the already-verified session token.
  const factorsRes = await sessionClient.auth.mfa.listFactors();
  const aalRes = await sessionClient.auth.mfa.getAuthenticatorAssuranceLevel();

  const rawFactors: Array<{ id: string; factor_type?: string; status: string }> =
    factorsRes.data?.all ?? factorsRes.data?.totp ?? [];
  const totpFactors = rawFactors.filter(
    (f) => (!f.factor_type || f.factor_type === "totp") && f.status === "verified"
  );
  const hasVerifiedTotpFactor = totpFactors.length > 0;
  const currentLevel = aalRes.data?.currentLevel ?? null;

  if (aalRes.error || currentLevel !== "aal2" || !hasVerifiedTotpFactor) {
    return {
      ok: false,
      reason: "mfa_required",
      userId: profile.id,
      email: profile.email,
      role,
      hasVerifiedTotpFactor,
    };
  }

  return {
    ok: true,
    staff: {
      userId: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role,
      accountState: "active",
      aal: "aal2",
      ...(adminActivated ? { adminActivated: true } : {}),
    },
  };
}

/**
 * Authoritative server-side guard required by every protected admin page, server action,
 * and route handler (Rule R8, SRS FR-ADM-002, NFR-SEC-01).
 */
export async function requireStaff(
  permission: StaffPermission,
  deps?: StaffAuthDeps
): Promise<VerifiedStaffContext> {
  const check = await getStaffSessionContext(permission, deps);
  if (check.ok) {
    return check.staff;
  }

  switch (check.reason) {
    case "not_configured":
      throw new AppError(
        "Supabase authentication is not configured for staff access.",
        "SUPABASE_NOT_CONFIGURED",
        503
      );
    case "unauthenticated":
      throw new AppError("Authentication required.", "UNAUTHENTICATED", 401);
    case "mfa_required":
      throw new AppError("Authenticator app verification (AAL2) is required.", "MFA_REQUIRED", 403);
    case "inactive":
      throw new AppError("Staff account is disabled or archived.", "ACCOUNT_INACTIVE", 403);
    case "forbidden":
      throw new AppError("You do not have permission to access this resource.", "FORBIDDEN", 403);
  }
}

/**
 * Reusable fail-closed permission guard for verified server contexts passed into domain services.
 */
export function assertStaffContextPermission(
  staff: VerifiedStaffContext,
  permission: StaffPermission
): VerifiedStaffContext {
  if (staff.accountState !== "active") {
    throw new AppError("Staff account is disabled or archived.", "ACCOUNT_INACTIVE", 403);
  }
  if (staff.aal !== "aal2") {
    throw new AppError("Authenticator app verification (AAL2) is required.", "MFA_REQUIRED", 403);
  }
  if (
    !isStaffRole(staff.role) ||
    !isStaffPermission(permission) ||
    !hasRuntimeStaffPermission(staff.role, permission, {
      adminActivated: staff.adminActivated === true,
    })
  ) {
    throw new AppError("You do not have permission to access this resource.", "FORBIDDEN", 403);
  }
  return staff;
}

/**
 * Requires an active AAL2 staff session holding ALL listed permissions (empty/unknown list fails closed).
 */
export async function requireAllStaffPermissions(
  permissions: ReadonlyArray<StaffPermission>,
  deps?: StaffAuthDeps
): Promise<VerifiedStaffContext> {
  if (permissions.length === 0 || permissions.some((p) => !isStaffPermission(p))) {
    throw new AppError("You do not have permission to access this resource.", "FORBIDDEN", 403);
  }
  const staff = await requireStaff(permissions[0], deps);
  for (const permission of permissions.slice(1)) {
    assertStaffContextPermission(staff, permission);
  }
  return staff;
}

/**
 * Explicit Super Admin guard for staff lifecycle, settings, manual payment corrections, and global audit.
 * Denies Admin accounts regardless of future operational Admin permission activation.
 */
export async function requireSuperAdmin(
  permission: StaffPermission = "staff:manage",
  deps?: StaffAuthDeps
): Promise<VerifiedStaffContext> {
  const staff = await requireStaff(permission, deps);
  if (staff.role !== "super_admin") {
    throw new AppError("Super Admin access is required for this operation.", "FORBIDDEN", 403);
  }
  return staff;
}
