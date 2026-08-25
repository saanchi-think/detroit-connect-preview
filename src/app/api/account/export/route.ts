import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await getCurrentUser();
  const exportedAt = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    return new NextResponse(
      JSON.stringify({ exportedAt, mode: "local-preview", note: "No personal account is connected in local preview mode." }, null, 2),
      {
        headers: {
          "Cache-Control": "no-store",
          "Content-Disposition": `attachment; filename="detroit-connect-my-data-${exportedAt.slice(0, 10)}.json"`,
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );
  }

  if (!user) {
    return NextResponse.json({ error: "Sign in before downloading your data." }, { status: 401 });
  }

  const supabase = await createClient();
  const [account, profiles, favorites, places, savedPosts, friendships, recommendations, posts, comments, settings, safety, notifications, conversations] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("connector_profiles").select("*").eq("owner_id", user.id),
    supabase.from("favorite_profiles").select("*").eq("user_id", user.id),
    supabase.from("favorite_places").select("*").eq("user_id", user.id),
    supabase.from("forum_saved_posts").select("*").eq("user_id", user.id),
    supabase.from("friendships").select("*").or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
    supabase.from("profile_recommendations").select("*").eq("recommender_id", user.id),
    supabase.from("forum_posts").select("*").eq("author_id", user.id),
    supabase.from("forum_comments").select("*").eq("author_id", user.id),
    supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_safety_controls").select("*").eq("actor_id", user.id),
    supabase.from("notification_events").select("*").eq("recipient_id", user.id),
    supabase.from("direct_conversations").select("*").or(`member_one_id.eq.${user.id},member_two_id.eq.${user.id}`),
  ]);

  const results = [account, profiles, favorites, places, savedPosts, friendships, recommendations, posts, comments, settings, safety, notifications, conversations];
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) {
    return NextResponse.json({ error: `Could not prepare your export: ${firstError.message}` }, { status: 500 });
  }

  const conversationIds = (conversations.data ?? []).map((conversation) => conversation.id);
  const messages = conversationIds.length > 0
    ? await supabase.from("direct_messages").select("*").in("conversation_id", conversationIds)
    : { data: [], error: null };
  if (messages.error) {
    return NextResponse.json({ error: `Could not prepare your messages: ${messages.error.message}` }, { status: 500 });
  }

  const payload = {
    exportedAt,
    account: account.data,
    profile: profiles.data ?? [],
    saved: {
      profiles: favorites.data ?? [],
      places: places.data ?? [],
      forumPosts: savedPosts.data ?? [],
    },
    network: friendships.data ?? [],
    recommendations: recommendations.data ?? [],
    community: { posts: posts.data ?? [], comments: comments.data ?? [] },
    messages: { conversations: conversations.data ?? [], messages: messages.data ?? [] },
    preferences: settings.data,
    safetyControls: safety.data ?? [],
    notifications: notifications.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="detroit-connect-my-data-${exportedAt.slice(0, 10)}.json"`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
