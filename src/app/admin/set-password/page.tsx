import React from "react";
import { redirect } from "next/navigation";
import { adminPaths } from "@/lib/admin-navigation";
import {
  createSupabaseServerClient,
  hasConfiguredSupabaseServerEnv,
} from "@/server/supabase/clients";
import { SetPasswordView } from "./set-password-view";

export const dynamic = "force-dynamic";

export default async function AdminSetPasswordPage() {
  if (!hasConfiguredSupabaseServerEnv()) {
    redirect(adminPaths.login);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    redirect(`${adminPaths.login}?error=auth_callback`);
  }

  return <SetPasswordView email={user.email ?? ""} />;
}
