import {
  BookOpen,
  ChartNoAxesCombined,
  ClipboardList,
  LayoutDashboard,
  Mail,
  PanelsTopLeft,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export const adminPaths = {
  overview: "/admin",
  admissions: "/admin/enrollments",
  courses: "/admin/catalog/courses",
  batches: "/admin/catalog/batches",
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
  readOnly: "Read-Only Release",
  superAdmin: "Super Admin",
  admin: "Admin",
  assuranceLevel: "AAL2",
  viewWebsite: "View website",
  signOut: "Sign out",
  overview: "Overview",
  admissions: "Admissions",
  coursesAndBatches: "Courses & Batches",
  courses: "Courses",
  batches: "Batches",
  websiteBuilder: "Website Builder",
  pages: "Pages",
  mentors: "Mentors",
  announcements: "Announcements",
  siteSettings: "Site Settings",
  finance: "Finance",
  transactions: "Transactions",
  refunds: "Refunds",
  emails: "Emails",
  templates: "Templates",
  deliveryHistory: "Delivery History",
  reports: "Reports",
  enrollmentReports: "Enrollment Reports",
  revenueReports: "Revenue Reports",
  overviewDescription: "Review course applications and track enrollment progress.",
  reviewApplications: "Review applications",
} as const;

type AdminMessageKey = keyof typeof messages;

export function adminMessage(key: AdminMessageKey): string {
  return messages[key];
}

interface NavigationLink {
  label: AdminMessageKey;
  href: string;
}

interface NavigationGroup {
  label: AdminMessageKey;
  icon: LucideIcon;
  children: readonly (Omit<NavigationLink, "href"> & { href?: string })[];
}

type AdminNavigationItem = (NavigationLink & { icon: LucideIcon }) | NavigationGroup;

export const adminNavigation: readonly AdminNavigationItem[] = [
  { label: "overview", href: adminPaths.overview, icon: LayoutDashboard },
  { label: "admissions", href: adminPaths.admissions, icon: ClipboardList },
  {
    label: "coursesAndBatches",
    icon: BookOpen,
    children: [
      { label: "courses", href: adminPaths.courses },
      { label: "batches", href: adminPaths.batches },
    ],
  },
  {
    label: "websiteBuilder",
    icon: PanelsTopLeft,
    children: [
      { label: "pages" },
      { label: "mentors" },
      { label: "announcements" },
      { label: "siteSettings" },
    ],
  },
  {
    label: "finance",
    icon: Wallet,
    children: [{ label: "transactions" }, { label: "refunds" }],
  },
  {
    label: "emails",
    icon: Mail,
    children: [{ label: "templates" }, { label: "deliveryHistory" }],
  },
  {
    label: "reports",
    icon: ChartNoAxesCombined,
    children: [{ label: "enrollmentReports" }, { label: "revenueReports" }],
  },
];
