import { z } from "zod";
import { ProvenanceSchema } from "./provenance";

export const HeroSlideSchema = z.object({
  id: z.string().min(1),
  courseId: z.string().optional(),
  title: z.string().min(3),
  headline: z.string().min(5),
  description: z.string().min(10),
  ctaText: z.string().min(2),
  ctaHref: z.string().min(1),
  secondaryCtaText: z.string().optional(),
  secondaryCtaHref: z.string().optional(),
  badgeText: z.string().optional(),
  startDate: z.string().optional(),
  duration: z.string().optional(),
  venue: z.string().optional(),
  imageObjectPosition: z.string().optional(),
  imagePlaceholder: z.string().min(1),
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

export const MentorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  role: z.string().min(2),
  organization: z.string().min(2),
  bio: z.string().min(10),
  courseId: z.string().optional(),
  order: z.number().int().nonnegative(),
  isPlaceholder: z.boolean().default(false),
  provenance: ProvenanceSchema,
});

export const ReviewSchema = z.object({
  id: z.string().min(1),
  quote: z.string().min(10),
  author: z.string().min(2),
  designation: z.string().min(2),
  company: z.string().min(2),
  cohort: z.string().min(3),
  order: z.number().int().nonnegative(),
  isPlaceholder: z.boolean().default(false),
  provenance: ProvenanceSchema,
});

export type HeroSlide = z.infer<typeof HeroSlideSchema>;
export type HomeSectionItem = z.infer<typeof HomeSectionItemSchema>;
export type HomeSections = z.infer<typeof HomeSectionsSchema>;
export type ImpactFigure = z.infer<typeof ImpactFigureSchema>;
export type Partner = z.infer<typeof PartnerSchema>;
export type Event = z.infer<typeof EventSchema>;
export type Mentor = z.infer<typeof MentorSchema>;
export type Review = z.infer<typeof ReviewSchema>;

const mentorAvatars: Record<string, string> = {
  "mentor-leadership-lead": "/images/mentor-tariq.jpg",
  "mentor-finance-lead": "/images/mentor-kamrul.jpg",
  "mentor-digital-lead": "/images/mentor-anisur.jpg",
  "mentor-da-01": "/images/mentor-kamrul.jpg",
  "mentor-da-02": "/images/mentor-anisur.jpg",
  "mentor-el-02": "/images/mentor-anisur.jpg",
  "mentor-el-03": "/images/mentor-tariq.jpg",
  "mentor-cf-02": "/images/mentor-tariq.jpg",
  "mentor-cf-03": "/images/mentor-anisur.jpg",
  "mentor-cf-04": "/images/mentor-kamrul.jpg",
  "mentor-dt-02": "/images/mentor-tariq.jpg",
  "mentor-dt-03": "/images/mentor-kamrul.jpg",
  "mentor-dt-04": "/images/mentor-anisur.jpg",
  "mentor-dt-05": "/images/mentor-tariq.jpg",
  "mentor-so-01": "/images/mentor-tariq.jpg",
  "mentor-so-02": "/images/mentor-anisur.jpg",
  "mentor-so-03": "/images/mentor-kamrul.jpg",
  "mentor-so-04": "/images/mentor-tariq.jpg",
  "mentor-so-05": "/images/mentor-anisur.jpg",
  "mentor-so-06": "/images/mentor-kamrul.jpg",
  "mentor-pg-01": "/images/mentor-kamrul.jpg",
  "mentor-pg-02": "/images/mentor-anisur.jpg",
  "mentor-pg-03": "/images/mentor-tariq.jpg",
};

const defaultAvatars = [
  "/images/mentor-tariq.jpg",
  "/images/mentor-kamrul.jpg",
  "/images/mentor-anisur.jpg",
];

export function getMentorAvatar(mentor: { id: string }, index: number = 0): string {
  if (mentorAvatars[mentor.id]) return mentorAvatars[mentor.id];
  return defaultAvatars[index % defaultAvatars.length];
}
