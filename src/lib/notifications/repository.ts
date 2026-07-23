import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type NotificationItem = {
  id: string;
  type: "friend" | "recommendation" | "comment";
  title: string;
  detail: string;
  href: string;
  createdAt: string;
};

type MemberProfile = {
  id: string;
  display_name: string;
};

function fallbackName(id: string) {
  return id ? "Detroit Connect member" : "Community member";
}

export async function getNotifications(user?: User | null): Promise<NotificationItem[]> {
  if (!isSupabaseConfigured() || !user) {
    return [];
  }

  const supabase = await createClient();
  const [friendshipResult, recommendationResult, postResult] = await Promise.all([
    supabase
      .from("friendships")
      .select("requester_id, addressee_id, status, created_at, updated_at")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("profile_recommendations")
      .select("id, recommender_id, connector_profile_id, note, created_at")
      .neq("recommender_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("forum_posts")
      .select("id, title")
      .eq("author_id", user.id)
      .limit(40),
  ]);

  const firstError =
    friendshipResult.error ?? recommendationResult.error ?? postResult.error;

  if (firstError) {
    throw new Error(`Could not load notifications: ${firstError.message}`);
  }

  const friendships = friendshipResult.data ?? [];
  const recommendations = recommendationResult.data ?? [];
  const posts = postResult.data ?? [];
  const postIds = posts.map((post) => post.id);
  const commentResult = postIds.length
    ? await supabase
        .from("forum_comments")
        .select("id, post_id, author_id, body, created_at")
        .in("post_id", postIds)
        .neq("author_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [], error: null };

  if (commentResult.error) {
    throw new Error(`Could not load notifications: ${commentResult.error.message}`);
  }

  const comments = commentResult.data ?? [];
  const actorIds = new Set<string>();

  friendships.forEach((friendship) => {
    actorIds.add(
      friendship.requester_id === user.id
        ? friendship.addressee_id
        : friendship.requester_id,
    );
  });
  recommendations.forEach((recommendation) => actorIds.add(recommendation.recommender_id));
  comments.forEach((comment) => {
    if (comment.author_id) {
      actorIds.add(comment.author_id);
    }
  });

  const connectorIds = Array.from(
    new Set(recommendations.map((recommendation) => recommendation.connector_profile_id)),
  );
  const [memberResult, connectorResult] = await Promise.all([
    actorIds.size
      ? supabase
          .from("public_member_profiles")
          .select("id, display_name")
          .in("id", Array.from(actorIds))
      : Promise.resolve({ data: [], error: null }),
    connectorIds.length
      ? supabase
          .from("connector_profiles")
          .select("id, name")
          .in("id", connectorIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const relatedError = memberResult.error ?? connectorResult.error;
  if (relatedError) {
    throw new Error(`Could not load notification details: ${relatedError.message}`);
  }

  const memberNames = new Map(
    ((memberResult.data ?? []) as MemberProfile[]).map((member) => [
      member.id,
      member.display_name,
    ]),
  );
  const connectorNames = new Map(
    (connectorResult.data ?? []).map((connector) => [connector.id, connector.name]),
  );
  const postTitles = new Map(posts.map((post) => [post.id, post.title]));
  const notifications: NotificationItem[] = [];

  friendships.forEach((friendship) => {
    const friendId =
      friendship.requester_id === user.id
        ? friendship.addressee_id
        : friendship.requester_id;
    const friendName = memberNames.get(friendId) ?? fallbackName(friendId);

    if (friendship.status === "pending" && friendship.addressee_id === user.id) {
      notifications.push({
        id: `friend-request-${friendship.requester_id}`,
        type: "friend",
        title: `${friendName} sent you a friend request`,
        detail: "Review the request in Friends.",
        href: "/friends",
        createdAt: friendship.created_at,
      });
    }

    if (friendship.status === "accepted") {
      notifications.push({
        id: `friend-accepted-${friendId}`,
        type: "friend",
        title: `${friendName} is now in your friend circle`,
        detail: "You can now see recommendations shared across your circle.",
        href: "/friends",
        createdAt: friendship.updated_at,
      });
    }
  });

  recommendations.forEach((recommendation) => {
    const recommenderName =
      memberNames.get(recommendation.recommender_id) ??
      fallbackName(recommendation.recommender_id);
    const connectorName =
      connectorNames.get(recommendation.connector_profile_id) ?? "a connector";

    notifications.push({
      id: `recommendation-${recommendation.id}`,
      type: "recommendation",
      title: `${recommenderName} recommended ${connectorName}`,
      detail: recommendation.note ?? "A new recommendation is available from your circle.",
      href: `/connectors/${recommendation.connector_profile_id}`,
      createdAt: recommendation.created_at,
    });
  });

  comments.forEach((comment) => {
    const commenterName = comment.author_id
      ? (memberNames.get(comment.author_id) ?? fallbackName(comment.author_id))
      : "A community member";

    notifications.push({
      id: `comment-${comment.id}`,
      type: "comment",
      title: `${commenterName} replied to your post`,
      detail: `${postTitles.get(comment.post_id) ?? "Community post"}: ${comment.body}`,
      href: `/forum#post-${comment.post_id}`,
      createdAt: comment.created_at,
    });
  });

  return notifications
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 40);
}
