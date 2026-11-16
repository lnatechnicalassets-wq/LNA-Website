import { BookOpen, ClipboardList, GraduationCap, LayoutDashboard, UsersRound } from "lucide-react";
import type { AdmissionView } from "./admin-admissions";

export const adminPaths = {
  overview: "/admin",
  admissions: "/admin/enrollments",
  addStudent: "/admin/enrollments/new",
  courses: "/admin/catalog/courses",
  batches: "/admin/catalog/batches",
  mentors: "/admin/mentors",
  studentDirectory: "/admin/students",
  website: "/",
  login: "/admin/login",
  logout: "/api/admin/logout",
} as const;

const messages = {
  portalTitle: "LNA Staff Portal",
  navigation: "Admin navigation",
  openMenu: "Open admin navigation",
  menuDescription: "Navigate the staff portal and manage your session.",
  skipNavigation: "Skip admin navigation",
  superAdmin: "Super Admin",
  admin: "Admin",
  assuranceLevel: "AAL2",
  viewWebsite: "View website",
  signOut: "Sign out",
  overview: "Overview",
  admissions: "Admissions",
  courses: "Courses",
  batches: "Batches",
  mentors: "Mentors",
  studentDirectory: "Students",
  overviewDescription: "Review course applications and track enrollment progress.",
  reviewApplications: "Review applications",
  courseWorkspaceDescription: "Find a course, manage its batches, and open a student roster.",
  manageCourses: "Manage courses",
  viewBatches: "View batches",
  viewStudents: "View students",
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
} as const;

type AdminMessageKey = keyof typeof messages;

export function adminMessage(key: AdminMessageKey): string {
  return messages[key];
}

export const adminNavigation = [
  { label: "overview", href: adminPaths.overview, icon: LayoutDashboard },
  { label: "admissions", href: adminPaths.admissions, icon: ClipboardList },
  { label: "studentDirectory", href: adminPaths.studentDirectory, icon: GraduationCap },
  { label: "mentors", href: adminPaths.mentors, icon: UsersRound },
  { label: "courses", href: adminPaths.courses, icon: BookOpen },
] as const;

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
