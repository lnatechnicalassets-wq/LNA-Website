"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, ShieldCheck, KeyRound, AlertCircle, Check, Copy, LogOut } from "lucide-react";
import { AppError } from "@/lib/errors";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui";

export type AdminLoginStep = "not_configured" | "credentials" | "mfa" | "denied";

export interface BrowserFactorLike {
  id: string;
  factor_type?: string;
  status: string;
}

export interface BrowserSupabaseAuthClientLike {
  auth: {
    signInWithPassword(credentials: { email: string; password: string }): Promise<{
      data: { user?: { id: string; email?: string | null } | null; session?: unknown };
      error: { message: string } | null;
    }>;
    signOut(): Promise<{ error: { message: string } | null }>;
    mfa: {
      listFactors(): Promise<{
        data: {
          all?: BrowserFactorLike[];
          totp?: BrowserFactorLike[];
        } | null;
        error: { message: string } | null;
      }>;
      getAuthenticatorAssuranceLevel(): Promise<{
        data: { currentLevel: string | null; nextLevel: string | null } | null;
        error: { message: string } | null;
      }>;
      enroll(params: { factorType: "totp"; friendlyName?: string }): Promise<{
        data: {
          id: string;
          type: "totp";
          totp: {
            qr_code: string;
            secret: string;
            uri: string;
          };
        } | null;
        error: { message: string } | null;
      }>;
      unenroll(params: { factorId: string }): Promise<{
        data: { id: string } | null;
        error: { message: string } | null;
      }>;
      challenge(params: { factorId: string }): Promise<{
        data: { id: string } | null;
        error: { message: string } | null;
      }>;
      verify(params: { factorId: string; challengeId: string; code: string }): Promise<{
        data: unknown;
        error: { message: string } | null;
      }>;
    };
  };
}

export interface AdminLoginViewProps {
  initialStep: AdminLoginStep;
  initialEmail?: string;
  initialHasVerifiedTotp?: boolean;
  deniedMessage?: string;
  supabaseFactory?: () => BrowserSupabaseAuthClientLike;
  onNavigateSuccess?: () => void;
}

function normalizeTotpQrSrc(qrCode: string): string {
  const trimmed = qrCode.trim();
  if (trimmed.startsWith("data:")) {
    return trimmed;
  }
  return `data:image/svg+xml;utf-8,${encodeURIComponent(trimmed)}`;
}

