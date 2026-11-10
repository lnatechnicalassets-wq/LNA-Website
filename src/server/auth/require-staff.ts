import "server-only";
import { AppError } from "@/lib/errors";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  hasConfiguredSupabaseServerEnv,
} from "@/server/supabase/clients";

export type StaffPermission = "enrollments:read";

export type StaffRole = "admin" | "super_admin";

export interface VerifiedStaffContext {
  userId: string;
  email: string;
  fullName: string;
  role: StaffRole;
  accountState: "active";
  aal: "aal2";
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
  getSessionClient?: () => Promise<StaffSessionClientLike>;
  lookupProfileById?: (userId: string) => Promise<StaffProfileLookupResult | null>;
}

const ROLE_PERMISSIONS: Record<StaffRole, ReadonlyArray<StaffPermission>> = {
  super_admin: ["enrollments:read"],
  admin: [],
};

function hasPermission(role: StaffRole, permission: StaffPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
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

  if (profile.role !== "super_admin" && profile.role !== "admin") {
    return { ok: false, reason: "forbidden", userId: profile.id, email: profile.email };
  }

  const role: StaffRole = profile.role;
  if (!hasPermission(role, requiredPermission)) {
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
