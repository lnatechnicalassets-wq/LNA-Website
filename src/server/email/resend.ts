import "server-only";
import { after } from "next/server";
import { receiptFilename, receiptSchema, renderPaymentReceipt } from "./receipt";
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
  payment_method: "bkash" | "free" | "bank_transfer" | "cash" | "full_fee_waiver";
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
    attachments?: { filename: string; content: string }[];
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
  const waived = payload.payment_method === "full_fee_waiver";
  const feeDisplay = waived
    ? "Full fee waiver (BDT 0.00 collected)"
    : poisha === 0n
      ? "Free Registration"
      : formatPoishaToBDT(poisha).replace("৳", "BDT ");
  const statusUrl = `${appUrl.replace(/\/+$/, "")}/status?ref=${encodeURIComponent(payload.public_ref)}`;
  const isFree = template === "enrollment_confirmed_free" || poisha === 0n;

  const subject = isFree
    ? `Registration Confirmed: ${payload.course_title} (${payload.public_ref})`
    : `Enrollment Confirmed: ${payload.course_title} (${payload.public_ref})`;

  const text = [
    `Dear ${payload.full_name},`,
    "",
    waived
      ? "Your enrollment with an approved full fee waiver is confirmed."
      : isFree
        ? `Your free registration with Lead Nation Academy is confirmed.`
        : `Your payment has been verified and your seat with Lead Nation Academy is confirmed.`,
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
        waived
          ? "Your enrollment with an approved full fee waiver is confirmed."
          : isFree
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

  if (mode === "disabled") return { sent: false, skipped: true, mode };
  if (mode === "mock" && env.NODE_ENV === "production") return { sent: false, skipped: true, mode };

  const admin = options?.adminOverride ?? createSupabaseAdminClient();
  const { data: claim, error: claimError } = await admin.rpc("claim_confirmation_email", {
    p_id: outboxId,
    p_live: mode === "live",
  });
  if (claimError || !claim || typeof claim !== "object") {
    return { sent: false, mode, error: "EMAIL_CLAIM_FAILED" };
  }
  if (claim.status === "sent") {
    return { sent: true, alreadySent: true, mode, providerMessageId: claim.provider_message_id };
  }
  if (claim.status !== "claimed" || !claim.outbox?.dispatch_token) {
    return {
      sent: false,
      skipped: true,
      mode,
      error: String(claim.status ?? "EMAIL_UNAVAILABLE").toUpperCase(),
    };
  }
  const outbox = claim.outbox;
  let providerMessageId: string | null = null;
  let safeError: string | null = null;
  try {
    const payload = outbox.payload as ConfirmationEmailPayload;
    const rendered = renderConfirmationEmailContent(outbox.template, payload, env.APP_URL);
    const paid = outbox.template === "enrollment_confirmed_paid";
    const receipt = paid ? receiptSchema.parse(claim.receipt) : null;
    const attachments = receipt
      ? [
          {
            filename: receiptFilename(receipt),
            content: renderPaymentReceipt(receipt).toString("base64"),
          },
        ]
      : undefined;
    const args = {
      from: `Lead Nation Academy Admissions <${env.RESEND_FROM_EMAIL}>`,
      to: [String(outbox.recipient_email)],
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      ...(attachments ? { attachments } : {}),
    };
    if (options?.senderOverride) {
      const result = await options.senderOverride.send({
        ...args,
        idempotencyKey: String(outbox.idempotency_key),
      });
      if (result.error || !result.id) throw new Error("EMAIL_PROVIDER_REJECTED");
      providerMessageId = result.id;
    } else if (mode === "mock") {
      providerMessageId = `mock_resend_${String(outbox.id).replace(/-/g, "").slice(0, 12)}`;
    } else {
      // The actual Resend idempotency header (not an informational X-Entity-Ref-ID).
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": String(outbox.idempotency_key),
        },
        body: JSON.stringify(args),
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
      const result: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        !result ||
        typeof result !== "object" ||
        !("id" in result) ||
        typeof result.id !== "string" ||
        !result.id
      ) {
        throw new Error(`EMAIL_PROVIDER_HTTP_${response.status}`);
      }
      providerMessageId = result.id;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    safeError = /^EMAIL_PROVIDER_(REJECTED|HTTP_\d{3})$/.test(message)
      ? message
      : "EMAIL_DISPATCH_FAILED";
  }
  const { data: finished, error: finishError } = await admin.rpc("finish_confirmation_email", {
    p_id: outboxId,
    p_token: outbox.dispatch_token,
    p_provider_id: providerMessageId,
    p_error: safeError,
  });
  if (finishError || finished !== true)
    return { sent: false, mode, error: "EMAIL_FINALIZATION_UNCONFIRMED" };
  if (providerMessageId) return { sent: true, mode, providerMessageId };
  return { sent: false, mode, error: safeError ?? "EMAIL_DISPATCH_FAILED" };
}

/** Keep the applicant's response independent of mail delivery. The database outbox is durable. */
export async function scheduleConfirmationEmail(
  id: string,
  options?: { senderOverride?: OutboxEmailSender; adminOverride?: SupabaseClient }
): Promise<void> {
  if (options?.senderOverride || options?.adminOverride || process.env.NODE_ENV === "test") {
    await dispatchEmailOutboxById(id, options).catch(() => null);
    return;
  }
  try {
    after(async () => {
      await dispatchEmailOutboxById(id).catch(() => null);
    });
  } catch {
    // Outside a request context, the authenticated scheduled worker will pick up the row.
  }
}
