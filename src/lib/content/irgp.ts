import { z } from "zod";
import { ProvenanceSchema } from "./provenance";

export const IrgpActivitySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2),
  description: z.string().min(5),
  icon: z.string().optional(),
});

export const IrgpStorySchema = z.object({
  id: z.string().min(1),
  badge: z.string().min(1),
  status: z.string().min(1),
  title: z.string().min(3),
  cohort: z.string().min(1),
  period: z.string().min(1),
  description: z.string().min(10),
  ctaText: z.string().min(2),
  modalOverview: z.string().min(20),
  objectives: z.array(z.string()).min(1),
  activities: z.array(IrgpActivitySchema).min(1),
  provenance: ProvenanceSchema,
});

export const IrgpGalleryItemSchema = z.object({
  id: z.string().min(1),
  src: z.string().min(1),
  category: z.string().min(2),
  icon: z.string().min(1),
  title: z.string().min(2),
  caption: z.string().min(5),
  alt: z.string().min(5),
  order: z.number().int().nonnegative(),
  provenance: ProvenanceSchema,
});

export const IrgpOutcomeMetricSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(2),
  metric: z.string().optional(),
  statusText: z.string().optional(),
  statusType: z.enum(["verified", "pending_audit", "informational"]).default("pending_audit"),
  tooltip: z.string().min(5),
  icon: z.string().min(1),
  isVerified: z.boolean().default(false),
  published: z.boolean().default(true),
  provenance: ProvenanceSchema,
});

export const IrgpOutcomesSchema = z.object({
  heading: z.string().min(2),
  subheading: z.string().min(2),
  disclaimer: z.string().optional(),
  metrics: z.array(IrgpOutcomeMetricSchema).min(1),
  provenance: ProvenanceSchema,
});

export const IrgpDataSchema = z.object({
  story: IrgpStorySchema,
  gallery: z.array(IrgpGalleryItemSchema).min(4),
  outcomes: IrgpOutcomesSchema,
});

export type IrgpActivity = z.infer<typeof IrgpActivitySchema>;
export type IrgpStory = z.infer<typeof IrgpStorySchema>;
export type IrgpGalleryItem = z.infer<typeof IrgpGalleryItemSchema>;
export type IrgpOutcomeMetric = z.infer<typeof IrgpOutcomeMetricSchema>;
export type IrgpOutcomes = z.infer<typeof IrgpOutcomesSchema>;
export type IrgpData = z.infer<typeof IrgpDataSchema>;

