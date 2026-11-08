import fs from "fs";
import path from "path";

const coursesPath = path.resolve("content/catalog/courses.json");
const batchesPath = path.resolve("content/catalog/batches.json");
const mentorsPath = path.resolve("content/home/mentors.json");

const courses = JSON.parse(fs.readFileSync(coursesPath, "utf-8"));
const batches = JSON.parse(fs.readFileSync(batchesPath, "utf-8"));
const mentors = JSON.parse(fs.readFileSync(mentorsPath, "utf-8"));

// 1. Prepare MTO and IRGP courses
const mtoCourse = {
  id: "mto-readiness",
  title: "MTO Readiness Program",
  subtitle: "Graduate Career & Leadership Accelerator",
  category: "Career Readiness",
  summary: "Graduate Career & Leadership Accelerator",
  description: "An intensive leadership and career readiness accelerator designed to prepare high-potential university graduates for Management Trainee Officer (MTO) recruitment in leading multinational and national corporations.",
  learningOutcomes: [
    "Aptitude test mastery and analytical problem solving",
    "Comprehensive business case interview simulations",
    "Assessment center team dynamics and presentation skills",
    "Executive personal branding and leadership presence"
  ],
  targetAudience: [
    "Final-year undergraduate and graduate students",
    "Recent university graduates targeting corporate MTO tracks",
    "Early-career professionals aiming for fast-track leadership roles"
  ],
  prerequisites: [
    "Graduating within 12 months or graduated within the last 2 years",
    "Commitment to intensive offline weekend sessions"
  ],
  modules: [
    {
      id: "mod-mto-01",
      title: "Corporate Aptitude & Analytical Problem Solving",
      duration: "4 Sessions",
      topics: ["Analytical reasoning", "Numerical problem solving", "Critical comprehension"]
    },
    {
      id: "mod-mto-02",
      title: "Business Case Analysis & Strategic Frameworks",
      duration: "4 Sessions",
      topics: ["Market entry cases", "Profitability diagnosis", "Executive synthesis"]
    },
    {
      id: "mod-mto-03",
      title: "Assessment Center Dynamics & Group Exercises",
      duration: "4 Sessions",
      topics: ["Leaderless group discussions", "In-tray simulations", "Team consensus"]
    },
    {
      id: "mod-mto-04",
      title: "Boardroom Presentations & Leadership Communication",
      duration: "4 Sessions",
      topics: ["Executive storytelling", "Stress interviews", "Personal leadership branding"]
    }
  ],
  deliveryMode: "offline",
  venue: "LNA Executive Campus, Dhanmondi, Dhaka",
  status: "published",
  featured: true,
  provenance: {
    class: "B",
    verified: false,
    source: "Approved MTO program curriculum",
    verifiedBy: null,
    verifiedOn: null
  }
};

const irgpCourse = {
  id: "irgp",
  title: "Industry Readiness Graduate Program",
  subtitle: "Industry-focused learning and career preparation.",
  category: "Industry Readiness",
  summary: "Industry-focused learning and career preparation.",
  description: "A comprehensive industry-readiness initiative empowering graduates with real-world skills, direct executive mentorship, and career placement support across leading corporate institutions.",
  learningOutcomes: [
    "Cross-sector functional business literacy",
    "Corporate governance, compliance, and workplace culture",
    "Hands-on project work under senior corporate mentors",
    "Guaranteed interview and placement support"
  ],
  targetAudience: [
    "University graduates seeking transition to formal corporate careers",
    "Young professionals seeking cross-industry mobility"
  ],
  prerequisites: [
    "Undergraduate degree or equivalent"
  ],
  modules: [
    {
      id: "mod-irgp-01",
      title: "Industry Foundations & Functional Excellence",
      duration: "5 Weeks",
      topics: ["Banking & Telecom", "Supply Chain & Retail", "Digital Commerce"]
    },
    {
      id: "mod-irgp-02",
      title: "Corporate Practice & Executive Mentorship",
      duration: "5 Weeks",
      topics: ["Cross-functional projects", "Workplace ethics", "Leadership communication"]
    }
  ],
  deliveryMode: "offline",
  venue: "LNA Executive Campus, Dhanmondi, Dhaka",
  status: "published",
  featured: true,
  provenance: {
    class: "B",
    verified: false,
    source: "LNA IRGP cohort 1 records",
    verifiedBy: null,
    verifiedOn: null
  }
};

