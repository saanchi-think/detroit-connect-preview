import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    process.env.DETROIT_CONNECT_DATA_MODE === "local"
  ) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  if (data.user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("account_status")
      .eq("id", data.user.id)
      .maybeSingle();
    const allowedWhileSuspended =
      request.nextUrl.pathname === "/account-suspended" ||
      request.nextUrl.pathname === "/login" ||
      request.nextUrl.pathname.startsWith("/auth/");
    const allowedWhileDeactivated =
      request.nextUrl.pathname === "/account-deactivated" ||
      request.nextUrl.pathname === "/login" ||
      request.nextUrl.pathname.startsWith("/auth/");

    if (profile?.account_status === "suspended" && !allowedWhileSuspended) {
      return NextResponse.redirect(new URL("/account-suspended", request.url));
    }
    if (profile?.account_status !== "suspended" && request.nextUrl.pathname === "/account-suspended") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (profile?.account_status === "deactivated" && !allowedWhileDeactivated) {
      return NextResponse.redirect(new URL("/account-deactivated", request.url));
    }
    if (profile?.account_status !== "deactivated" && request.nextUrl.pathname === "/account-deactivated") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
