import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Globe,
  GraduationCap,
  LayoutDashboard,
  ReceiptText,
  Settings,
  UserCog,
} from "lucide-react";
import type { StaffRole } from "@/server/auth/permissions";
import type { AdmissionView } from "./admin-admissions";

export const adminPaths = {
  overview: "/admin",
  courses: "/admin/catalog/courses",
  batches: "/admin/catalog/batches",
  admissions: "/admin/enrollments",
  addStudent: "/admin/enrollments/new",
  studentDirectory: "/admin/students",
  transactions: "/admin/transactions",
  website: "/admin/website",
  mentors: "/admin/mentors",
  reports: "/admin/reports",
  settings: "/admin/settings",
  account: "/admin/account",
  publicSite: "/",
  login: "/admin/login",
  logout: "/api/admin/logout",
} as const;

const messages = {
  portalTitle: "LNA Staff Portal",
  navigation: "Admin navigation",
  openMenu: "Open admin navigation",
  menuDescription: "Navigate the staff portal and manage your session.",
  skipNavigation: "Skip admin navigation",
  breadcrumbLabel: "Breadcrumb",
  superAdmin: "Super Admin",
  admin: "Admin",
  myAccount: "My Account",
  viewWebsite: "View website",
  signOut: "Sign out",
  overview: "Overview",
  courses: "Courses",
  batches: "Batches",
  admissions: "Admissions",
  studentDirectory: "Students",
  transactions: "Transactions",
  website: "Website",
  mentors: "Mentors",
  reports: "Reports",
  settings: "Settings",
  overviewDescription: "Access admissions, courses, students, and website updates.",
  admissionsWorkspaceDescription: "Review incoming applications and update admission status.",
  reviewApplications: "Review applications",
  courseWorkspaceDescription: "Find a course, manage batches, and view rosters.",
  manageCourses: "Manage courses",
  viewBatches: "View batches",
  viewStudents: "View students",
  studentWorkspaceDescription: "Look up student records, contacts, and batch history.",
  manageStudents: "Open students",
  websiteWorkspaceDescription: "Manage mentor profiles and public website content.",
  manageMentors: "Manage mentors",
  openWebsiteModule: "Open website",
  transactionsTitle: "Transactions",
  transactionsDescription: "Payment records and verified collections.",
  transactionsScheduledNotice:
    "Full payment ledger and exports will appear here as transaction workflows expand. Review application payments in Admissions.",
  transactionsScheduledAction: "Inspect application payments in Admissions",
  reportsTitle: "Reports",
  reportsDescription: "Program enrollment and collection summaries.",
  reportsScheduledNotice:
    "Enrollment totals and downloadable exports are planned here. View current cohorts in Courses.",
  reportsScheduledAction: "View open cohorts in Courses",
  websiteTitle: "Website",
  websiteDescription: "Public site content and mentor profiles.",
  websiteScheduledNotice:
    "Additional homepage sections and page settings will appear here. Mentor profiles are ready to edit below.",
  settingsTitle: "Settings",
  settingsDescription: "Super Admin portal settings and team permissions.",
  settingsScheduledNotice:
    "Team invitations and workspace controls will appear here for Super Admins.",
  accountTitle: "My Account",
  accountDescription: "Your signed-in staff profile and session controls.",
  accountScheduledNotice: "Use Sign out in the portal menu to end your current session.",
  allCourses: "All courses",
  allBatches: "All batches",
  allEnrollments: "All applications",
  allStudents: "All students",
  applications: "Applications",
  students: "Enrolled students",
  archived: "Archived records",
  student: "Student",
  admissionViews: "Admissions views",
  filterCourse: "Course",
  filterBatch: "Batch",
  selectCourseFirst: "Choose a course first",
  searchStudents: "Search enrolled students",
  studentsDescription:
    "Confirmed enrollments across current and past batches. Payment status is shown separately.",
  noStudents: "No enrolled students",
  noStudentsInScope: "There are no confirmed enrollments for this selection.",
  noStudentsMatch: "No enrolled students match your search.",
  noCourseEnrollments: "This course has no enrollment records yet.",
  noMatchingCourseEnrollments: "No records in this course match your search or status filter.",
  backToBatches: "Back to course batches",
  noMatchingBatchEnrollments: "No records in this batch match your search or status filter.",
  noBatchEnrollments: "This batch has no enrollment records yet.",
  clearBatchFilters: "Clear search and status filters",
  roleBoundaryTitle: "Profile summary",
  staffRoleLabel: "Role",
  accountStateLabel: "Status",
  emailLabel: "Email",
  fullNameLabel: "Full name",
  activeStateLabel: "Active",
  scheduledModuleBadge: "Coming soon",
  superAdminOnlyBadge: "Super Admin only",
  reloadLatestRecord: "Reload latest record",
  confirmActionCancel: "Cancel",
  confirmActionReasonLabel: "Reason",
  confirmActionReasonPlaceholder: "Provide a concise audit reason...",
  confirmActionReasonRequired: "Reason is required.",
  confirmActionFailed: "Unable to complete action.",
} as const;

