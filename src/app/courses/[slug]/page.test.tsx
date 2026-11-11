import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import * as catalogService from "@/server/enrollment/service";
import * as runtimeConfig from "@/server/enrollment/config";
import type { Course, Batch } from "@/lib/content";
import CourseDetailPage, { generateMetadata, generateStaticParams } from "./page";

// Mock next/navigation notFound
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

const testProvenance = {
  class: "B" as const,
  verified: false,
  source: "Test fixture",
  verifiedBy: null,
  verifiedOn: null,
};

const mtoCourseFixture: Course = {
  id: "mto-readiness",
  title: "MTO Readiness Program",
  subtitle: "Graduate Career & Leadership Accelerator",
  category: "Career Readiness",
  summary: "Graduate Career & Leadership Accelerator",
  description:
    "An intensive leadership and career readiness accelerator for Management Trainee Officer candidates.",
  learningOutcomes: ["Aptitude mastery", "Case interviews"],
  targetAudience: ["Graduates"],
  prerequisites: ["Final-year student or graduate"],
  modules: [
    {
      id: "mod-1",
      title: "Corporate Aptitude",
      duration: "4 Sessions",
      topics: ["Analytical reasoning"],
    },
    {
      id: "mod-2",
      title: "Case Frameworks",
      duration: "4 Sessions",
      topics: ["Market entry"],
    },
  ],
  deliveryMode: "offline",
  venue: "Designated Executive Venue, Dhaka",
  status: "published",
  featured: true,
  mentorIds: ["mentor-mohammad-salekeen-ibrahim"],
  provenance: testProvenance,
};

function makeBatch(overrides: Partial<Batch> = {}): Batch {
  return {
    id: "batch-mto-2026-01",
    courseId: "mto-readiness",
    batchNumber: 1,
    name: "MTO Readiness Cohort 1",
    startDate: "2026-12-01",
    endDate: "2027-01-31",
    scheduleDescription: "16 Sessions (1.5h each)",
    capacity: 30,
    enrolledCount: 18,
    seatHoldDurationMinutes: 30,
    feePoisha: 750000,
    status: "open_for_enrollment",
    venue: "Designated Executive Venue, Dhaka",
    provenance: testProvenance,
    ...overrides,
  };
}

