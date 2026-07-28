import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { getUnreadDirectMessageCount } from "@/lib/messages/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (isSupabaseConfigured() && !user) {
    return NextResponse.json({ count: 0 });
  }

  try {
    return NextResponse.json({ count: await getUnreadDirectMessageCount(user) });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