type AdminMessageKey = keyof typeof messages;

export function adminMessage(key: AdminMessageKey): string {
  return messages[key];
}

export interface AdminNavChild {
  readonly label: AdminMessageKey;
  readonly href: string;
}

export interface AdminNavModule {
  readonly id: string;
  readonly label: AdminMessageKey;
  readonly href: string;
  readonly icon: typeof LayoutDashboard;
  readonly superAdminOnly?: boolean;
  readonly children?: ReadonlyArray<AdminNavChild>;
}

/**
 * Approved eight-module sidebar order (D62, SEC-07):
 * Overview, Courses, Admissions, Students, Transactions, Website, Reports, Settings (Super Admin only).
 */
export const adminNavigation: ReadonlyArray<AdminNavModule> = [
  { id: "overview", label: "overview", href: adminPaths.overview, icon: LayoutDashboard },
  {
    id: "courses",
    label: "courses",
    href: adminPaths.courses,
    icon: BookOpen,
    children: [{ label: "batches", href: adminPaths.batches }],
  },
  { id: "admissions", label: "admissions", href: adminPaths.admissions, icon: ClipboardList },
  {
    id: "students",
    label: "studentDirectory",
    href: adminPaths.studentDirectory,
    icon: GraduationCap,
  },
  { id: "transactions", label: "transactions", href: adminPaths.transactions, icon: ReceiptText },
  {
    id: "website",
    label: "website",
    href: adminPaths.website,
    icon: Globe,
    children: [{ label: "mentors", href: adminPaths.mentors }],
  },
  { id: "reports", label: "reports", href: adminPaths.reports, icon: BarChart3 },
  {
    id: "settings",
    label: "settings",
    href: adminPaths.settings,
    icon: Settings,
    superAdminOnly: true,
  },
] as const;

export function getAdminNavigation(role: StaffRole): ReadonlyArray<AdminNavModule> {
  return adminNavigation.filter((item) => !item.superAdminOnly || role === "super_admin");
}

export const adminAccountNavItem = {
  label: "myAccount" as const,
  href: adminPaths.account,
  icon: UserCog,
};

/**
 * Validates internal return/redirect paths within the Admin portal (D71, AC-D71).
 * Rejects empty values, external schemes, protocol-relative URLs, backslashes, or non-admin routes.
 */
export function sanitizeAdminReturnPath(
  candidate: unknown,
  fallback: string = adminPaths.overview
): string {
  if (typeof candidate !== "string") {
    return fallback;
  }
  const trimmed = candidate.trim();
  if (!trimmed || trimmed.length > 500) {
    return fallback;
  }
  if (/[\r\n\t\\]/.test(trimmed) || !trimmed.startsWith("/")) {
    return fallback;
  }
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }
  const pathname = trimmed.split(/[?#]/, 1)[0] ?? "";
  if (pathname !== "/admin" && !pathname.startsWith("/admin/")) {
    return fallback;
  }
  return trimmed;
}

export function adminCourseBatchesHref(courseId: string): string {
  return `${adminPaths.batches}?${new URLSearchParams({ courseId })}`;
}

export function adminEnrollmentsHref({
  view = "applications",
  search = "",
  status = "",
  batchId,
  courseId,
  page = 1,
}: {
  view?: AdmissionView;
  search?: string;
  status?: string;
  batchId?: string;
  courseId?: string;
  page?: number;
} = {}): string {
  const params = new URLSearchParams();
  if (view !== "applications") params.set("view", view);
  if (search) params.set("q", search);
  if (view !== "students" && status) params.set("status", status);
  if (courseId) params.set("courseId", courseId);
  if (batchId) params.set("batchId", batchId);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${adminPaths.admissions}?${query}` : adminPaths.admissions;
}