describe("CourseDetailPage", () => {
  beforeEach(() => {
    vi.spyOn(catalogService, "getPublicCatalogFromSupabase").mockResolvedValue({
      courses: [],
      batches: [],
    });
    vi.spyOn(runtimeConfig, "getEnrollmentRuntimeConfig").mockReturnValue({
      checkoutMode: "closed",
      submissionEnabled: false,
      statusLookupEnabled: false,
      emailDispatchMode: "disabled",
      bankTransferEnabled: false,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders approved catalog fee and hides active Enroll CTAs when public checkout is closed", async () => {
    const Component = await CourseDetailPage({
      params: Promise.resolve({ slug: "mto-readiness" }),
    });
    render(Component);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /MTO Readiness Program/i,
      })
    ).toBeDefined();
    expect(screen.getAllByText(/Career Readiness/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("course-enrollment-status-pill").textContent).toMatch(
      /Online enrollment is coming soon/i
    );
    expect(screen.getByTestId("course-payable-fee").textContent).toBe("BDT 7,500");
    expect(screen.queryByRole("link", { name: /Enroll in MTO Readiness Program/i })).toBeNull();
  });

  it("matches server discounted fee in integer poisha and shows Enroll links only when checkout and batch are open", async () => {
    vi.spyOn(runtimeConfig, "getEnrollmentRuntimeConfig").mockReturnValue({
      checkoutMode: "mock",
      submissionEnabled: true,
      statusLookupEnabled: true,
      emailDispatchMode: "disabled",
      bankTransferEnabled: false,
    });
    vi.spyOn(catalogService, "getPublicCatalogFromSupabase").mockResolvedValue({
      courses: [mtoCourseFixture],
      batches: [makeBatch({ discountFeePoisha: 550000 })],
    });

    const Component = await CourseDetailPage({
      params: Promise.resolve({ slug: "mto-readiness" }),
    });
    render(Component);

    expect(screen.queryByTestId("course-enrollment-status-pill")).toBeNull();
    expect(screen.getByText(/Open for Enrollment/i)).toBeDefined();
    expect(screen.getByTestId("course-payable-fee").textContent).toBe("BDT 5,500");
    expect(screen.getAllByText(/BDT 7,500/).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/seats left/i)).toBeNull();
    expect(screen.getAllByText(/Cohort 1/i).length).toBeGreaterThanOrEqual(1);

    const enrollLinks = screen.getAllByRole("link", {
      name: /Enroll in MTO Readiness Program/i,
    });
    expect(enrollLinks.length).toBeGreaterThanOrEqual(2);
    enrollLinks.forEach((link) => {
      expect(link.getAttribute("href")).toBe(
        "/enroll?course=mto-readiness&batch=batch-mto-2026-01"
      );
    });
  });

  it("disables Enroll CTA when live batch is full or upcoming even if checkout is enabled", async () => {
    vi.spyOn(runtimeConfig, "getEnrollmentRuntimeConfig").mockReturnValue({
      checkoutMode: "mock",
      submissionEnabled: true,
      statusLookupEnabled: true,
      emailDispatchMode: "disabled",
      bankTransferEnabled: false,
    });
    vi.spyOn(catalogService, "getPublicCatalogFromSupabase").mockResolvedValue({
      courses: [mtoCourseFixture],
      batches: [makeBatch({ capacity: 30, enrolledCount: 30 })],
    });

    const fullPage = await CourseDetailPage({
      params: Promise.resolve({ slug: "mto-readiness" }),
    });
    render(fullPage);

    expect(screen.getByTestId("course-enrollment-status-pill").textContent).toMatch(/Batch Full/i);
    expect(screen.queryByRole("link", { name: /Enroll in MTO Readiness Program/i })).toBeNull();
    cleanup();

    vi.spyOn(catalogService, "getPublicCatalogFromSupabase").mockResolvedValue({
      courses: [mtoCourseFixture],
      batches: [makeBatch({ status: "upcoming", enrolledCount: 0 })],
    });

    const upcomingPage = await CourseDetailPage({
      params: Promise.resolve({ slug: "mto-readiness" }),
    });
    render(upcomingPage);

    expect(screen.getByTestId("course-enrollment-status-pill").textContent).toMatch(
      /Upcoming Cohort/i
    );
    expect(screen.queryByRole("link", { name: /Enroll in MTO Readiness Program/i })).toBeNull();
  });

  it("supports accessible tab keyboard navigation and curriculum accordion toggles", async () => {
    const Component = await CourseDetailPage({
      params: Promise.resolve({ slug: "mto-readiness" }),
    });
    render(Component);

    const overviewTab = screen.getByRole("tab", { name: "Overview" });
    const curriculumTab = screen.getByRole("tab", { name: "Curriculum" });
    const mentorsTab = screen.getByRole("tab", { name: "Mentors" });

    expect(overviewTab.getAttribute("tabindex")).toBe("0");
    expect(curriculumTab.getAttribute("tabindex")).toBe("-1");

    overviewTab.focus();
    fireEvent.keyDown(overviewTab, { key: "ArrowRight" });
    expect(document.activeElement).toBe(curriculumTab);
    expect(curriculumTab.getAttribute("aria-selected")).toBe("true");

    const curriculumPanel = screen.getByRole("tabpanel");
    const firstTrigger = within(curriculumPanel).getByRole("button", {
      name: /Corporate Aptitude/i,
    });
    expect(firstTrigger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(firstTrigger);
    expect(firstTrigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.keyDown(curriculumTab, { key: "End" });
    expect(document.activeElement).toBe(mentorsTab);
    expect(mentorsTab.getAttribute("aria-selected")).toBe("true");
  });

  it("generates correct metadata for valid course", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "mto-readiness" }),
    });

    expect(metadata.title).toContain("MTO Readiness Program");
  });

  it("generates static parameters for catalog courses", async () => {
    const params = await generateStaticParams();
    expect(params.length).toBe(2);
    expect(params.map((p) => p.slug)).toContain("mto-readiness");
    expect(params.map((p) => p.slug)).toContain("irgp");
  });
});
