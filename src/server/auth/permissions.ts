import "server-only";

/**
 * Authoritative LNA Rev3.0 staff role and permission contract (SEC-01, SEC-02, D64).
 *
 * Security boundaries:
 * - Exactly two supported roles: "admin" and "super_admin".
 * - Deny-by-default: any unknown role, unknown permission, or unmapped capability returns false.
 * - Coordinated activation (W2A-T01): operational "admin" permissions remain INACTIVE at runtime
 *   until W2A-T02 SQL actor/RLS refactors and W2A-T03 coordinated activation are complete.
 */

export const STAFF_ROLES = ["admin", "super_admin"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/**
 * Legacy active permissions currently enforced by existing pre-Rev3.0 routes/actions,
 * retained as first-class operational capabilities in the Rev3.0 target matrix.
 */
export const LEGACY_OPERATIONAL_PERMISSIONS = [
  "enrollments:read",
  "enrollments:create",
  "enrollments:verify-payment",
  "enrollments:manage",
  "catalog:edit",
] as const;

/**
 * Operational permissions granted to both Admin and Super Admin in the approved Rev3.0 matrix.
 * Includes the preserved legacy permissions plus target Rev3.0 operational boundaries.
 */
export const ADMIN_OPERATIONAL_PERMISSIONS = [
  ...LEGACY_OPERATIONAL_PERMISSIONS,
  "overview:read",
  "catalog:read",
  "catalog:publish",
  "catalog:archive",
  "catalog:delete-unused-draft",
  "students:read",
  "students:edit",
  "receipts:download",
  "transactions:read",
  "reports:read",
  "reports:export",
  "cms:read",
  "cms:edit",
  "notifications:send",
  "email:retry",
  "activity:read-batch",
  "activity:read-website",
  "account:manage-self",
] as const;

/**
 * Permissions strictly reserved for Super Admin in the approved Rev3.0 role matrix.
 */
export const SUPER_ADMIN_ONLY_PERMISSIONS = [
  "payments:correct-manual",
  "staff:manage",
  "settings:manage",
  "activity:read-global",
] as const;

export const STAFF_PERMISSIONS = [
  ...ADMIN_OPERATIONAL_PERMISSIONS,
  ...SUPER_ADMIN_ONLY_PERMISSIONS,
] as const;

export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

/**
 * Operations explicitly prohibited for ALL roles (including Super Admin) under Rev3.0.
 * Never included in StaffPermission or granted by any role table.
 */
export const PROHIBITED_STAFF_OPERATIONS = [
  "payments:rewrite-gateway-evidence",
  "payments:execute-refund",
  "records:routine-purge",
] as const;

export type ProhibitedStaffOperation = (typeof PROHIBITED_STAFF_OPERATIONS)[number];

/**
 * Descriptive status constant indicating that Admin operational permissions remain
 * inactive during W2A-T01. This constant is informational only and does NOT toggle
 * ACTIVE_ROLE_PERMISSIONS at runtime; Admin privileges stay frozen at [] until
 * coordinated W2A-T02 SQL/actor guards and W2A-T03 activation are implemented.
 */
export const COORDINATED_ADMIN_ACTIVATION_READY = false as const;

export const TARGET_ROLE_PERMISSIONS: Readonly<Record<StaffRole, ReadonlyArray<StaffPermission>>> =
  {
    admin: ADMIN_OPERATIONAL_PERMISSIONS,
    super_admin: [...ADMIN_OPERATIONAL_PERMISSIONS, ...SUPER_ADMIN_ONLY_PERMISSIONS],
  };

export const ACTIVE_ROLE_PERMISSIONS: Readonly<Record<StaffRole, ReadonlyArray<StaffPermission>>> =
  {
    admin: [],
    super_admin: TARGET_ROLE_PERMISSIONS.super_admin,
  };

const VALID_ROLE_SET = new Set<string>(STAFF_ROLES);
const VALID_PERMISSION_SET = new Set<string>(STAFF_PERMISSIONS);

const TARGET_PERMISSION_SETS: Readonly<Record<StaffRole, ReadonlySet<string>>> = {
  admin: new Set<string>(TARGET_ROLE_PERMISSIONS.admin),
  super_admin: new Set<string>(TARGET_ROLE_PERMISSIONS.super_admin),
};

const ACTIVE_PERMISSION_SETS: Readonly<Record<StaffRole, ReadonlySet<string>>> = {
  admin: new Set<string>(ACTIVE_ROLE_PERMISSIONS.admin),
  super_admin: new Set<string>(ACTIVE_ROLE_PERMISSIONS.super_admin),
};

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && VALID_ROLE_SET.has(value);
}