export const DEFAULT_IRGP_DATA: IrgpData = {
  story: {
    id: "irgp-story",
    badge: "FEATURED SUCCESS STORY",
    status: "Completed Program",
    title: "Industry Readiness Graduate Program (IRGP)",
    cohort: "Cohort 1",
    period: "Jan – Mar 2025",
    description:
      "A focused, hands-on program that helps early-career talent build practical skills, professional confidence, and workplace readiness.",
    ctaText: "Explore the IRGP Story",
    modalOverview:
      "The Industry Readiness Graduate Program (IRGP) was developed by Lead Nation Academy as an immersive, industry-guided transition bridge for ambitious university graduates and early-career talent in Bangladesh. Over an intensive multi-week cohort curriculum, participants engaged in real-world business challenges, executive mentorship dialogues, and rigorous professional communication training designed to replicate corporate boardroom expectations.",
    objectives: [
      "Bridge the gap between academic foundation and modern enterprise workplace readiness",
      "Develop high-impact analytical problem-solving and structured business communication skills",
      "Build corporate confidence through direct mentor feedback from executive leaders",
      "Foster team collaboration on live business case simulations and strategic presentations",
    ],
    activities: [
      {
        id: "act-1",
        title: "Skill Development Workshops",
        description:
          "Intensive hands-on masterclasses covering workplace productivity tools, financial literacy, structured business writing, and executive presence.",
        icon: "Monitor",
      },
      {
        id: "act-2",
        title: "Collaborative Team Projects",
        description:
          "Small cohort syndicates tackling enterprise business case studies, developing strategy decks, and presenting findings under simulated deadlines.",
        icon: "Users",
      },
      {
        id: "act-3",
        title: "Executive Mentorship Dialogues",
        description:
          "One-on-one advisory roundtables with senior corporate leaders sharing organizational navigation insights and career roadmaps.",
        icon: "UserCheck",
      },
      {
        id: "act-4",
        title: "Capstone & Program Milestone",
        description:
          "Final project presentations evaluated by industry juries, culminating in formal cohort completion and verified graduation credentials.",
        icon: "Award",
      },
    ],
    provenance: {
      class: "B",
      verified: false,
      source: "Approved Section 5 IRGP Reference Specification (media_1794084075006_79b97a06.jpg)",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
  gallery: [
    {
      id: "irgp-gallery-01",
      src: "/images/irgp-gallery-skills.jpg",
      category: "Skill Development Session",
      icon: "Monitor",
      title: "Executive Skill Development",
      caption:
        "Interactive classroom workshops focused on practical workplace frameworks, digital tools, and analytical problem solving.",
      alt: "Bangladeshi learners participating in an executive skill development session with laptops in a modern training room",
      order: 1,
      provenance: {
        class: "B",
        verified: false,
        source: "Representative IRGP Training Photograph (Class B Development Placeholder)",
        verifiedBy: null,
        verifiedOn: null,
      },
    },
    {
      id: "irgp-gallery-02",
      src: "/images/irgp-gallery-teamwork.jpg",
      category: "Team Project & Practice",
      icon: "Users",
      title: "Collaborative Team Projects",
      caption:
        "Participants collaborating closely on business presentation decks, market research models, and cross-functional case studies.",
      alt: "Young professionals gathered around a laptop collaborating enthusiastically on a team business project",
      order: 2,
      provenance: {
        class: "B",
        verified: false,
        source: "Representative IRGP Training Photograph (Class B Development Placeholder)",
        verifiedBy: null,
        verifiedOn: null,
      },
    },
    {
      id: "irgp-gallery-03",
      src: "/images/irgp-gallery-discussion.jpg",
      category: "Mentor-Led Discussion",
      icon: "UserCheck",
      title: "Executive Mentorship Sessions",
      caption:
        "Senior corporate directors advising learners on organizational culture, communication etiquette, and strategic leadership thinking.",
      alt: "Senior corporate mentor actively mentoring and advising a young learner across a meeting table",
      order: 3,
      provenance: {
        class: "B",
        verified: false,
        source: "Representative IRGP Training Photograph (Class B Development Placeholder)",
        verifiedBy: null,
        verifiedOn: null,
      },
    },
    {
      id: "irgp-gallery-04",
      src: "/images/irgp-gallery-completion.jpg",
      category: "Program Completion",
      icon: "Award",
      title: "Cohort Graduation & Milestones",
      caption:
        "Celebration of program completion with certificates presented in front of the LNA executive backdrop.",
      alt: "Graduates in executive attire holding completion folders in front of an LNA backdrop banner",
      order: 4,
      provenance: {
        class: "B",
        verified: false,
        source: "Representative IRGP Training Photograph (Class B Development Placeholder)",
        verifiedBy: null,
        verifiedOn: null,
      },
    },
  ],
  outcomes: {
    heading: "IRGP PROGRAM OUTCOMES",
    subheading: "Verified status from our completed IRGP (Cohort 1)",
    disclaimer:
      "Program documentation verified • Quantitative career placement audit in progress by Lead Nation Academy.",
    metrics: [
      {
        id: "outcome-cohort",
        label: "Cohort Status",
        statusText: "Inaugural Cohort",
        statusType: "informational",
        tooltip:
          "Inaugural graduate cohort completed under executive curriculum guidelines. Official participant registry count is undergoing formal audit.",
        icon: "GraduationCap",
        isVerified: false,
        published: true,
        provenance: {
          class: "B",
          verified: false,
          source: "LNA Academic Registry (Inaugural Cohort Status)",
          verifiedBy: null,
          verifiedOn: null,
        },
      },
      {
        id: "outcome-progress",
        label: "Career Tracking",
        statusText: "Audit in Progress",
        statusType: "pending_audit",
        tooltip:
          "Post-program graduate employment transitions and workplace readiness are currently tracked through formal alumni surveys.",
        icon: "Briefcase",
        isVerified: false,
        published: true,
        provenance: {
          class: "B",
          verified: false,
          source: "LNA Career Services (Alumni Survey in Progress)",
          verifiedBy: null,
          verifiedOn: null,
        },
      },
      {
        id: "outcome-rating",
        label: "Program Evaluation",
        statusText: "Evaluation Pending",
        statusType: "pending_audit",
        tooltip:
          "Comprehensive qualitative and quantitative evaluation data undergoing formal review before public publication.",
        icon: "Star",
        isVerified: false,
        published: true,
        provenance: {
          class: "B",
          verified: false,
          source: "LNA Academic Evaluation Framework",
          verifiedBy: null,
          verifiedOn: null,
        },
      },
    ],
    provenance: {
      class: "B",
      verified: false,
      source: "LNA Academic Operations Documentation",
      verifiedBy: null,
      verifiedOn: null,
    },
  },
};
