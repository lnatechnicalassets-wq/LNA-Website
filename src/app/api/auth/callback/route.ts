import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { adminPaths, sanitizeAdminReturnPath } from "@/lib/admin-navigation";
import {
  createSupabaseServerClient,
  hasConfiguredSupabaseServerEnv,
} from "@/server/supabase/clients";

const ALLOWED_OTP_TYPES = new Set<EmailOtpType>([
  "invite",
  "recovery",
  "email",
  "magiclink",
  "signup",
  "email_change",
]);

function resolvePostAuthPath(typeParam: string | null, nextParam: string | null): string {
  if (typeParam === "invite" || typeParam === "recovery") {
    return sanitizeAdminReturnPath(nextParam, "/admin/set-password");
  }
  return sanitizeAdminReturnPath(nextParam, adminPaths.login);
}

function redirectNoStore(url: URL) {
  return NextResponse.redirect(url, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code")?.trim();
  const tokenHash = searchParams.get("token_hash")?.trim();
  const typeParam = searchParams.get("type")?.trim() ?? null;
  const nextParam = searchParams.get("next");

  const loginErrorUrl = new URL(`${adminPaths.login}?error=auth_callback`, request.url);

  if (!hasConfiguredSupabaseServerEnv()) {
    return redirectNoStore(new URL(adminPaths.login, request.url));
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return redirectNoStore(loginErrorUrl);
      }
      const target = resolvePostAuthPath(typeParam, nextParam);
      return redirectNoStore(new URL(target, request.url));
    }

    if (tokenHash && typeParam && ALLOWED_OTP_TYPES.has(typeParam as EmailOtpType)) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: typeParam as EmailOtpType,
      });
      if (error) {
        return redirectNoStore(loginErrorUrl);
      }
      const target = resolvePostAuthPath(typeParam, nextParam);
      return redirectNoStore(new URL(target, request.url));
    }
  } catch {
    return redirectNoStore(loginErrorUrl);
  }

  return redirectNoStore(loginErrorUrl);
}
