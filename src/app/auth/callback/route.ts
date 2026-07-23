import { NextResponse } from "next/server";
import { ensureUserProfile } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next") || "/connectors";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/connectors";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=Missing auth code.", requestUrl.origin));
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error?.message ?? "Could not finish sign in.")}`, requestUrl.origin),
      );
    }

    await ensureUserProfile(supabase, data.user);
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=Supabase is not configured yet. Add .env.local first.", requestUrl.origin),
    );
  }
}
