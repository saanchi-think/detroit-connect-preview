"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/user";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const passwordSchema = z
  .object({
    password: z.string().min(10, "Use at least 10 characters."),
    confirmation: z.string(),
  })
  .refine((value) => value.password === value.confirmation, {
    message: "The passwords do not match.",
  });

function settingsError(message: string): never {
  redirect(`/settings?accountError=${encodeURIComponent(message)}#account-security`);
}

export async function updateAccountEmailAction(formData: FormData) {
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim());
  if (!email.success) {
    settingsError("Enter a valid email address.");
  }

  if (!isSupabaseConfigured()) {
    redirect("/settings?security=email-demo#account-security");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/settings");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email: email.data });
  if (error) {
    settingsError(error.message);
  }

  redirect("/settings?security=email-sent#account-security");
}

export async function updateAccountPasswordAction(formData: FormData) {
  const password = passwordSchema.safeParse({
    password: String(formData.get("password") ?? ""),
    confirmation: String(formData.get("confirmation") ?? ""),
  });
  if (!password.success) {
    settingsError(password.error.issues[0]?.message ?? "Check the new password.");
  }

  if (!isSupabaseConfigured()) {
    redirect("/settings?security=password-demo#account-security");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/settings");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data.password });
  if (error) {
    settingsError(error.message);
  }

  redirect("/settings?security=password#account-security");
}

export async function updateRecoveredPasswordAction(formData: FormData) {
  const password = passwordSchema.safeParse({
    password: String(formData.get("password") ?? ""),
    confirmation: String(formData.get("confirmation") ?? ""),
  });
  if (!password.success) {
    redirect(`/account/reset-password?error=${encodeURIComponent(password.error.issues[0]?.message ?? "Check the new password.")}`);
  }

  if (!isSupabaseConfigured()) {
    redirect("/login?message=Password+updated+in+the+local+preview.");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/forgot-password?error=Your+reset+link+has+expired.+Request+a+new+one.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data.password });
  if (error) {
    redirect(`/account/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?message=Password+updated.+You+can+sign+in+now.");
}

export async function deactivateAccountAction(formData: FormData) {
  if (String(formData.get("confirmation") ?? "").trim() !== "DEACTIVATE") {
    redirect("/settings?accountError=Type+DEACTIVATE+to+confirm.#account-lifecycle");
  }
  if (!isSupabaseConfigured()) {
    redirect("/settings?accountError=Account+deactivation+requires+a+connected+account.#account-lifecycle");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/settings");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_own_account_status", { next_status: "deactivated" });
  if (error) {
    redirect(`/settings?accountError=${encodeURIComponent(error.message)}#account-lifecycle`);
  }

  await supabase.auth.signOut();
  redirect("/account-deactivated?changed=1");
}

export async function reactivateAccountAction() {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/account-deactivated");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_own_account_status", { next_status: "active" });
  if (error) {
    redirect(`/account-deactivated?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/settings?account=reactivated");
}

export async function deleteAccountAction(formData: FormData) {
  if (String(formData.get("confirmation") ?? "").trim() !== "DELETE") {
    redirect("/settings?accountError=Type+DELETE+to+confirm.#account-lifecycle");
  }
  if (!isSupabaseConfigured()) {
    redirect("/settings?accountError=Account+deletion+requires+a+connected+account.#account-lifecycle");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/settings");
  }
  if (String(formData.get("email") ?? "").trim().toLowerCase() !== user.email?.toLowerCase()) {
    redirect("/settings?accountError=Enter+your+account+email+to+confirm+deletion.#account-lifecycle");
  }

  try {
    const admin = createAdminClient();
    const { error: archiveError } = await admin
      .from("connector_profiles")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("owner_id", user.id);
    if (archiveError) {
      throw archiveError;
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      throw deleteError;
    }
  } catch (error) {
    redirect(`/settings?accountError=${encodeURIComponent(error instanceof Error ? error.message : "Could not delete the account.")}#account-lifecycle`);
  }

  redirect("/login?message=Your+Detroit+Connect+account+was+deleted.");
}