// Filter out if already exists and build ordered course list
const existingMap = new Map(courses.map(c => [c.id, c]));
// Update data-analytics summary/subtitle to match reference exact copy
if (existingMap.has("data-analytics")) {
  const da = existingMap.get("data-analytics");
  da.summary = "Turn data into actionable business insights.";
  da.subtitle = "Turn data into actionable business insights.";
}
if (existingMap.has("executive-leadership")) {
  const el = existingMap.get("executive-leadership");
  el.summary = "Master strategic decision-making and board governance.";
}

const orderedIds = [
  "data-analytics",
  "executive-leadership",
  "mto-readiness",
  "irgp",
  "corporate-finance",
  "digital-transformation",
  "strategic-operations",
  "people-governance"
];

const newCourses = [];
for (const id of orderedIds) {
  if (id === "mto-readiness") {
    newCourses.push(mtoCourse);
  } else if (id === "irgp") {
    newCourses.push(irgpCourse);
  } else if (existingMap.has(id)) {
    newCourses.push(existingMap.get(id));
  }
}

// Add any other courses that weren't in orderedIds
for (const [id, course] of existingMap.entries()) {
  if (!orderedIds.includes(id)) {
    newCourses.push(course);
  }
}

fs.writeFileSync(coursesPath, JSON.stringify(newCourses, null, 2) + "\n", "utf-8");
console.log("Updated courses.json successfully. Total courses:", newCourses.length);

// 2. Batches
const mtoBatch = {
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
  venue: "LNA Executive Campus, Dhanmondi, Dhaka",
  provenance: {
    class: "B",
    verified: false,
    source: "Approved MTO batch schedule",
    verifiedBy: null,
    verifiedOn: null
  }
};

const irgpBatch = {
  id: "batch-irgp-cohort-1",
  courseId: "irgp",
  batchNumber: 1,
  name: "IRGP Cohort 1",
  startDate: "2025-09-01",
  endDate: "2025-11-30",
  scheduleDescription: "10 focus areas (8 industry mentors)",
  capacity: 40,
  enrolledCount: 40,
  seatHoldDurationMinutes: 30,
  feePoisha: 0,
  status: "completed",
  venue: "LNA Executive Campus, Dhanmondi, Dhaka",
  provenance: {
    class: "B",
    verified: false,
    source: "Completed IRGP cohort record",
    verifiedBy: null,
    verifiedOn: null
  }
};

const batchesMap = new Map(batches.map(b => [b.id, b]));
batchesMap.set(mtoBatch.id, mtoBatch);
batchesMap.set(irgpBatch.id, irgpBatch);

const newBatches = Array.from(batchesMap.values());
fs.writeFileSync(batchesPath, JSON.stringify(newBatches, null, 2) + "\n", "utf-8");
console.log("Updated batches.json successfully. Total batches:", newBatches.length);

// 3. Mentors
// Ensure the 5 MTO mentors have courseIds including 'mto-readiness'
const mtoMentorIds = [
  "mentor-arif-rahman",
  "mentor-tanvir-hossain",
  "mentor-mir-hasib",
  "mentor-fahim-ahmed",
  "mentor-sayem-chowdhury"
];

for (const mentor of mentors) {
  if (mtoMentorIds.includes(mentor.id)) {
    const ids = new Set(mentor.courseIds || []);
    ids.add("mto");
    ids.add("mto-readiness");
    mentor.courseIds = Array.from(ids);
  }
}

fs.writeFileSync(mentorsPath, JSON.stringify(mentors, null, 2) + "\n", "utf-8");
console.log("Updated mentors.json successfully.");

