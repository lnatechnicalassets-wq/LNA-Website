import { z } from "zod";
import { ProvenanceSchema } from "./provenance";

export const HeroSlideSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(3),
  headline: z.string().min(5),
  description: z.string().min(10),
  ctaText: z.string().min(2),
  ctaHref: z.string().min(1),
  secondaryCtaText: z.string().optional(),
  secondaryCtaHref: z.string().optional(),
  badgeText: z.string().optional(),
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

export type HeroSlide = z.infer<typeof HeroSlideSchema>;
export type HomeSectionItem = z.infer<typeof HomeSectionItemSchema>;
export type HomeSections = z.infer<typeof HomeSectionsSchema>;
export type ImpactFigure = z.infer<typeof ImpactFigureSchema>;
