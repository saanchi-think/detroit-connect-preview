import { NextResponse } from "next/server";
import { ensureUserProfile } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const providerError = requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error");
  const requestedNext = requestUrl.searchParams.get("next") || "/connectors";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/connectors";

  if (providerError) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(providerError)}`, requestUrl.origin));
  }

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
  } catch (error) {
    console.error("[auth/callback] Could not complete sign in", error);
    return NextResponse.redirect(
      new URL(
        "/login?error=We could not finish creating your account. Please try signing in again.",
        requestUrl.origin,
      ),
    );
  }
}
