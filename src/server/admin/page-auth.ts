import "server-only";

import { redirect } from "next/navigation";
import { adminPaths } from "@/lib/admin-navigation";
import { AppError } from "@/lib/errors";
import {
  requireStaff,
  requireSuperAdmin,
  type StaffPermission,
  type VerifiedStaffContext,
} from "@/server/auth/require-staff";

/**
 * Shared server-page authorization helper for Admin portal routes (Rule R8).
 * Enforces permission and optional Super Admin requirement before any query runs.
 */
export async function requireAdminPage(
  permission: StaffPermission,
  options: { superAdminOnly?: boolean } = {}
): Promise<VerifiedStaffContext> {
  const guard = options.superAdminOnly ? requireSuperAdmin(permission) : requireStaff(permission);

  return guard.catch((error: unknown) => {
    if (!(error instanceof AppError)) throw error;
    if (error.code === "FORBIDDEN" || error.code === "ACCOUNT_INACTIVE") {
      redirect(`${adminPaths.login}?error=forbidden`);
    }
    redirect(adminPaths.login);
  });
}
