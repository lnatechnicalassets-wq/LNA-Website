import { z } from "zod";

export interface ContactFormState {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: {
    name?: string;
    email?: string;
    phone?: string;
    category?: string;
    message?: string;
  };
}

// Regex preventing raw script tags or HTML injection
const NO_HTML_REGEX = /^[^<>]+$/;

export const ContactInquirySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters")
    .regex(NO_HTML_REGEX, "Special characters or HTML tags are not permitted"),
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .max(120, "Email cannot exceed 120 characters"),
  phone: z
    .string()
    .trim()
    .max(25, "Phone number is too long")
    .optional()
    .refine((val) => !val || /^[0-9+\-\s()]{6,25}$/.test(val), {
      message: "Please provide a valid phone number (e.g. +880 1700 000000)",
    }),
  category: z
    .string()
    .trim()
    .min(1, "Please select an inquiry category")
    .max(50, "Category value is invalid"),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message cannot exceed 2,000 characters")
    .regex(NO_HTML_REGEX, "HTML tags or script elements are not permitted in message"),
  // Honeypot field (must remain empty for human submissions)
  website_hp: z.string().optional(),
});

export type ContactInquiryInput = z.infer<typeof ContactInquirySchema>;

export interface SendEmailPayload {
  from: string;
  to: string[];
  reply_to: string;
  subject: string;
  text: string;
  html: string;
}