export function isStaffPermission(value: unknown): value is StaffPermission {
  return typeof value === "string" && VALID_PERMISSION_SET.has(value);
}

export function isSuperAdminOnlyPermission(permission: unknown): boolean {
  return (
    isStaffPermission(permission) &&
    (SUPER_ADMIN_ONLY_PERMISSIONS as ReadonlyArray<string>).includes(permission)
  );
}

/**
 * Evaluates the approved Rev3.0 target role matrix (for contract checks and coordinated planning).
 * Always fails closed (returns false) for unknown roles or unknown/prohibited permissions.
 */
export function hasTargetRolePermission(role: unknown, permission: unknown): boolean {
  if (!isStaffRole(role) || !isStaffPermission(permission)) {
    return false;
  }
  return TARGET_PERMISSION_SETS[role].has(permission);
}

/**
 * Evaluates currently active runtime permissions enforced by requireStaff().
 * Preserves existing Super Admin capabilities while keeping Admin operational grants inactive
 * until W2A-T02/W2A-T03 coordinated database and server activation.
 */
export function hasActiveRolePermission(role: unknown, permission: unknown): boolean {
  if (!isStaffRole(role) || !isStaffPermission(permission)) {
    return false;
  }
  return ACTIVE_PERMISSION_SETS[role].has(permission);
}

export type StaffSurfaceKind = "page" | "action" | "api" | "rpc" | "service";

export type InventoryTransitionPolicy =
  | "target_matrix"
  | "super_admin_only_until_w2a_t06"
  | "public_published_or_admin_preview"
  | "cron_secret_or_staff_permission"
  | "same_origin_authenticated";

export interface StaffAccessInventoryEntry {
  readonly id: string;
  readonly kind: StaffSurfaceKind;
  readonly location: string;
  readonly currentPermission:
    | StaffPermission
    | "session_same_origin"
    | "cron_or_staff_read"
    | "public_published_or_catalog_edit"
    | "service_super_admin_guard";
  readonly targetPermission:
    | StaffPermission
    | "authenticated_self"
    | "retire_w2a_t06"
    | "public_published_or_cms_read"
    | "cron_secret_or_enrollments_verify_payment"
    | "super_admin_only_transition";
  readonly transitionPolicy: InventoryTransitionPolicy;
  readonly rpcs: ReadonlyArray<string>;
  readonly coordinatedRefactorNote?: string;
}

/**
 * Evaluates whether future coordinated Admin activation (W2A-T02/W2A-T03) may grant
 * access to an inventoried surface. Transitional purge and sandbox-refund operations
 * remain strictly Super Admin-only until retired in W2A-T06 and MUST NEVER be broadened to Admin.
 */
export function isSurfaceEligibleForFutureAdminActivation(
  entry: StaffAccessInventoryEntry
): boolean {
  if (entry.transitionPolicy === "super_admin_only_until_w2a_t06") {
    return false;
  }
  if (
    entry.targetPermission === "retire_w2a_t06" ||
    entry.targetPermission === "super_admin_only_transition"
  ) {
    return false;
  }
  if (entry.targetPermission === "cron_secret_or_enrollments_verify_payment") {
    return hasTargetRolePermission("admin", "enrollments:verify-payment");
  }
  if (entry.targetPermission === "public_published_or_cms_read") {
    return hasTargetRolePermission("admin", "cms:read");
  }
  if (entry.targetPermission === "authenticated_self") {
    return true;
  }
  return hasTargetRolePermission("admin", entry.targetPermission);
}

/**
 * Authoritative route, server action, API endpoint, and database RPC inventory
 * for subsequent coordinated W2A-T02 (SQL) and W2A-T03 / W2A-T06 activation.
 */
