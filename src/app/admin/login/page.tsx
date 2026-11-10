import React from "react";
import { redirect } from "next/navigation";
import { getStaffSessionContext } from "@/server/auth/require-staff";
import { AdminLoginView, type AdminLoginStep } from "./admin-login-view";

export const dynamic = "force-dynamic";

function singleParam(val: string | string[] | undefined): string | undefined {
  if (typeof val === "string") return val;
  if (Array.isArray(val) && val.length > 0) return val[0];
  return undefined;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [resolvedParams, session] = await Promise.all([
    searchParams,
    getStaffSessionContext("enrollments:read"),
  ]);

  if (session.ok) {
    redirect("/admin/enrollments");
  }

  const queryError = singleParam(resolvedParams.error);

  let initialStep: AdminLoginStep = "credentials";
  let deniedMessage = "";

  if (session.reason === "not_configured") {
    initialStep = "not_configured";
  } else if (session.reason === "forbidden" || queryError === "forbidden") {
    initialStep = "denied";
    deniedMessage =
      "Your authenticated user is not listed as an active super_admin in public.profiles.";
  } else if (session.reason === "inactive") {
    initialStep = "denied";
    deniedMessage = "This staff account is currently suspended or archived.";
  } else if (session.reason === "mfa_required") {
    initialStep = "mfa";
  }

  return (
    <AdminLoginView
      initialStep={initialStep}
      initialEmail={session.ok ? "" : (session.email ?? "")}
      initialHasVerifiedTotp={session.ok ? false : Boolean(session.hasVerifiedTotpFactor)}
      deniedMessage={deniedMessage}
    />
  );
}

