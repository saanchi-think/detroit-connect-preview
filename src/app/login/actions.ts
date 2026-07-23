"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ensureUserProfile } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

const authSchema = z.object({
  fullName: z.string().trim().max(80).optional(),
  email: z.email(),
  password: z.string().min(8),
  next: z.string().optional(),
});

function getAuthFields(formData: FormData) {
  return authSchema.safeParse({
    fullName: String(formData.get("fullName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    next: String(formData.get("next") ?? "/connectors"),
  });
}

function safeNextPath(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/connectors";
  }

  return value;
}

function loginRedirect(params: Record<string, string>): never {
  const search = new URLSearchParams(params);
  redirect(`/login?${search.toString()}`);
}

function getAuthOrigin(requestOrigin: string | null) {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const origin = configuredSiteUrl || requestOrigin || "http://localhost:5200";

  return origin.replace(/\/$/, "");
}

async function getSupabaseForAuth() {
  try {
    return await createClient();
  } catch {
    return loginRedirect({
      error: "Supabase is not configured yet. Add the project URL and anon key to .env.local.",
    });
  }
}

export async function signInWithGoogleAction(formData: FormData) {
  const next = safeNextPath(String(formData.get("next") ?? "/connectors"));
  const headerStore = await headers();
  const origin = getAuthOrigin(headerStore.get("origin"));
  const supabase = await getSupabaseForAuth();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    loginRedirect({
      error: error?.message ?? "Could not start Google sign in.",
      next,
    });
  }

  redirect(data.url);
}

export async function signInAction(formData: FormData) {
  const parsed = getAuthFields(formData);

  if (!parsed.success) {
    loginRedirect({ error: "Enter an email and a password with at least 8 characters." });
  }

  const supabase = await getSupabaseForAuth();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    loginRedirect({ error: error?.message ?? "Could not sign in." });
  }

  await ensureUserProfile(supabase, data.user);
  redirect(safeNextPath(parsed.data.next));
}

export async function signUpAction(formData: FormData) {
  const parsed = getAuthFields(formData);

  if (!parsed.success) {
    loginRedirect({ error: "Enter an email and a password with at least 8 characters." });
  }

  const headerStore = await headers();
  const origin = getAuthOrigin(headerStore.get("origin"));
  const next = safeNextPath(parsed.data.next);
  const supabase = await getSupabaseForAuth();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      data: parsed.data.fullName ? { full_name: parsed.data.fullName } : undefined,
    },
  });

  if (error) {
    loginRedirect({ error: error.message });
  }

  if (data.user && data.session) {
    await ensureUserProfile(supabase, data.user);
    redirect(next);
  }

  loginRedirect({ message: "Check your email to finish creating your account." });
}
