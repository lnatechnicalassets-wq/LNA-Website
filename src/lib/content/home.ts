import { z } from "zod";
import { ProvenanceSchema } from "./provenance";

export const ProgramHighlightSchema = z.object({
  label: z.string().min(1),
  sublabel: z.string().min(1),
  icon: z.string().optional(),
});

export const HeroSlideSchema = z.object({
  id: z.string().min(1),
  programType: z.enum(["mto", "irgp"]).optional(),
  courseId: z.string().optional(),
  title: z.string().min(2),
  subtitle: z.string().optional(),
  headline: z.string().min(2).optional(),
  description: z.string().min(10),
  eyebrow: z.string().optional(),
  highlights: z.array(ProgramHighlightSchema).optional(),
  mentorHeading: z.string().optional(),
  mentorEyebrow: z.string().optional(),
  mentorIds: z.array(z.string()).optional(),
  ctaText: z.string().min(2),
  ctaHref: z.string().min(1),
  secondaryCtaText: z.string().optional(),
  secondaryCtaHref: z.string().optional(),
  badgeText: z.string().optional(),
  startDate: z.string().optional(),
  classStartLabel: z.string().optional(),
  classStartDate: z.string().optional(),
  duration: z.string().optional(),
  venue: z.string().optional(),
  imageObjectPosition: z.string().optional(),
  imagePlaceholder: z.string().optional(),
  order: z.number().int().nonnegative(),
  provenance: ProvenanceSchema,
});

export const HomeSectionItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  enabled: z.boolean(),
  order: z.number().int().nonnegative(),
});

export const HomeSectionsSchema = z.object({
  sections: z.array(HomeSectionItemSchema),
  provenance: ProvenanceSchema,
});

export const ImpactFigureSchema = z.object({
  id: z.string().min(1),
  metric: z.string().min(1),
  label: z.string().min(2),
  description: z.string().min(5),
  order: z.number().int().nonnegative(),
  isPlaceholder: z.boolean().default(false),
  provenance: ProvenanceSchema,
});

export const PartnerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  sector: z.string().min(2),
  badgeText: z.string().optional(),
  isPlaceholder: z.boolean().default(false),
  order: z.number().int().nonnegative(),
  provenance: ProvenanceSchema,
});

export const EventSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(3),
  subtitle: z.string().min(3),
  date: z.string().min(4),
  time: z.string().min(2),
  venue: z.string().min(3),
  deliveryMode: z.literal("offline"),
  featured: z.boolean().default(false),
  order: z.number().int().nonnegative(),
  isPlaceholder: z.boolean().default(false),
  provenance: ProvenanceSchema,
});

export const CareerHistoryItemSchema = z.object({
  company: z.string().min(1),
  role: z.string().optional(),
  logoIcon: z.string().optional(),
  logoSrc: z.string().optional(),
});

export const MentorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  role: z.string().min(2),
  organization: z.string().min(2),
  bio: z.string().min(10),
  courseId: z.string().optional(),
  courseIds: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  categories: z.array(z.string()).optional(),
  order: z.number().int().nonnegative(),
  isPlaceholder: z.boolean().default(false),
  published: z.boolean().optional(),
  linkedInUrl: z.string().url().optional(),
  portraitSrc: z.string().optional(),
  expertise: z.array(z.string()).optional(),
  careerHistory: z.array(CareerHistoryItemSchema).optional(),
  provenance: ProvenanceSchema,
});

export const ReviewSchema = z.object({
  id: z.string().min(1),
  quote: z.string().min(10),
  author: z.string().min(2),
  designation: z.string().min(2),
  company: z.string().optional().default(""),
  cohort: z.string().optional().default(""),
  program: z.string().optional(),
  portraitSrc: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  reviewDate: z.string().optional(),
  verifiedReview: z.boolean().optional(),
  videoUrl: z.string().url().optional(),
  order: z.number().int().nonnegative(),
  isPlaceholder: z.boolean().default(false),
  published: z.boolean().optional(),
  provenance: ProvenanceSchema,
});

export type HeroSlide = z.infer<typeof HeroSlideSchema>;
export type HomeSectionItem = z.infer<typeof HomeSectionItemSchema>;
export type HomeSections = z.infer<typeof HomeSectionsSchema>;
export type ImpactFigure = z.infer<typeof ImpactFigureSchema>;
export type Partner = z.infer<typeof PartnerSchema>;
export type Event = z.infer<typeof EventSchema>;
export type CareerHistoryItem = z.infer<typeof CareerHistoryItemSchema>;
export type Mentor = z.infer<typeof MentorSchema>;
export type Review = z.infer<typeof ReviewSchema>;

export { getMentorAvatar } from "@/lib/mentors";
