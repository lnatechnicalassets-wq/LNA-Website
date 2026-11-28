"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { adminPaths, sanitizeAdminReturnPath } from "@/lib/admin-navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

export function AuthCallbackClient({
  initialError,
  nextPath,
}: {
  initialError?: string;
  nextPath?: string;
}) {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState(
    initialError ? "This invitation or sign-in link is invalid or has expired." : ""
  );

  useEffect(() => {
    if (initialError) return;

    let cancelled = false;

    async function handleFragmentCallback() {
      const rawHash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;

      if (!rawHash) {
        if (!cancelled) {
          setErrorMsg("No authentication token was found. Request a new invitation link.");
        }
        return;
      }

      const hashParams = new URLSearchParams(rawHash);
      const hashError = hashParams.get("error_description") || hashParams.get("error");
      if (hashError) {
        if (!cancelled) {
          setErrorMsg("This invitation or sign-in link is invalid or has expired.");
        }
        return;
      }

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");

      if (!accessToken || !refreshToken) {
        if (!cancelled) {
          setErrorMsg("Incomplete authentication token. Request a new invitation link.");
        }
        return;
      }

      try {
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        // Clear sensitive tokens from browser address bar immediately
        window.history.replaceState(null, "", window.location.pathname + window.location.search);

        if (error) {
          if (!cancelled) {
            setErrorMsg("Unable to verify this invitation link. It may have already been used.");
          }
          return;
        }

        const defaultTarget =
          type === "invite" || type === "recovery" ? "/admin/set-password" : adminPaths.login;
        const target = sanitizeAdminReturnPath(nextPath, defaultTarget);

        if (!cancelled) {
          router.replace(target);
          router.refresh();
        }
      } catch {
        if (!cancelled) {
          setErrorMsg("Authentication service is unavailable. Please try again.");
        }
      }
    }

    void handleFragmentCallback();
    return () => {
      cancelled = true;
    };
  }, [initialError, nextPath, router]);

  return (
    <div className="min-h-screen bg-[#F6FAFA] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <Card className="border-[#DCE6E8] shadow-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl text-[#172E35]">
              {errorMsg ? "Link Could Not Be Verified" : "Verifying Invitation"}
            </CardTitle>
            <CardDescription className="text-[#526E77]">
              {errorMsg
                ? "Your staff invitation or sign-in link could not be completed."
                : "Please wait while we verify your staff session."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {errorMsg ? (
              <div className="space-y-4">
                <div
                  role="alert"
                  className="rounded-lg bg-[#FEF2F2] border border-[#FECACA] p-3 text-sm text-[#991B1B] flex items-start gap-2.5"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{errorMsg}</span>
                </div>
                <Link
                  href={adminPaths.login}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#086477] px-4 text-sm font-medium text-white hover:bg-[#064E5D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#086477]"
                >
                  Go to Staff Login
                </Link>
              </div>
            ) : (
              <div
                role="status"
                aria-live="polite"
                className="flex flex-col items-center justify-center py-6 gap-3 text-sm text-[#526E77]"
              >
                <Loader2 className="h-7 w-7 animate-spin text-[#086477]" aria-hidden="true" />
                <span>Completing authentication…</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
