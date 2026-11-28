import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCallbackClient } from "./auth-callback-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Signing in — Lead Nation Academy",
  robots: { index: false, follow: false },
};

function singleParam(val: string | string[] | undefined): string | undefined {
  if (typeof val === "string") return val;
  if (Array.isArray(val) && val.length > 0) return val[0];
  return undefined;
}

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = singleParam(params.code);
  const tokenHash = singleParam(params.token_hash);
  const type = singleParam(params.type);
  const next = singleParam(params.next);
  const errorParam = singleParam(params.error);

  // Server-side PKCE or token_hash flow: delegate immediately to /api/auth/callback
  // so SSR auth cookies are set in a Route Handler before redirecting.
  if (code || tokenHash) {
    const query = new URLSearchParams();
    if (code) query.set("code", code);
    if (tokenHash) query.set("token_hash", tokenHash);
    if (type) query.set("type", type);
    if (next) query.set("next", next);
    redirect(`/api/auth/callback?${query.toString()}`);
  }

  return <AuthCallbackClient initialError={errorParam} nextPath={next} />;
}