export function AdminLoginView({
  initialStep,
  initialEmail = "",
  initialHasVerifiedTotp = false,
  deniedMessage = "",
  supabaseFactory,
  onNavigateSuccess,
}: AdminLoginViewProps) {
  const router = useRouter();
  const [step, setStep] = useState<AdminLoginStep>(initialStep);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [activeFactorId, setActiveFactorId] = useState<string>("");
  const [hasVerifiedFactor, setHasVerifiedFactor] = useState(initialHasVerifiedTotp);
  const [qrCodeSrc, setQrCodeSrc] = useState<string>("");
  const [totpSecret, setTotpSecret] = useState<string>("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [errorMsg, setErrorMsg] = useState(deniedMessage);
  const [isBusy, setIsBusy] = useState(false);
  const [isInitializingMfa, setIsInitializingMfa] = useState(false);
  const mfaInitStartedRef = useRef(false);

  const getClient = (): BrowserSupabaseAuthClientLike => {
    if (supabaseFactory) {
      return supabaseFactory();
    }
    return createSupabaseBrowserClient() as unknown as BrowserSupabaseAuthClientLike;
  };

  const completeNavigation = () => {
    if (onNavigateSuccess) {
      onNavigateSuccess();
      return;
    }
    router.push("/admin/enrollments");
    router.refresh();
  };

  const prepareMfaStep = async (client: BrowserSupabaseAuthClientLike) => {
    setIsInitializingMfa(true);
    setErrorMsg("");
    try {
      const aalRes = await client.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalRes.data?.currentLevel === "aal2") {
        completeNavigation();
        return;
      }

      const factorsRes = await client.auth.mfa.listFactors();
      if (factorsRes.error || !factorsRes.data) {
        setErrorMsg("Unable to inspect authenticator factors. Please sign in again.");
        setStep("credentials");
        return;
      }

      const allFactors = factorsRes.data.all ?? factorsRes.data.totp ?? [];
      const verifiedTotp =
        (factorsRes.data.totp ?? []).find((f) => f.status === "verified") ??
        allFactors.find(
          (f) => (!f.factor_type || f.factor_type === "totp") && f.status === "verified"
        );

      if (verifiedTotp) {
        setHasVerifiedFactor(true);
        setActiveFactorId(verifiedTotp.id);
        setQrCodeSrc("");
        setTotpSecret("");
        setStep("mfa");
        return;
      }

      const staleUnverified = allFactors.filter(
        (f) => (!f.factor_type || f.factor_type === "totp") && f.status !== "verified"
      );
      for (const stale of staleUnverified) {
        await client.auth.mfa.unenroll({ factorId: stale.id });
      }

      const enrollRes = await client.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "LNA Superadmin Authenticator",
      });

      if (enrollRes.error || !enrollRes.data) {
        setErrorMsg(
          enrollRes.error?.message ||
            "Unable to prepare authenticator enrollment. Please try again."
        );
        setStep("mfa");
        return;
      }

      setHasVerifiedFactor(false);
      setActiveFactorId(enrollRes.data.id);
      setQrCodeSrc(normalizeTotpQrSrc(enrollRes.data.totp.qr_code));
      setTotpSecret(enrollRes.data.totp.secret);
      setStep("mfa");
    } finally {
      setIsInitializingMfa(false);
    }
  };

  useEffect(() => {
    if (initialStep === "mfa" && !mfaInitStartedRef.current) {
      mfaInitStartedRef.current = true;
      try {
        void prepareMfaStep(getClient());
      } catch (err) {
        if (err instanceof AppError && err.code === "SUPABASE_NOT_CONFIGURED") {
          setErrorMsg(err.message);
        } else {
          setErrorMsg("Unable to initialize authentication client.");
        }
      }
    }
  }, [initialStep]);

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg("Please enter your staff email and password.");
      return;
    }

    setIsBusy(true);
    try {
      const client = getClient();
      const { error } = await client.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        setErrorMsg("Invalid staff credentials or sign-in could not be completed.");
        return;
      }

      setPassword("");
      await prepareMfaStep(client);
    } catch (err) {
      if (err instanceof AppError && err.code === "SUPABASE_NOT_CONFIGURED") {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Unable to reach authentication service. Please try again.");
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleMfaSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg("");

    const cleanCode = totpCode.replace(/\s+/g, "").trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setErrorMsg("Enter the 6-digit code from your authenticator app.");
      return;
    }

    if (!activeFactorId) {
      try {
        await prepareMfaStep(getClient());
      } catch (err) {
        if (err instanceof AppError && err.code === "SUPABASE_NOT_CONFIGURED") {
          setErrorMsg(err.message);
        } else {
          setErrorMsg("Unable to initialize authentication client.");
        }
      }
      return;
    }

    setIsBusy(true);
    try {
      const client = getClient();
      const chalRes = await client.auth.mfa.challenge({ factorId: activeFactorId });
      if (chalRes.error || !chalRes.data?.id) {
        setErrorMsg("Unable to initiate authenticator verification challenge.");
        return;
      }

      const verifyRes = await client.auth.mfa.verify({
        factorId: activeFactorId,
        challengeId: chalRes.data.id,
        code: cleanCode,
      });

      if (verifyRes.error) {
        setErrorMsg(
          "Incorrect or expired verification code. Check your authenticator clock and retry."
        );
        return;
      }

      setTotpCode("");
      completeNavigation();
    } catch (err) {
      if (err instanceof AppError && err.code === "SUPABASE_NOT_CONFIGURED") {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Verification failed due to a network issue. Please try again.");
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleSignOut = async () => {
    setIsBusy(true);
    setErrorMsg("");
    try {
      const client = getClient();
      await client.auth.signOut();
      await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
      setTotpCode("");
      setQrCodeSrc("");
      setTotpSecret("");
      setActiveFactorId("");
      mfaInitStartedRef.current = false;
      setStep("credentials");
    } finally {
      setIsBusy(false);
    }
  };

  const handleCopySecret = async () => {
    if (!totpSecret) return;
    try {
      await navigator.clipboard?.writeText(totpSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      setCopiedSecret(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-800 text-text-inverse shadow-xs">
            <ShieldCheck className="w-6 h-6" aria-hidden="true" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-800">
            LEAD NATION ACADEMY
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-900 tracking-tight">
            Staff Portal Sign In
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary">
            Provisioned superadmin access only. Authenticator verification (AAL2) is mandatory.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">
                {step === "mfa"
                  ? hasVerifiedFactor
                    ? "Authenticator Verification"
                    : "Enroll Authenticator App"
                  : step === "denied"
                    ? "Access Restricted"
                    : step === "not_configured"
                      ? "Portal Unavailable"
                      : "Credentials"}
              </CardTitle>
              <Badge variant={step === "mfa" ? "warning" : "primary"} size="sm">
                {step === "mfa" ? "Step 2: TOTP AAL2" : "Staff Only"}
              </Badge>
            </div>
            <CardDescription>
              {step === "mfa"
                ? hasVerifiedFactor
                  ? `Enter the 6-digit code from your authenticator app${email ? ` for ${email}` : ""}.`
                  : "Scan the QR code once in Google Authenticator, 1Password, or Bitwarden, then confirm with a 6-digit code."
                : step === "denied"
                  ? "Only active super_admin accounts verified in Supabase profiles can open enrollment records."
                  : step === "not_configured"
                    ? "Supabase Auth keys are not configured for this environment."
                    : "Sign in using your manually provisioned superadmin email and password."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {errorMsg && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-status-danger-bg border border-status-danger-border text-xs sm:text-sm text-status-danger-text flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            {step === "not_configured" && (
              <div className="p-4 rounded-xl bg-status-warning-bg border border-status-warning-border text-xs sm:text-sm text-status-warning-text">
                Configure <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
                <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>, and{" "}
                <code>SUPABASE_SECRET_KEY</code> before signing in.
              </div>
            )}

            {step === "denied" && (
              <div className="space-y-4">
                <p className="text-xs sm:text-sm text-text-secondary">
                  If you signed in with the wrong user or before your <code>public.profiles</code>{" "}
                  superadmin row was provisioned, sign out and retry cleanly.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  isLoading={isBusy}
                  onClick={handleSignOut}
                  className="w-full"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  <span>Sign out & switch account</span>
                </Button>
              </div>
            )}

            {step === "credentials" && (
              <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
                <Input
                  id="staff-email"
                  type="email"
                  label="Staff email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@lnabd.org"
                  className="min-h-[44px]"
                />

                <Input
                  id="staff-password"
                  type="password"
                  label="Password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="min-h-[44px]"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isBusy}
                  className="w-full"
                >
                  <Lock className="w-4 h-4" aria-hidden="true" />
                  <span>Sign in cleanly</span>
                </Button>
              </form>
            )}

            {step === "mfa" && (
              <form onSubmit={handleMfaSubmit} className="space-y-5" noValidate>
                {isInitializingMfa && (
                  <p className="text-xs sm:text-sm text-text-secondary">
                    Checking authenticator enrollment state...
                  </p>
                )}

                {!hasVerifiedFactor && qrCodeSrc && (
                  <div className="p-4 rounded-xl bg-surface-subtle border border-border-default space-y-3 text-center">
                    <p className="text-xs font-semibold text-primary-900">
                      First-time Authenticator Setup Required
                    </p>
                    <img
                      src={qrCodeSrc}
                      alt="Authenticator app TOTP setup QR code"
                      className="w-44 h-44 mx-auto rounded-lg border border-border-subtle bg-surface-card p-2"
                    />
                    {totpSecret && (
                      <div className="space-y-1.5 text-left">
                        <span className="text-[11px] font-medium text-text-secondary block">
                          Manual setup key:
                        </span>
                        <div className="flex items-center justify-between gap-2 bg-surface-card border border-border-subtle rounded-lg px-3 py-2">
                          <code className="text-xs font-mono text-primary-900 break-all">
                            {totpSecret}
                          </code>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleCopySecret}
                            aria-label={copiedSecret ? "Copied setup key" : "Copy setup key"}
                            className="shrink-0 min-h-[36px]"
                          >
                            {copiedSecret ? (
                              <Check className="w-3.5 h-3.5 text-status-success-text" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <Input
                  id="staff-totp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete="one-time-code"
                  label="6-digit authenticator code"
                  required
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  helperText="Open your authenticator app and enter the current 6-digit code."
                  className="min-h-[44px] font-mono tracking-widest text-base"
                />

                <div className="flex flex-col gap-2.5">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isBusy || isInitializingMfa}
                    className="w-full"
                  >
                    <KeyRound className="w-4 h-4" aria-hidden="true" />
                    <span>Verify & open enrollments</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    disabled={isBusy}
                    onClick={handleSignOut}
                    className="w-full min-h-[44px]"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    <span>Cancel and sign out</span>
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-xs text-text-secondary space-y-1">
          <p>Public enrollment and self-registration are disabled on staff portals.</p>
          <p>
            <Link
              href="/"
              className="font-semibold text-primary-800 hover:underline focus-visible:outline-2 focus-visible:outline-primary-600 rounded"
            >
              ← Return to Lead Nation Academy homepage
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
