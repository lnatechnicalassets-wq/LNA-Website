import { describe, expect, it } from "vitest";
import {
  ACTIVE_ROLE_PERMISSIONS,
  ADMIN_OPERATIONAL_PERMISSIONS,
  COORDINATED_ADMIN_ACTIVATION_READY,
  PROHIBITED_STAFF_OPERATIONS,
  STAFF_ACCESS_INVENTORY,
  STAFF_PERMISSIONS,
  STAFF_ROLES,
  SUPER_ADMIN_ONLY_PERMISSIONS,
  TARGET_ROLE_PERMISSIONS,
  hasActiveRolePermission,
  hasTargetRolePermission,
  isStaffPermission,
  isStaffRole,
  isSuperAdminOnlyPermission,
  isSurfaceEligibleForFutureAdminActivation,
} from "./permissions";

describe("W2A-T01 permission architecture & role matrix contract (SEC-01, SEC-02, D64)", () => {
  it("supports exactly two roles: admin and super_admin", () => {
    expect(STAFF_ROLES).toEqual(["admin", "super_admin"]);
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("super_admin")).toBe(true);

    for (const invalidRole of [
      "owner",
      "moderator",
      "editor",
      "student",
      "",
      null,
      undefined,
      42,
    ]) {
      expect(isStaffRole(invalidRole)).toBe(false);
      expect(hasTargetRolePermission(invalidRole, "enrollments:read")).toBe(false);
      expect(hasActiveRolePermission(invalidRole, "enrollments:read")).toBe(false);
    }
  });

  it("keeps newly defined Admin capabilities inactive until coordinated W2A-T02/W2A-T03 activation", () => {
    expect(COORDINATED_ADMIN_ACTIVATION_READY).toBe(false);
    expect(ACTIVE_ROLE_PERMISSIONS.admin).toEqual([]);

    for (const permission of STAFF_PERMISSIONS) {
      expect(hasActiveRolePermission("admin", permission)).toBe(false);
    }
  });

  it("preserves all Super Admin target and active permissions", () => {
    expect(ACTIVE_ROLE_PERMISSIONS.super_admin).toEqual(TARGET_ROLE_PERMISSIONS.super_admin);

    for (const permission of STAFF_PERMISSIONS) {
      expect(hasTargetRolePermission("super_admin", permission)).toBe(true);
      expect(hasActiveRolePermission("super_admin", permission)).toBe(true);
    }
  });

  it("models the approved D64 target matrix: Admin gets operational capabilities but never Super Admin-only privileges", () => {
    for (const permission of ADMIN_OPERATIONAL_PERMISSIONS) {
      expect(hasTargetRolePermission("admin", permission)).toBe(true);
      expect(hasTargetRolePermission("super_admin", permission)).toBe(true);
      expect(isSuperAdminOnlyPermission(permission)).toBe(false);
    }

    expect(SUPER_ADMIN_ONLY_PERMISSIONS).toEqual([
      "payments:correct-manual",
      "staff:manage",
      "settings:manage",
      "activity:read-global",
    ]);

    for (const restrictedPermission of SUPER_ADMIN_ONLY_PERMISSIONS) {
      expect(isSuperAdminOnlyPermission(restrictedPermission)).toBe(true);
      expect(hasTargetRolePermission("admin", restrictedPermission)).toBe(false);
      expect(hasActiveRolePermission("admin", restrictedPermission)).toBe(false);
      expect(hasTargetRolePermission("super_admin", restrictedPermission)).toBe(true);
      expect(hasActiveRolePermission("super_admin", restrictedPermission)).toBe(true);
    }
  });

  it("fails closed for unknown permissions and globally prohibited operations", () => {
    for (const prohibited of PROHIBITED_STAFF_OPERATIONS) {
      expect(isStaffPermission(prohibited)).toBe(false);
      expect(hasTargetRolePermission("admin", prohibited)).toBe(false);
      expect(hasTargetRolePermission("super_admin", prohibited)).toBe(false);
      expect(hasActiveRolePermission("admin", prohibited)).toBe(false);
      expect(hasActiveRolePermission("super_admin", prohibited)).toBe(false);
    }

    for (const arbitrary of ["admin:*", "*", "staff:delete", "", null, undefined, {}]) {
      expect(isStaffPermission(arbitrary)).toBe(false);
      expect(hasTargetRolePermission("super_admin", arbitrary)).toBe(false);
      expect(hasActiveRolePermission("super_admin", arbitrary)).toBe(false);
    }
  });

  it("maps every inventoried protected surface and database RPC cleanly, keeps purge/refund Super Admin-only pending W2A-T06, and preserves mentor-media and CRON_SECRET behavior", () => {
    const ids = new Set<string>();
    const locations = new Set<string>();
    const mappedRpcs = new Set<string>();

    const nonPermissionCurrent = new Set([
      "session_same_origin",
      "cron_or_staff_read",
      "public_published_or_catalog_edit",
      "service_super_admin_guard",
    ]);
    const nonPermissionTarget = new Set([
      "authenticated_self",
      "retire_w2a_t06",
      "public_published_or_cms_read",
      "cron_secret_or_enrollments_verify_payment",
      "super_admin_only_transition",
    ]);

    for (const entry of STAFF_ACCESS_INVENTORY) {
      expect(ids.has(entry.id)).toBe(false);
      ids.add(entry.id);
      expect(locations.has(entry.location)).toBe(false);
      locations.add(entry.location);

      if (!nonPermissionCurrent.has(entry.currentPermission)) {
        expect(isStaffPermission(entry.currentPermission)).toBe(true);
      }

      if (!nonPermissionTarget.has(entry.targetPermission)) {
        expect(isStaffPermission(entry.targetPermission)).toBe(true);
      }

      for (const rpc of entry.rpcs) {
        mappedRpcs.add(rpc);
      }
    }

    // Legacy purge & sandbox refund paths must never broaden to Admin on future activation
    const retiringIds = [
      "admin-enrollments-record-actions-purge",
      "admin-students-actions-purge",
      "admin-record-purge-preview-action",
      "legacy-purge-rpcs-db",
      "api-payments-sandbox-refund",
    ];
    for (const id of retiringIds) {
      const entry = STAFF_ACCESS_INVENTORY.find((item) => item.id === id);
      expect(entry).toBeDefined();
      expect(entry?.transitionPolicy).toBe("super_admin_only_until_w2a_t06");
      expect(entry?.targetPermission).toBe("retire_w2a_t06");
      expect(isSurfaceEligibleForFutureAdminActivation(entry!)).toBe(false);
    }

    // Mentor media distinguishes public published reads from authenticated staff previews
    const mentorMedia = STAFF_ACCESS_INVENTORY.find((item) => item.id === "api-mentor-media");
    expect(mentorMedia).toMatchObject({
      currentPermission: "public_published_or_catalog_edit",
      targetPermission: "public_published_or_cms_read",
      transitionPolicy: "public_published_or_admin_preview",
    });

    // Payment reconciliation preserves separate CRON_SECRET path
    const cronReconcile = STAFF_ACCESS_INVENTORY.find(
      (item) => item.id === "api-cron-reconcile-payments"
    );
    expect(cronReconcile).toMatchObject({
      currentPermission: "cron_or_staff_read",
      targetPermission: "cron_secret_or_enrollments_verify_payment",
      transitionPolicy: "cron_secret_or_staff_permission",
    });

    expect(mappedRpcs).toEqual(
      new Set([
        "create_admin_catalog_draft",
        "update_admin_catalog_record",
        "publish_admin_catalog_draft",
        "archive_staff_catalog",
        "set_staff_batch_mentors",
        "save_staff_mentor_profile",
        "manage_staff_mentor",
        "record_staff_manual_enrollment",
        "create_staff_enrollment",
        "review_staff_manual_payment",
        "manage_staff_enrollment",
        "manage_staff_student",
        "manage_staff_course_history",
        "purge_staff_record",
        "preview_staff_record_purge",
        "purge_staff_dev_admission",
        "purge_staff_student",
        "purge_staff_admission",
        "record_payment_outcome",
        "confirm_payment",
      ])
    );
  });
});
