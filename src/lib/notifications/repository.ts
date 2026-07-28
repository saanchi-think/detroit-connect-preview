import { readFile } from "node:fs/promises";
import type { User } from "@supabase/supabase-js";
import { getOwnedConnectorProfileId } from "@/lib/connectors/repository";
import { getFriendsDashboard } from "@/lib/friends/repository";
import { getLocalDataPath } from "@/lib/local-data";
import { getDirectConversationSummaries } from "@/lib/messages/repository";
import {
  getNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/settings/repository";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type NotificationItem = {
  id: string;
  type: "friend" | "recommendation" | "comment" | "message";
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

type LocalForumStore = {
  posts: Array<{
    id: string;
    author_id: string | null;
    title: string;
  }>;
  comments: Array<{
    id: string;
    post_id: string;
    parent_comment_id: string | null;
    author_id: string | null;
    name: string;
    body: string;
    created_at: string;
  }>;
};

const LOCAL_DEMO_USER_ID = "local-dev-user";

function filterByPreferences(
  notifications: NotificationItem[],
  preferences: NotificationPreferences,
) {
  return notifications.filter((notification) => {
    if (notification.type === "friend") return preferences.connectionRequests;
    if (notification.type === "message") return preferences.directMessages;
    if (notification.type === "comment") return preferences.forumReplies;
    return preferences.recommendations;
  });
}

async function getLocalNotifications(user?: User | null): Promise<NotificationItem[]> {
  const [dashboard, conversations, preferences, ownedProfileId] = await Promise.all([
    getFriendsDashboard(user),
    getDirectConversationSummaries(user),
    getNotificationPreferences(user),
    getOwnedConnectorProfileId(user?.id ?? LOCAL_DEMO_USER_ID),
  ]);
  const notifications: NotificationItem[] = [];

  dashboard.incomingRequests.forEach((friend) => {
    notifications.push({
      id: `friend-request-${friend.id}`,
      type: "friend",
      title: `${friend.name} sent you a connection request`,
      detail: "Review the request in Network.",
      href: "/network",
      createdAt: friend.createdAt,
    });
  });

  dashboard.friends.forEach((friend) => {
    notifications.push({
      id: `friend-accepted-${friend.id}`,
      type: "friend",
      title: `${friend.name} is now in your network`,
      detail: "You can now exchange messages and recommendations.",
      href: "/network",
      createdAt: friend.updatedAt,
    });
  });

  dashboard.recommendations.forEach((recommendation) => {
    notifications.push({
      id: `recommendation-${recommendation.id}`,
      type: "recommendation",
      title: `${recommendation.recommenderName} recommended ${recommendation.connector.name}`,
      detail: recommendation.note,
      href: `/connectors/${recommendation.connector.id}`,
      createdAt: recommendation.createdAt,
    });
  });

  conversations
    .filter((conversation) => conversation.unreadCount > 0)
    .forEach((conversation) => {
      notifications.push({
        id: `message-${conversation.id}`,
        type: "message",
        title: `${conversation.recipientName} sent you ${conversation.unreadCount === 1 ? "a message" : `${conversation.unreadCount} messages`}`,
        detail: conversation.lastMessage,
        href: `/messages/${conversation.recipientId}`,
        createdAt: conversation.updatedAt,
      });
    });

  if (ownedProfileId) {
    try {
      const recommendations = JSON.parse(
        await readFile(getLocalDataPath("local-dev-recommendations.json"), "utf8"),
      ) as Array<{
        id: string;
        recommender_name: string;
        connector_profile_id: string;
        note: string;
        created_at: string;
      }>;
      recommendations
        .filter(
          (recommendation) =>
            recommendation.connector_profile_id === ownedProfileId &&
            recommendation.recommender_name !== "You",
        )
        .forEach((recommendation) => {
          notifications.push({
            id: `recommended-you-${recommendation.id}`,
            type: "recommendation",
            title: `${recommendation.recommender_name} recommended your profile`,
            detail: recommendation.note,
            href: `/connectors/${ownedProfileId}`,
            createdAt: recommendation.created_at,
          });
        });
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  try {
    const store = JSON.parse(
      await readFile(getLocalDataPath("local-dev-forum.json"), "utf8"),
    ) as LocalForumStore;
    const ownPostIds = new Set(
      store.posts.filter((post) => post.author_id === LOCAL_DEMO_USER_ID).map((post) => post.id),
    );
    const ownCommentIds = new Set(
      store.comments
        .filter((comment) => comment.author_id === LOCAL_DEMO_USER_ID)
        .map((comment) => comment.id),
    );
    const postTitles = new Map(store.posts.map((post) => [post.id, post.title]));

    store.comments
      .filter(
        (comment) =>
          comment.author_id !== LOCAL_DEMO_USER_ID &&
          (ownPostIds.has(comment.post_id) ||
            Boolean(comment.parent_comment_id && ownCommentIds.has(comment.parent_comment_id))),
      )
      .forEach((comment) => {
        notifications.push({
          id: `comment-${comment.id}`,
          type: "comment",
          title: `${comment.name} replied to you`,
          detail: `${postTitles.get(comment.post_id) ?? "Community post"}: ${comment.body}`,
          href: `/forum#comment-${comment.id}`,
          createdAt: comment.created_at,
        });
      });
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }

  return filterByPreferences(notifications, preferences)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 40);
}

export async function getNotifications(user?: User | null): Promise<NotificationItem[]> {
  if (!isSupabaseConfigured()) {
    return getLocalNotifications(user);
  }

  if (!user) {
    return [];
  }

  const supabase = await createClient();
  const [
    friendshipResult,
    recommendationResult,
    postResult,
    ownCommentResult,
    ownedProfileResult,
    conversations,
    preferences,
  ] = await Promise.all([
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
    supabase
      .from("forum_comments")
      .select("id")
      .eq("author_id", user.id)
      .limit(80),
    supabase
      .from("connector_profiles")
      .select("id")
      .eq("owner_id", user.id),
    getDirectConversationSummaries(user),
    getNotificationPreferences(user),
  ]);

  const firstError =
    friendshipResult.error ??
    recommendationResult.error ??
    postResult.error ??
    ownCommentResult.error ??
    ownedProfileResult.error;

  if (firstError) {
    throw new Error(`Could not load notifications: ${firstError.message}`);
  }

  const friendships = friendshipResult.data ?? [];
  const acceptedFriendIds = new Set(
    (friendshipResult.data ?? [])
      .filter((friendship) => friendship.status === "accepted")
      .map((friendship) =>
        friendship.requester_id === user.id
          ? friendship.addressee_id
          : friendship.requester_id,
      ),
  );
  const ownedProfileIds = new Set((ownedProfileResult.data ?? []).map((profile) => profile.id));
  const recommendations = (recommendationResult.data ?? []).filter(
    (recommendation) =>
      acceptedFriendIds.has(recommendation.recommender_id) ||
      ownedProfileIds.has(recommendation.connector_profile_id),
  );
  const posts = postResult.data ?? [];
  const postIds = posts.map((post) => post.id);
  const ownCommentIds = (ownCommentResult.data ?? []).map((comment) => comment.id);
  const [postCommentResult, threadedReplyResult] = await Promise.all([
    postIds.length
    ? await supabase
        .from("forum_comments")
        .select("id, post_id, parent_comment_id, author_id, body, created_at")
        .in("post_id", postIds)
        .neq("author_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30)
    : Promise.resolve({ data: [], error: null }),
    ownCommentIds.length
      ? await supabase
          .from("forum_comments")
          .select("id, post_id, parent_comment_id, author_id, body, created_at")
          .in("parent_comment_id", ownCommentIds)
          .neq("author_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (postCommentResult.error || threadedReplyResult.error) {
    throw new Error(
      `Could not load notifications: ${(postCommentResult.error ?? threadedReplyResult.error)!.message}`,
    );
  }

  const comments = Array.from(
    new Map(
      [...(postCommentResult.data ?? []), ...(threadedReplyResult.data ?? [])].map((comment) => [
        comment.id,
        comment,
      ]),
    ).values(),
  );
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
        title: `${friendName} sent you a connection request`,
        detail: "Review the request in Network.",
        href: "/network",
        createdAt: friendship.created_at,
      });
    }

    if (friendship.status === "accepted") {
      notifications.push({
        id: `friend-accepted-${friendId}`,
        type: "friend",
        title: `${friendName} is now in your network`,
        detail: "You can now exchange messages and recommendations.",
        href: "/network",
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

    const isRecommendationOfViewer = ownedProfileIds.has(recommendation.connector_profile_id);
    notifications.push({
      id: `recommendation-${recommendation.id}`,
      type: "recommendation",
      title: isRecommendationOfViewer
        ? `${recommenderName} recommended your profile`
        : `${recommenderName} recommended ${connectorName}`,
      detail: recommendation.note ?? "A new recommendation is available from your network.",
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
      title: `${commenterName} replied to you`,
      detail: `${postTitles.get(comment.post_id) ?? "Community post"}: ${comment.body}`,
      href: `/forum#post-${comment.post_id}`,
      createdAt: comment.created_at,
    });
  });

  conversations
    .filter((conversation) => conversation.unreadCount > 0)
    .forEach((conversation) => {
      notifications.push({
        id: `message-${conversation.id}`,
        type: "message",
        title: `${conversation.recipientName} sent you ${conversation.unreadCount === 1 ? "a message" : `${conversation.unreadCount} messages`}`,
        detail: conversation.lastMessage,
        href: `/messages/${conversation.recipientId}`,
        createdAt: conversation.updatedAt,
      });
    });

  return filterByPreferences(notifications, preferences)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 40);
}