export const STAFF_ACCESS_INVENTORY: ReadonlyArray<StaffAccessInventoryEntry> = [
  {
    id: "admin-overview-page",
    kind: "page",
    location: "src/app/admin/page.tsx",
    currentPermission: "enrollments:read",
    targetPermission: "overview:read",
    transitionPolicy: "target_matrix",
    rpcs: [],
  },
  {
    id: "admin-login-page",
    kind: "page",
    location: "src/app/admin/login/page.tsx",
    currentPermission: "enrollments:read",
    targetPermission: "overview:read",
    transitionPolicy: "target_matrix",
    rpcs: [],
    coordinatedRefactorNote:
      "Calls getStaffSessionContext to redirect already-verified AAL2 staff cleanly",
  },
  {
    id: "admin-catalog-list-page",
    kind: "page",
    location: "src/app/admin/catalog/[section]/page.tsx",
    currentPermission: "enrollments:read",
    targetPermission: "catalog:read",
    transitionPolicy: "target_matrix",
    rpcs: [],
  },
  {
    id: "admin-catalog-new-page",
    kind: "page",
    location: "src/app/admin/catalog/[section]/new/page.tsx",
    currentPermission: "catalog:edit",
    targetPermission: "catalog:edit",
    transitionPolicy: "target_matrix",
    rpcs: [],
  },
  {
    id: "admin-catalog-new-action",
    kind: "action",
    location: "src/app/admin/catalog/[section]/new/actions.ts",
    currentPermission: "catalog:edit",
    targetPermission: "catalog:edit",
    transitionPolicy: "target_matrix",
    rpcs: ["create_admin_catalog_draft"],
    coordinatedRefactorNote: "W2A-T02 actor/role RPC audit & Admin scope activation",
  },
  {
    id: "admin-catalog-edit-page",
    kind: "page",
    location: "src/app/admin/catalog/[section]/[id]/edit/page.tsx",
    currentPermission: "catalog:edit",
    targetPermission: "catalog:edit",
    transitionPolicy: "target_matrix",
    rpcs: [],
  },
  {
    id: "admin-catalog-edit-action",
    kind: "action",
    location: "src/app/admin/catalog/[section]/[id]/edit/actions.ts",
    currentPermission: "catalog:edit",
    targetPermission: "catalog:edit",
    transitionPolicy: "target_matrix",
    rpcs: ["update_admin_catalog_record"],
    coordinatedRefactorNote: "W2A-T02 actor/role RPC refactor",
  },
  {
    id: "admin-catalog-publish-action",
    kind: "action",
    location: "src/app/admin/catalog/[section]/[id]/edit/publish-action.ts",
    currentPermission: "catalog:edit",
    targetPermission: "catalog:publish",
    transitionPolicy: "target_matrix",
    rpcs: ["publish_admin_catalog_draft"],
    coordinatedRefactorNote: "W2A-T02/W1-T03 transition to explicit catalog:publish",
  },
  {
    id: "admin-catalog-archive-action",
    kind: "action",
    location: "src/app/admin/catalog/[section]/catalog-archive-action.ts",
    currentPermission: "catalog:edit",
    targetPermission: "catalog:archive",
    transitionPolicy: "target_matrix",
    rpcs: ["archive_staff_catalog"],
    coordinatedRefactorNote: "W2A-T02/W1-T03 transition to explicit catalog:archive",
  },
  {
    id: "admin-catalog-batch-mentors-action",
    kind: "action",
    location: "src/app/admin/catalog/[section]/[id]/edit/batch-mentor-actions.ts",
    currentPermission: "catalog:edit",
    targetPermission: "catalog:edit",
    transitionPolicy: "target_matrix",
    rpcs: ["set_staff_batch_mentors"],
    coordinatedRefactorNote: "W2A-T02 actor/role RPC refactor",
  },
  {
    id: "admin-mentors-page",
    kind: "page",
    location: "src/app/admin/mentors/page.tsx",
    currentPermission: "catalog:edit",
    targetPermission: "cms:read",
    transitionPolicy: "target_matrix",
    rpcs: [],
  },
  {
    id: "admin-mentors-action",
    kind: "action",
    location: "src/app/admin/mentors/actions.ts",
    currentPermission: "catalog:edit",
    targetPermission: "cms:edit",
    transitionPolicy: "target_matrix",
    rpcs: ["save_staff_mentor_profile"],
    coordinatedRefactorNote: "W2A-T02 actor/role RPC refactor; W7 aligns Website CMS scope",
  },
  {
    id: "legacy-mentor-rpc",
    kind: "rpc",
    location: "supabase/migrations/20261116050000_staff_people_directories.sql#manage_staff_mentor",
    currentPermission: "catalog:edit",
    targetPermission: "cms:edit",
    transitionPolicy: "target_matrix",
    rpcs: ["manage_staff_mentor"],
    coordinatedRefactorNote:
      "Service-only SQL RPC present from 20261116050000; superseded in UI by save_staff_mentor_profile, audit/retire in W2A-T02",
  },
  {
    id: "api-mentor-media",
    kind: "api",
    location: "src/app/api/mentor-media/[asset]/route.ts",
    currentPermission: "public_published_or_catalog_edit",
    targetPermission: "public_published_or_cms_read",
    transitionPolicy: "public_published_or_admin_preview",
    rpcs: [],
    coordinatedRefactorNote:
      "Public unauthenticated read when asset is referenced by published, non-fixture, non-archived mentor; otherwise requires requireStaff('catalog:edit') (target 'cms:read') for unpublished/archived/fixture staff previews",
  },
  {
    id: "admin-enrollments-list-page",
    kind: "page",
    location: "src/app/admin/enrollments/page.tsx",
    currentPermission: "enrollments:read",
    targetPermission: "enrollments:read",
    transitionPolicy: "target_matrix",
    rpcs: [],
    coordinatedRefactorNote: "Service layer calls assertVerifiedSuperAdmin(staff) until W2A-T03",
  },
  {
    id: "admin-enrollments-detail-page",
    kind: "page",
    location: "src/app/admin/enrollments/[id]/page.tsx",
    currentPermission: "enrollments:read",
    targetPermission: "enrollments:read",
    transitionPolicy: "target_matrix",
    rpcs: [],
    coordinatedRefactorNote: "Service layer calls assertVerifiedSuperAdmin(staff) until W2A-T03",
  },
  {
    id: "admin-enrollments-service-reads",
    kind: "service",
    location: "src/server/enrollment/service.ts#listAdminEnrollments+getAdminEnrollmentDetail",
    currentPermission: "service_super_admin_guard",
    targetPermission: "enrollments:read",
    transitionPolicy: "target_matrix",
    rpcs: [],
    coordinatedRefactorNote:
      "Hardcoded assertVerifiedSuperAdmin(staff) kept until coordinated W2A-T03 Admin enrollment activation",
  },
  {
    id: "admin-enrollments-new-page",
    kind: "page",
    location: "src/app/admin/enrollments/new/page.tsx",
    currentPermission: "enrollments:create",
    targetPermission: "enrollments:create",
    transitionPolicy: "target_matrix",
    rpcs: [],
  },
  {
    id: "admin-enrollments-new-action",
    kind: "action",
    location: "src/app/admin/enrollments/new/actions.ts",
    currentPermission: "enrollments:create",
    targetPermission: "enrollments:create",
    transitionPolicy: "target_matrix",
    rpcs: ["record_staff_manual_enrollment", "create_staff_enrollment"],
    coordinatedRefactorNote: "W2A-T02 RPC refactor + W4-T05 unified manual admission",
  },
  {
    id: "admin-enrollments-manual-payment-action",
    kind: "action",
    location: "src/app/admin/enrollments/[id]/manual-payment-actions.ts",
    currentPermission: "enrollments:verify-payment",
    targetPermission: "enrollments:verify-payment",
    transitionPolicy: "target_matrix",
    rpcs: ["review_staff_manual_payment"],
    coordinatedRefactorNote: "W2A-T02 actor/role RPC refactor; Super Admin corrections separate",
  },
  {
    id: "admin-enrollments-record-actions-manage",
    kind: "action",
    location: "src/app/admin/enrollments/enrollment-record-actions.ts#edit-archive-restore",
    currentPermission: "enrollments:manage",
    targetPermission: "enrollments:manage",
    transitionPolicy: "target_matrix",
    rpcs: ["manage_staff_enrollment"],
    coordinatedRefactorNote: "Operational edit/archive/restore path updated in W2A-T02/W4-T06",
  },
  {
    id: "admin-enrollments-record-actions-purge",
    kind: "action",
    location: "src/app/admin/enrollments/enrollment-record-actions.ts#delete",
    currentPermission: "enrollments:manage",
    targetPermission: "retire_w2a_t06",
    transitionPolicy: "super_admin_only_until_w2a_t06",
    rpcs: ["purge_staff_record"],
    coordinatedRefactorNote:
      "Super Admin-only during transition pending W2A-T06 retirement; future Admin activation must NOT grant access",
  },
  {
    id: "admin-students-page",
    kind: "page",
    location: "src/app/admin/students/page.tsx",
    currentPermission: "enrollments:manage",
    targetPermission: "students:read",
    transitionPolicy: "target_matrix",
    rpcs: [],
  },
  {
    id: "admin-students-actions-edit",
    kind: "action",
    location: "src/app/admin/students/actions.ts#saveStudent+history",
    currentPermission: "enrollments:manage",
    targetPermission: "students:edit",
    transitionPolicy: "target_matrix",
    rpcs: ["manage_staff_student", "manage_staff_course_history"],
    coordinatedRefactorNote: "Operational student/history RPCs aligned in W2A-T02",
  },
  {
    id: "admin-students-actions-purge",
    kind: "action",
    location: "src/app/admin/students/actions.ts#deleteStudent",
    currentPermission: "enrollments:manage",
    targetPermission: "retire_w2a_t06",
    transitionPolicy: "super_admin_only_until_w2a_t06",
    rpcs: ["purge_staff_record"],
    coordinatedRefactorNote:
      "Super Admin-only during transition pending W2A-T06 retirement; future Admin activation must NOT grant access",
  },
  {
    id: "admin-record-purge-preview-action",
    kind: "action",
    location: "src/app/admin/record-purge-actions.ts",
    currentPermission: "enrollments:manage",
    targetPermission: "retire_w2a_t06",
    transitionPolicy: "super_admin_only_until_w2a_t06",
    rpcs: ["preview_staff_record_purge"],
    coordinatedRefactorNote:
      "Super Admin-only during transition pending W2A-T06 retirement; future Admin activation must NOT grant access",
  },
  {
    id: "legacy-purge-rpcs-db",
    kind: "rpc",
    location: "supabase/migrations/20261116153000-180000#legacy-purge-rpcs",
    currentPermission: "service_super_admin_guard",
    targetPermission: "retire_w2a_t06",
    transitionPolicy: "super_admin_only_until_w2a_t06",
    rpcs: ["purge_staff_dev_admission", "purge_staff_student", "purge_staff_admission"],
    coordinatedRefactorNote:
      "Legacy SQL purge RPCs (plus helper functions) are Super Admin-only until explicitly dropped/retired in W2A-T06; future Admin activation must NOT grant access",
  },
  {
    id: "api-payments-sandbox-refund",
    kind: "api",
    location: "src/app/api/payments/bkash/sandbox-refund/route.ts",
    currentPermission: "enrollments:verify-payment",
    targetPermission: "retire_w2a_t06",
    transitionPolicy: "super_admin_only_until_w2a_t06",
    rpcs: [],
    coordinatedRefactorNote:
      "Live refund prohibited in production; Super Admin-only during transition pending W2A-T06 retirement; future Admin activation must NOT grant access",
  },
  {
    id: "api-cron-reconcile-payments",
    kind: "api",
    location: "src/app/api/cron/reconcile-payments/route.ts",
    currentPermission: "cron_or_staff_read",
    targetPermission: "cron_secret_or_enrollments_verify_payment",
    transitionPolicy: "cron_secret_or_staff_permission",
    rpcs: ["record_payment_outcome", "confirm_payment"],
    coordinatedRefactorNote:
      "Preserves separate Authorization: Bearer CRON_SECRET timing-safe machine auth path alongside same-origin authenticated staff fallback (current enrollments:read -> target enrollments:verify-payment)",
  },
  {
    id: "api-admin-logout",
    kind: "api",
    location: "src/app/api/admin/logout/route.ts",
    currentPermission: "session_same_origin",
    targetPermission: "authenticated_self",
    transitionPolicy: "same_origin_authenticated",
    rpcs: [],
    coordinatedRefactorNote: "Same-origin CSRF guard + local session signOut",
  },
];
