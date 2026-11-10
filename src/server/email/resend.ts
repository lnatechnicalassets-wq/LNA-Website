import "server-only";
import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatPoishaToBDT } from "@/lib/money";
import { parseCurrentServerEnv } from "@/server/env";
import {
  createSupabaseAdminClient,
  hasConfiguredSupabaseServerEnv,
} from "@/server/supabase/clients";

export interface ConfirmationEmailPayload {
  public_ref: string;
  full_name: string;
  course_title: string;
  batch_name: string;
  venue: string;
  start_date: string;
  payable_poisha: number | string;
  payment_method: "bkash" | "free" | "bank_transfer";
}

export interface EmailOutboxDispatchResult {
  sent: boolean;
  alreadySent?: boolean;
  skipped?: boolean;
  mode: "disabled" | "mock" | "live";
  providerMessageId?: string | null;
  error?: string;
}

export interface OutboxEmailSender {
  send(args: {
    from: string;
    to: string[];
    subject: string;
    html: string;
    text: string;
    idempotencyKey: string;
  }): Promise<{ id?: string; error?: string }>;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Renders transactional HTML + plain-text email without including raw payment credentials or trxIDs.
 */
export function renderConfirmationEmailContent(
  template: string,
  payload: ConfirmationEmailPayload,
  appUrl: string
): { subject: string; html: string; text: string } {
  const poisha = BigInt(payload.payable_poisha ?? 0);
  const feeDisplay =
    poisha === 0n ? "Free Registration" : formatPoishaToBDT(poisha).replace("৳", "BDT ");
  const statusUrl = `${appUrl.replace(/\/+$/, "")}/status?ref=${encodeURIComponent(payload.public_ref)}`;
  const isFree = template === "enrollment_confirmed_free" || poisha === 0n;

  const subject = isFree
    ? `Registration Confirmed: ${payload.course_title} (${payload.public_ref})`
    : `Enrollment Confirmed: ${payload.course_title} (${payload.public_ref})`;

  const text = [
    `Dear ${payload.full_name},`,
    "",
    isFree
      ? `Your free registration with Lead Nation Academy is confirmed.`
      : `Your bKash payment has been verified server-side and your seat with Lead Nation Academy is confirmed.`,
    "",
    `LNA Application ID: ${payload.public_ref}`,
    `Program: ${payload.course_title}`,
    `Batch: ${payload.batch_name}`,
    `Start Date: ${payload.start_date}`,
    `Venue: ${payload.venue}`,
    `Fee Paid: ${feeDisplay}`,
    "",
    `Check your status anytime at: ${statusUrl}`,
    "",
    `Lead Nation Academy Admissions`,
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #172E35; line-height: 1.6; max-width: 600px; margin: 0 auto;">
      <div style="border-bottom: 2px solid #C5E2E5; padding-bottom: 12px; margin-bottom: 20px;">
        <p style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #086477; font-weight: 700; margin: 0 0 4px 0;">Lead Nation Academy</p>
        <h1 style="font-size: 22px; color: #172E35; margin: 0;">${isFree ? "Registration Confirmed" : "Enrollment Confirmed"}</h1>
      </div>
      <p>Dear ${escapeHtml(payload.full_name)},</p>
      <p>${
        isFree
          ? "Your place in the selected Lead Nation Academy cohort is confirmed."
          : "Your payment has been verified and your seat in the cohort is confirmed."
      }</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #F6FAFA; border: 1px solid #C5E2E5; border-radius: 8px;">
        <tbody>
          <tr><td style="padding: 10px 14px; color: #526E77; font-size: 13px;">LNA Application ID</td><td style="padding: 10px 14px; font-family: monospace; font-weight: 700; color: #086477;">${escapeHtml(payload.public_ref)}</td></tr>
          <tr><td style="padding: 10px 14px; color: #526E77; font-size: 13px;">Program</td><td style="padding: 10px 14px; font-weight: 600;">${escapeHtml(payload.course_title)}</td></tr>
          <tr><td style="padding: 10px 14px; color: #526E77; font-size: 13px;">Batch</td><td style="padding: 10px 14px; font-weight: 600;">${escapeHtml(payload.batch_name)}</td></tr>
          <tr><td style="padding: 10px 14px; color: #526E77; font-size: 13px;">Start Date</td><td style="padding: 10px 14px;">${escapeHtml(payload.start_date)}</td></tr>
          <tr><td style="padding: 10px 14px; color: #526E77; font-size: 13px;">Venue</td><td style="padding: 10px 14px;">${escapeHtml(payload.venue)}</td></tr>
          <tr><td style="padding: 10px 14px; color: #526E77; font-size: 13px;">Fee Status</td><td style="padding: 10px 14px; font-weight: 600;">${escapeHtml(feeDisplay)}</td></tr>
        </tbody>
      </table>
      <p style="margin-top: 20px;">
        <a href="${escapeHtml(statusUrl)}" style="display: inline-block; background: #086477; color: #ffffff; text-decoration: none; font-weight: 600; padding: 10px 18px; border-radius: 8px;">Check application status</a>
      </p>
      <p style="font-size: 12px; color: #526E77; margin-top: 24px;">Keep your LNA Application ID to verify your enrollment status anytime at lnabd.org/status.</p>
    </div>
  `;

  return { subject, html, text };
}

/**
 * Dispatches one queued email_outbox row via Resend (live) or mock mode without ever throwing
 * back into payment confirmation execution paths (FR-PAY-009, NFR-AVL-01).
 */
export async function dispatchEmailOutboxById(
  outboxId: string,
  options?: {
    senderOverride?: OutboxEmailSender;
    adminOverride?: SupabaseClient;
  }
): Promise<EmailOutboxDispatchResult> {
  const env = parseCurrentServerEnv();
  const mode = env.EMAIL_DISPATCH_MODE;

  if (!options?.adminOverride && !hasConfiguredSupabaseServerEnv()) {
    return { sent: false, skipped: true, mode, error: "SUPABASE_NOT_CONFIGURED" };
  }

  const admin = options?.adminOverride ?? createSupabaseAdminClient();
  const { data: outbox, error: fetchError } = await admin
    .from("email_outbox")
    .select(
      "id, template, recipient_email, idempotency_key, payload, status, provider_message_id, retry_count"
    )
    .eq("id", outboxId)
    .maybeSingle();

  if (fetchError || !outbox) {
    return { sent: false, mode, error: "OUTBOX_RECORD_NOT_FOUND" };
  }

  if (outbox.status === "sent") {
    return {
      sent: true,
      alreadySent: true,
      mode,
      providerMessageId: outbox.provider_message_id,
    };
  }

  if (mode === "disabled") {
    return { sent: false, skipped: true, mode };
  }

  const payload = outbox.payload as unknown as ConfirmationEmailPayload;
  const rendered = renderConfirmationEmailContent(outbox.template, payload, env.APP_URL);
  const fromHeader = `Lead Nation Academy Admissions <${env.RESEND_FROM_EMAIL}>`;

  try {
    let providerMessageId: string | null = null;

    if (options?.senderOverride) {
      const customResult = await options.senderOverride.send({
        from: fromHeader,
        to: [String(outbox.recipient_email)],
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        idempotencyKey: outbox.idempotency_key,
      });
      if (customResult.error || !customResult.id) {
        throw new Error(customResult.error ?? "Email provider rejected dispatch");
      }
      providerMessageId = customResult.id;
    } else if (mode === "mock") {
      if (env.NODE_ENV === "production") {
        throw new Error("Mock email dispatch is forbidden in production");
      }
      providerMessageId = `mock_resend_${String(outbox.id).replace(/-/g, "").slice(0, 12)}`;
    } else {
      const resend = new Resend(env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from: fromHeader,
        to: [String(outbox.recipient_email)],
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        headers: {
          "X-Entity-Ref-ID": String(outbox.idempotency_key),
        },
      });

      if (error || !data?.id) {
        throw new Error(error?.message ?? "Resend API dispatch failed");
      }
      providerMessageId = data.id;
    }

    await admin
      .from("email_outbox")
      .update({
        status: "sent",
        provider_message_id: providerMessageId,
        sent_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", outbox.id);

    return { sent: true, mode, providerMessageId };
  } catch (err) {
    const safeError = err instanceof Error ? err.message.slice(0, 200) : "Email dispatch failure";
    await admin
      .from("email_outbox")
      .update({
        status: "failed",
        retry_count: Number(outbox.retry_count ?? 0) + 1,
        last_error: safeError,
      })
      .eq("id", outbox.id);

    return { sent: false, mode, error: safeError };
  }
}
