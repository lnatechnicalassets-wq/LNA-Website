"use server";

import "server-only";
import { getServerEnv } from "@/server/env";
import {
  type ContactFormState,
  type SendEmailPayload,
  ContactInquirySchema,
} from "@/lib/contact-types";

// In-memory rate limiting tracker (max 5 inquiries per minute per IP/client token)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(clientId) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  validTimestamps.push(now);
  rateLimitMap.set(clientId, validTimestamps);
  return true;
}

/**
 * Core processor for contact form inquiries.
 * Safe for unit testing via dependency-injected email sender.
 */
export async function processContactInquiry(
  input: Record<string, unknown>,
  options?: {
    clientId?: string;
    sendEmail?: (payload: SendEmailPayload) => Promise<{ id?: string; error?: string }>;
  }
): Promise<ContactFormState> {
  // 1. Zod Validation
  const parsed = ContactInquirySchema.safeParse(input);
  if (!parsed.success) {
    const formatted = parsed.error.format();
    return {
      success: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: {
        name: formatted.name?._errors[0],
        email: formatted.email?._errors[0],
        phone: formatted.phone?._errors[0],
        category: formatted.category?._errors[0],
        message: formatted.message?._errors[0],
      },
    };
  }

  const data = parsed.data;

  // 2. Bot / Honeypot Check
  if (data.website_hp && data.website_hp.trim().length > 0) {
    // Silently drop bot submissions without alerting the automated scraper
    return {
      success: true,
      message: "Your message has been sent successfully. Our team will review your enquiry.",
    };
  }

  // 3. Abuse / Rate Limiting
  const clientId = options?.clientId || (data.email ? data.email.toLowerCase() : "anonymous");
  if (!checkRateLimit(clientId)) {
    return {
      success: false,
      error: "Too many submission attempts. Please wait a minute before trying again.",
    };
  }

  // 4. Email Dispatch via Resend
  const env = getServerEnv();
  const apiKey = env.RESEND_API_KEY;
  const fromEmail = env.RESEND_FROM_EMAIL;
  const toEmail = env.RESEND_TO_EMAIL;

  const emailPayload: SendEmailPayload = {
    from: `Lead Nation Academy Contact <${fromEmail}>`,
    to: [toEmail],
    reply_to: data.email,
    subject: `[LNA Website Inquiry] [${data.category.toUpperCase()}] from ${data.name}`,
    text: `New Contact Inquiry received from lnabd.org:\n\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || "Not provided"}\nCategory: ${data.category}\n\nMessage:\n${data.message}\n`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #172E35; line-height: 1.6;">
        <h2 style="color: #086477; border-bottom: 2px solid #C5E2E5; padding-bottom: 8px;">New Contact Inquiry</h2>
        <p><strong>Name:</strong> ${escapeHtml(data.name)}</p>
        <p><strong>Email:</strong> <a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></p>
        <p><strong>Phone:</strong> ${escapeHtml(data.phone || "Not provided")}</p>
        <p><strong>Inquiry Category:</strong> ${escapeHtml(data.category)}</p>
        <h3 style="color: #086477; margin-top: 24px;">Message:</h3>
        <blockquote style="background: #F6FAFA; border-left: 4px solid #086477; padding: 12px 16px; margin: 0; white-space: pre-wrap;">${escapeHtml(data.message)}</blockquote>
      </div>
    `,
  };

  // If a mock or custom sender is injected (e.g. during testing)
  if (options?.sendEmail) {
    try {
      const res = await options.sendEmail(emailPayload);
      if (res.error) {
        return {
          success: false,
          error: "Failed to dispatch email notification. Please try again later.",
        };
      }
      return {
        success: true,
        message: "Your message has been sent successfully. Our team will review your enquiry.",
      };
    } catch {
      return {
        success: false,
        error: "An unexpected error occurred while delivering your message. Please try again.",
      };
    }
  }

  // If live Resend API key is not configured in this environment
  if (!apiKey || apiKey.startsWith("dummy") || apiKey.includes("placeholder")) {
    // Rule: Do not pretend messages were sent if credentials are missing
    return {
      success: false,
      error:
        "The automated contact email service is currently not configured with live credentials. Please reach out to info@lnabd.org directly.",
    };
  }

  // Real Resend API dispatch
  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!resendRes.ok) {
      return {
        success: false,
        error: "Unable to deliver inquiry message at this time. Please email info@lnabd.org.",
      };
    }

    return {
      success: true,
      message: "Your message has been sent successfully. Our team will review your enquiry.",
    };
  } catch {
    return {
      success: false,
      error: "Network error connecting to email service. Please try again.",
    };
  }
}

/**
 * Server Action for Next.js form handling.
 */
export async function submitContactInquiry(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const rawData: Record<string, unknown> = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    category: formData.get("category"),
    message: formData.get("message"),
    website_hp: formData.get("website_hp") || undefined,
  };

  return processContactInquiry(rawData);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
