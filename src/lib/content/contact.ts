import { z } from "zod";
import { ProvenanceSchema } from "./provenance";

export const ContactShortcutSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2),
  icon: z.enum(["register", "schedule", "fee", "support"]),
  categoryValue: z.string().min(1),
});

export const ContactCategoryOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
});

export const ContactConfigSchema = z.object({
  eyebrow: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(5),
  email: z.string().email(),
  phone: z.string().min(1),
  phoneDisplay: z.string().min(1),
  whatsapp: z.string().optional(),
  officeAddress: z.object({
    line1: z.string().min(1),
    line2: z.string().min(1),
    city: z.string().min(1),
    country: z.string().min(1),
  }),
  officeHours: z.string().min(1),
  mapUrl: z.string().url().optional(),
  shortcuts: z.array(ContactShortcutSchema),
  categories: z.array(ContactCategoryOptionSchema),
  visibility: z.object({
    showEmail: z.boolean().default(true),
    showPhone: z.boolean().default(true),
    showAddress: z.boolean().default(true),
    showHours: z.boolean().default(true),
    showOfficeVisual: z.boolean().default(true),
  }),
  provenance: ProvenanceSchema,
});

export type ContactShortcut = z.infer<typeof ContactShortcutSchema>;
export type ContactCategoryOption = z.infer<typeof ContactCategoryOptionSchema>;
export type ContactConfig = z.infer<typeof ContactConfigSchema>;
