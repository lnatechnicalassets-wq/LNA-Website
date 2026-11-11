import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CourseCard } from "./course-card";
import { CoursesSection } from "./courses-section";
import { MentorQuickViewProvider } from "./mentor-quick-view-context";
import type { Course, Batch, Mentor } from "@/lib/content";

afterEach(() => {
  cleanup();
});

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
    "Present executive findings clearly",
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
  venue: "Designated Executive Venue, Dhaka",
  status: "published",
  featured: true,
  mentorIds: [],
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
  scheduleDescription: "16 Sessions (1.5h each)",
  capacity: 25,
  enrolledCount: 5,
  seatHoldDurationMinutes: 30,
  feePoisha: 650000,
  status: "open_for_enrollment",
  venue: "Designated Executive Venue, Dhaka",
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
    organization: i % 2 === 0 ? "Eastern Bank PLC" : "Nagad Ltd.",
    bio: "Decades of executive leadership across national corporate sectors.",
    order: i + 1,
    isPlaceholder: true,
    published: true,
    provenance: {
      class: "B",
      verified: false,
      source: "Test Seed",
      verifiedBy: null,
      verifiedOn: null,
    },
  }));
};

describe("CourseCard - Editorial Split Architecture", () => {
  it("renders title, category, open seats status, logistics, 3 outcomes, and formatted poisha fee", () => {
    const mentors = makeMockMentors(3);
    render(<CourseCard course={mockCourse} batch={mockBatch} mentors={mentors} />);

    expect(screen.getByText("Data Analytics & Business Intelligence")).toBeDefined();
    expect(screen.getByText(/skill development/i)).toBeDefined();
    expect(screen.getByText("Open · Cohort 1")).toBeDefined();
    expect(screen.queryByText(/seats left/i)).toBeNull();
    expect(screen.getByText("16 Sessions (1.5h each)")).toBeDefined();
    expect(screen.getByText("Starts Nov 28, 2026")).toBeDefined();
    expect(screen.getByText("Designated Executive Venue, Dhaka")).toBeDefined();

    // Displays up to 3 learning outcomes (without 4th overflow)
    expect(screen.getByText("Work with real enterprise datasets")).toBeDefined();
    expect(screen.getByText("Build decision dashboards & reports")).toBeDefined();
    expect(screen.getByText("Apply modern analytical tools")).toBeDefined();
    expect(screen.queryByText("Present executive findings clearly")).toBeNull();

    // Displays integer-poisha fee
    expect(screen.getByText("BDT 6,500")).toBeDefined();
  });

  it("renders discounted fee override and free batch accurately", () => {
    const discountedBatch: Batch = {
      ...mockBatch,
      feePoisha: 750000,
      discountFeePoisha: 550000,
    };
    const { rerender } = render(
      <CourseCard course={mockCourse} batch={discountedBatch} mentors={makeMockMentors(2)} />
    );

    expect(screen.getByText("BDT 5,500")).toBeDefined();
    expect(screen.getByText("BDT 7,500")).toBeDefined();

    const freeBatch: Batch = {
      ...mockBatch,
      feePoisha: 0,
      discountFeePoisha: undefined,
    };
    rerender(<CourseCard course={mockCourse} batch={freeBatch} mentors={makeMockMentors(2)} />);

    expect(screen.getByText("Free")).toBeDefined();
  });

  it("renders completed cohort milestone and Program Story CTA for completed batches", () => {
    const completedBatch: Batch = {
      ...mockBatch,
      enrolledCount: 40,
      capacity: 40,
      feePoisha: 0,
      status: "completed",
    };

    render(<CourseCard course={mockCourse} batch={completedBatch} mentors={makeMockMentors(4)} />);

    expect(screen.getByText("Completed · Cohort 1")).toBeDefined();
    expect(screen.getByText("40 Graduates · Cohort 1")).toBeDefined();
    expect(screen.getByText("Program Story")).toBeDefined();
    expect(screen.queryByText("Program Fee")).toBeNull();
  });

  it("shows up to 5 mentor avatars with 44px touch targets and summarizes overflow beyond 5", () => {
    const mentors5 = makeMockMentors(5);
    const { rerender } = render(
      <CourseCard course={mockCourse} batch={mockBatch} mentors={mentors5} />
    );

    expect(screen.getByText("5 Industry Mentors")).toBeDefined();
    expect(screen.getByText("Eastern Bank PLC & Nagad Ltd.")).toBeDefined();
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();

    const fiveButtons = screen.getAllByRole("button", { name: /view mentor profile:/i });
    expect(fiveButtons).toHaveLength(5);
    expect(fiveButtons[0].className).toContain("w-11");
    expect(fiveButtons[0].className).toContain("h-11");

    // 8 mentors: displays 4 interactive avatars + "+4" overflow indicator
    rerender(<CourseCard course={mockCourse} batch={mockBatch} mentors={makeMockMentors(8)} />);
    expect(screen.getByText("8 Industry Mentors")).toBeDefined();
    expect(screen.getAllByRole("button", { name: /view mentor profile:/i })).toHaveLength(4);
    expect(screen.getByText("+4")).toBeDefined();
  });

  it("opens mentor quick-view modal when clicking a mentor avatar", () => {
    const mentors = makeMockMentors(2);
    render(
      <MentorQuickViewProvider>
        <CourseCard course={mockCourse} batch={mockBatch} mentors={mentors} />
      </MentorQuickViewProvider>
    );

    const mentorBtn = screen.getByRole("button", {
      name: /view mentor profile: faculty member 1, lead specialist 1/i,
    });
    fireEvent.click(mentorBtn);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Faculty Member 1")).toBeDefined();
  });

  it("contains single accessible link to course details", () => {
    render(<CourseCard course={mockCourse} batch={mockBatch} mentors={makeMockMentors(2)} />);

    const link = screen.getByRole("link", {
      name: /view data analytics & business intelligence details/i,
    });
    expect(link.getAttribute("href")).toBe("/courses/data-analytics");
  });
});

describe("CoursesSection", () => {
  it("renders aligned section header, open cohort summary badge, and course grid", () => {
    const mentors = makeMockMentors(3);
    render(<CoursesSection courses={[mockCourse]} batches={[mockBatch]} mentors={mentors} />);

    expect(screen.getByRole("heading", { level: 2, name: /courses & programs/i })).toBeDefined();
    expect(screen.getByText("1 Open Cohort · Offline")).toBeDefined();
    expect(screen.getByText("Data Analytics & Business Intelligence")).toBeDefined();
  });

  it("renders clean empty state when no courses qualify", () => {
    render(<CoursesSection courses={[]} batches={[]} mentors={[]} />);

    expect(screen.getByText("No cohorts currently open for enrollment.")).toBeDefined();
  });
});
