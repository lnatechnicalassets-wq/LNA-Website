import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CourseCard } from "./course-card";
import { CoursesSection } from "./courses-section";
import type { Course, Batch, Mentor } from "@/lib/content";

const mockCourse: Course = {
  id: "data-analytics",
  title: "Data Analytics & Business Intelligence",
  subtitle: "Executive business intelligence masterclass",
  category: "Skill Development",
  summary: "Turn data into actionable business insights with executive dashboards.",
  description: "Comprehensive offline analytics training for decision-makers.",
  learningOutcomes: [
    "Work with real enterprise datasets",
    "Build decision dashboards & reports",
    "Apply modern analytical tools",
  ],
  targetAudience: ["Business Analysts", "Department Heads"],
  prerequisites: [],
  modules: [
    {
      id: "mod-1",
      title: "Module 1",
      duration: "4 Weeks",
      topics: ["Topics"],
    },
  ],
  deliveryMode: "offline",
  venue: "LNA Executive Campus, Dhanmondi, Dhaka",
  status: "published",
  featured: true,
  provenance: {
    class: "B",
    verified: false,
    source: "Test Seed",
    verifiedBy: null,
    verifiedOn: null,
  },
};

const mockBatch: Batch = {
  id: "batch-da-01",
  courseId: "data-analytics",
  batchNumber: 1,
  name: "Cohort 01",
  startDate: "2026-11-28",
  endDate: "2027-01-23",
  scheduleDescription: "Every Saturday, 10:00 AM – 4:00 PM (8 Weeks)",
  capacity: 25,
  enrolledCount: 5,
  seatHoldDurationMinutes: 30,
  feePoisha: 650000,
  status: "open_for_enrollment",
  venue: "Dhanmondi, Dhaka",
  provenance: {
    class: "B",
    verified: false,
    source: "Test Seed",
    verifiedBy: null,
    verifiedOn: null,
  },
};

const makeMockMentors = (count: number): Mentor[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `mentor-${i + 1}`,
    name: `Faculty Member ${i + 1}`,
    role: `Lead Specialist ${i + 1}`,
    organization: "Executive Enterprise Corp",
    bio: "Decades of executive leadership across national corporate sectors.",
    courseId: "data-analytics",
    order: i + 1,
    isPlaceholder: true,
    provenance: {
      class: "B",
      verified: false,
      source: "Test Seed",
      verifiedBy: null,
      verifiedOn: null,
    },
  }));
};

describe("CourseCard - Normal & Hover Architecture", () => {
  it("renders course title, category, status, and formatted fee in poisha", () => {
    const mentors = makeMockMentors(2);
    render(<CourseCard course={mockCourse} batch={mockBatch} mentors={mentors} />);

    expect(screen.getByText("Data Analytics & Business Intelligence")).toBeDefined();
    expect(screen.getByText(/skill development/i)).toBeDefined();
    expect(screen.getByText("Upcoming")).toBeDefined();
    expect(screen.getByText("BDT 6,500")).toBeDefined();
  });

  it("handles 2 mentors without overflow badge in normal state", () => {
    const mentors = makeMockMentors(2);
    render(<CourseCard course={mockCourse} batch={mockBatch} mentors={mentors} />);

    expect(screen.queryByText("+1")).toBeNull();
    expect(screen.queryByText("+2")).toBeNull();
    expect(screen.queryByText("+3")).toBeNull();
  });

  it("handles 3 mentors without overflow badge in normal state", () => {
    const mentors = makeMockMentors(3);
    render(<CourseCard course={mockCourse} batch={mockBatch} mentors={mentors} />);

    expect(screen.queryByText("+1")).toBeNull();
    expect(screen.queryByText("+2")).toBeNull();
  });

  it("handles 4 mentors with +1 badge in normal state", () => {
    const mentors = makeMockMentors(4);
    render(<CourseCard course={mockCourse} batch={mockBatch} mentors={mentors} />);

    expect(screen.getByText("+1")).toBeDefined();
  });

  it("handles 5 mentors with +2 badge in normal state", () => {
    const mentors = makeMockMentors(5);
    render(<CourseCard course={mockCourse} batch={mockBatch} mentors={mentors} />);

    expect(screen.getByText("+2")).toBeDefined();
  });

  it("handles 6 mentors with +3 badge in normal state", () => {
    const mentors = makeMockMentors(6);
    render(<CourseCard course={mockCourse} batch={mockBatch} mentors={mentors} />);

    expect(screen.getByText("+3")).toBeDefined();
  });

  it("renders Faculty Spotlight heading and independent profile links for each mentor", () => {
    const mentors = makeMockMentors(3);
    render(<CourseCard course={mockCourse} batch={mockBatch} mentors={mentors} />);

    expect(screen.getByText(/meet your mentors/i)).toBeDefined();

    // Verify independent mentor profile links without nested anchor elements
    const mentorLinks = screen.getAllByRole("link", {
      name: /view faculty member 1's profile/i,
    });
    expect(mentorLinks.length).toBeGreaterThanOrEqual(1);
    expect(mentorLinks[0].getAttribute("href")).toBe("/mentors/mentor-1");

    // Visible designation labels should not be present on cards
    expect(screen.queryByText("Lead Specialist 1")).toBeNull();
  });

  it("renders adaptive multi-row layout for 4, 5, and 6 mentors (max 3 per row)", () => {
    // 4 mentors: 2 + 2
    const { container: c4 } = render(
      <CourseCard course={mockCourse} batch={mockBatch} mentors={makeMockMentors(4)} />
    );
    const spotlight4 = c4.querySelector(".top-\\[120px\\]");
    expect(spotlight4).toBeDefined();
    // Verify 4 mentor links exist within spotlight
    const links4 = spotlight4?.querySelectorAll("a[href^='/mentors/']");
    expect(links4?.length).toBe(4);

    // 5 mentors: 3 + 2
    const { container: c5 } = render(
      <CourseCard course={mockCourse} batch={mockBatch} mentors={makeMockMentors(5)} />
    );
    const spotlight5 = c5.querySelector(".top-\\[120px\\]");
    const links5 = spotlight5?.querySelectorAll("a[href^='/mentors/']");
    expect(links5?.length).toBe(5);

    // 6 mentors: 3 + 3
    const { container: c6 } = render(
      <CourseCard course={mockCourse} batch={mockBatch} mentors={makeMockMentors(6)} />
    );
    const spotlight6 = c6.querySelector(".top-\\[120px\\]");
    const links6 = spotlight6?.querySelectorAll("a[href^='/mentors/']");
    expect(links6?.length).toBe(6);
  });

  it("contains accessible link to course details", () => {
    const mentors = makeMockMentors(2);
    render(<CourseCard course={mockCourse} batch={mockBatch} mentors={mentors} />);

    const link = screen.getByRole("link", {
      name: /view details and curriculum for data analytics & business intelligence/i,
    });
    expect(link.getAttribute("href")).toBe("/courses/data-analytics");
  });
});

describe("CoursesSection", () => {
  it("renders 3-column catalog grid for published courses with batches", () => {
    const mentors = makeMockMentors(2);
    render(<CoursesSection courses={[mockCourse]} batches={[mockBatch]} mentors={mentors} />);

    expect(screen.getByText("Explore Our Courses")).toBeDefined();
    expect(screen.getByText("Data Analytics & Business Intelligence")).toBeDefined();
  });

  it("renders clean empty state when no courses qualify", () => {
    render(<CoursesSection courses={[]} batches={[]} mentors={[]} />);

    expect(screen.getByText("No cohorts currently open for enrollment.")).toBeDefined();
  });
});
