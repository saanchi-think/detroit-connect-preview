import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { searchFriendCandidates } from "@/lib/friends/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (isSupabaseConfigured() && !user) {
    return NextResponse.json({ candidates: [] }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q") ?? "";
  const candidates = await searchFriendCandidates(query, user);
  return NextResponse.json({ candidates });
}
