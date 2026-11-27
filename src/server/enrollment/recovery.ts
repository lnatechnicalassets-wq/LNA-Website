import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Resend } from "resend";
import { recoveryResultSchema } from "@/lib/enrollment/recovery";
import { parseCurrentServerEnv } from "@/server/env";
import { hmacDigestForKey } from "@/server/security/hmac";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

export function hashRecoveryToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function sendApplicationRecovery(email: string, reference: string): Promise<void> {
  const env = parseCurrentServerEnv();
  // Never expose raw recovery tokens through logs or simulated production delivery.
  if (env.EMAIL_DISPATCH_MODE !== "live") return;
  const origin = new URL(env.APP_URL);
  if (env.NODE_ENV === "production" && origin.protocol !== "https:") return;
  const token = randomBytes(32).toString("hex");
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("issue_application_recovery", {
    p_email: email,
    p_email_key: hmacDigestForKey(`application-recovery:${email}`),
    p_reference: reference || null,
    p_token_hash: hashRecoveryToken(token),
  });
  if (error || data !== true) return;
  const url = new URL("/status", origin);
  // Fragments are not transmitted in HTTP requests or normal server access logs.
  url.hash = `recovery=${token}`;
  const { error: sendError } = await new Resend(env.RESEND_API_KEY).emails.send({
    from: `Lead Nation Academy Admissions <${env.RESEND_FROM_EMAIL}>`,
    to: [email],
    subject: "Find your Lead Nation Academy application",
    text: `Use this one-time link within 20 minutes to check your application status:\n\n${url.toString()}\n\nIf you did not request this link, ignore this email. Never share it with anyone.`,
  });
  if (sendError) console.error("[application-recovery] delivery rejected");
}

export async function redeemApplicationRecovery(token: string) {
  const { data, error } = await createSupabaseAdminClient().rpc("redeem_application_recovery", {
    p_token_hash: hashRecoveryToken(token),
  });
  if (error) throw new Error("Application recovery unavailable");
  if (data === null) return null;
  return recoveryResultSchema.parse(data).applications;
}
