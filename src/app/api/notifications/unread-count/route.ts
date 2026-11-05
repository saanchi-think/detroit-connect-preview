import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { getNotifications } from "@/lib/notifications/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (isSupabaseConfigured() && !user) {
    return NextResponse.json({ count: 0 });
  }

  try {
    const notifications = await getNotifications(user);
    return NextResponse.json({
      count: notifications
        .filter((notification) => !notification.isRead)
        .reduce((total, notification) => total + notification.groupCount, 0),
    });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
