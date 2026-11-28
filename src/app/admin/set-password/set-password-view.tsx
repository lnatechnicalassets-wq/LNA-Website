"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import { adminPaths } from "@/lib/admin-navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui";

export function SetPasswordView({ email }: { email: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [saved, setSaved] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg("");

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrorMsg(error.message || "Unable to update your password. Please try again.");
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setSaved(true);

      router.replace(adminPaths.login);
      router.refresh();
    } catch {
      setErrorMsg("Unable to reach authentication service. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6FAFA] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#086477] text-white mb-3 shadow-sm">
            <KeyRound className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-[#172E35] tracking-tight">Set Your Password</h1>
          <p className="text-sm text-[#526E77] mt-1">
            Create a password to activate your Lead Nation Academy staff account.
          </p>
        </div>

        <Card className="border-[#DCE6E8] shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-[#172E35]">Staff Account Setup</CardTitle>
            <CardDescription className="text-[#526E77]">
              {email
                ? `Setting password for ${email}. Next, you will configure 2-Step Verification.`
                : "Set a strong password. Next, you will configure 2-Step Verification."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {saved ? (
              <div
                role="status"
                className="rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] p-4 text-sm text-[#065F46] flex items-start gap-2.5"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Password saved. Redirecting to 2-Step Verification…</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {errorMsg && (
                  <div
                    role="alert"
                    className="rounded-lg bg-[#FEF2F2] border border-[#FECACA] p-3 text-sm text-[#991B1B] flex items-start gap-2.5"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <Input
                  id="new-password"
                  type="password"
                  label="New Password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  disabled={isBusy}
                />

                <Input
                  id="confirm-password"
                  type="password"
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  disabled={isBusy}
                />

                <Button type="submit" className="w-full min-h-11" isLoading={isBusy}>
                  Save Password &amp; Continue
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
