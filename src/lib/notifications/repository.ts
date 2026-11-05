import { readFile } from "node:fs/promises";
import type { User } from "@supabase/supabase-js";
import { getOwnedConnectorProfileId } from "@/lib/connectors/repository";
import { getFriendsDashboard } from "@/lib/friends/repository";
import { getLocalDataPath } from "@/lib/local-data";
import { getDirectConversationSummaries } from "@/lib/messages/repository";
import {
  getLocalNotificationReadState,
  setLocalNotificationsRead,
} from "@/lib/notifications/read-state";
import {
  getNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/settings/repository";
import { getSuppressedUserIds } from "@/lib/safety/repository";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type NotificationItem = {
  eventIds: string[];
  groupCount: number;
  groupKey?: string;
  id: string;
  type: "friend" | "recommendation" | "comment" | "mention" | "message";
  title: string;
  detail: string;
  href: string;
  createdAt: string;
  isRead: boolean;
  postId?: string;
};

type NotificationCandidate = Omit<
  NotificationItem,
  "eventIds" | "groupCount" | "isRead"
> & {
  eventIds?: string[];
  groupKey?: string;
  isRead?: boolean;
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
  subscriptions?: Array<{
    post_id: string;
    user_id: string;
    status: "following" | "muted";
  }>;
  mentions?: Array<{
    id: string;
    actor_id: string;
    actor_name: string;
    mentioned_user_id: string;
    mentioned_name: string;
    profile_href: string;
    post_id: string;
    comment_id: string | null;
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
    if (notification.type === "comment" || notification.type === "mention") {
      return preferences.forumReplies;
    }
    return preferences.recommendations;
  });
}

function prepareNotifications(
  notifications: NotificationCandidate[],
  preferences: NotificationPreferences,
  readOverrides?: { readIds: string[]; unreadIds: string[] },
) {
  const readAt = preferences.notificationsReadAt
    ? new Date(preferences.notificationsReadAt).getTime()
    : Number.NaN;
  const readIds = new Set(readOverrides?.readIds ?? []);
  const unreadIds = new Set(readOverrides?.unreadIds ?? []);

  const prepared = filterByPreferences(
    notifications.map((notification) => ({
      ...notification,
      eventIds: notification.eventIds ?? [],
      groupCount: 1,
      isRead: unreadIds.has(notification.id)
        ? false
        : readIds.has(notification.id)
          ? true
          : notification.isRead ?? (
            Number.isFinite(readAt) &&
            new Date(notification.createdAt).getTime() <= readAt
          ),
    })),
    preferences,
  )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  const groups = new Map<string, NotificationItem[]>();
  prepared.forEach((notification) => {
    const key = `${notification.type}:${notification.groupKey ?? notification.id}`;
    groups.set(key, [...(groups.get(key) ?? []), notification]);
  });

  return Array.from(groups.values())
    .map((items) => {
      const first = items[0];
      if (items.length === 1) return first;

      const actorNames = Array.from(new Set(items.map((item) =>
        item.title.replace(/ (accepted|commented|mentioned|recommended|replied|sent).*$/i, ""),
      )));
      const actorLabel = actorNames.length === 1
        ? actorNames[0]
        : `${actorNames[0]} and ${actorNames.length - 1} ${actorNames.length === 2 ? "other" : "others"}`;
      const title = first.type === "message"
        ? `${actorLabel} sent you ${items.length} messages`
        : first.type === "recommendation"
          ? `${actorLabel} recommended your profile`
          : first.type === "mention"
            ? `${actorLabel} mentioned you`
            : first.type === "comment"
              ? `${actorLabel} replied to a conversation`
              : first.title;

      return {
        ...first,
        detail: `${items.length} updates. Latest: ${first.detail}`,
        eventIds: items.flatMap((item) => item.eventIds),
        groupCount: items.length,
        isRead: items.every((item) => item.isRead),
        title,
      };
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 40);
}

async function getLocalNotifications(user?: User | null): Promise<NotificationItem[]> {
  const [dashboard, conversations, preferences, ownedProfileId, suppressedUsers] = await Promise.all([
    getFriendsDashboard(user),
    getDirectConversationSummaries(user),
    getNotificationPreferences(user),
    getOwnedConnectorProfileId(user?.id ?? LOCAL_DEMO_USER_ID),
    getSuppressedUserIds(user),
  ]);
  const hiddenNotificationActors = new Set([
    ...suppressedUsers.blockedIds,
    ...suppressedUsers.mutedIds,
  ]);
  const notifications: NotificationCandidate[] = [];

  dashboard.incomingRequests.forEach((friend) => {
    if (hiddenNotificationActors.has(friend.id)) return;
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
    if (hiddenNotificationActors.has(friend.id)) return;
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
      groupKey: `recommendation:${recommendation.connector.id}`,
    });
  });

  conversations
    .filter(
      (conversation) =>
        conversation.unreadCount > 0 &&
        !hiddenNotificationActors.has(conversation.recipientMemberId),
    )
    .forEach((conversation) => {
      notifications.push({
        id: `message-${conversation.id}`,
        type: "message",
        title: `${conversation.recipientName} sent you ${conversation.unreadCount === 1 ? "a message" : `${conversation.unreadCount} messages`}`,
        detail: conversation.lastMessage,
        href: `/messages/${conversation.recipientId}`,
        createdAt: conversation.updatedAt,
        groupKey: `message:${conversation.recipientMemberId}`,
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
            groupKey: `recommendation:${ownedProfileId}`,
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
    const userId = user?.id ?? LOCAL_DEMO_USER_ID;
    const subscriptions = store.subscriptions ?? [];
    const mutedPostIds = new Set(
      subscriptions
        .filter((subscription) => subscription.user_id === userId && subscription.status === "muted")
        .map((subscription) => subscription.post_id),
    );
    const followedPostIds = new Set(
      subscriptions
        .filter((subscription) => subscription.user_id === userId && subscription.status === "following")
        .map((subscription) => subscription.post_id),
    );
    const ownPostIds = new Set(
      store.posts.filter((post) => post.author_id === userId).map((post) => post.id),
    );
    const ownCommentIds = new Set(
      store.comments
        .filter((comment) => comment.author_id === userId)
        .map((comment) => comment.id),
    );
    const postTitles = new Map(store.posts.map((post) => [post.id, post.title]));
    const mentionCommentIds = new Set(
      (store.mentions ?? [])
        .filter(
          (mention) =>
            mention.mentioned_user_id === userId &&
            !mutedPostIds.has(mention.post_id) &&
            mention.comment_id,
        )
        .map((mention) => mention.comment_id!),
    );

    store.comments
      .filter(
        (comment) =>
          comment.author_id !== userId &&
          !hiddenNotificationActors.has(comment.author_id ?? "") &&
          !mutedPostIds.has(comment.post_id) &&
          !mentionCommentIds.has(comment.id) &&
          (ownPostIds.has(comment.post_id) ||
            followedPostIds.has(comment.post_id) ||
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
          groupKey: `forum-comment:${comment.post_id}`,
          postId: comment.post_id,
        });
      });

    (store.mentions ?? [])
      .filter(
        (mention) =>
          mention.mentioned_user_id === userId &&
          !hiddenNotificationActors.has(mention.actor_id) &&
          !mutedPostIds.has(mention.post_id),
      )
      .forEach((mention) => {
        notifications.push({
          id: `mention-${mention.id}`,
          type: "mention",
          title: `${mention.actor_name} mentioned you`,
          detail: postTitles.get(mention.post_id) ?? "Community post",
          href: mention.comment_id
            ? `/forum#comment-${mention.comment_id}`
            : `/forum#post-${mention.post_id}`,
          createdAt: mention.created_at,
          groupKey: `forum-mention:${mention.post_id}`,
          postId: mention.post_id,
        });
      });
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }

  notifications.forEach((notification) => {
    notification.eventIds = [notification.id];
  });
  const readOverrides = await getLocalNotificationReadState(user?.id ?? LOCAL_DEMO_USER_ID);
  return prepareNotifications(notifications, preferences, readOverrides);
}

export async function getNotifications(user?: User | null): Promise<NotificationItem[]> {
  if (!isSupabaseConfigured()) {
    return getLocalNotifications(user);
  }

  if (!user) {
    return [];
  }

  const supabase = await createClient();
  const [eventResult, eventPreferences, eventSuppressedUsers, eventSubscriptionResult] = await Promise.all([
    supabase
      .from("notification_events")
      .select("id, actor_id, kind, title, detail, href, group_key, read_at, created_at")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(120),
    getNotificationPreferences(user),
    getSuppressedUserIds(user),
    supabase
      .from("forum_post_subscriptions")
      .select("post_id, status")
      .eq("user_id", user.id)
      .eq("status", "muted"),
  ]);

  if (!eventResult.error && !eventSubscriptionResult.error && eventResult.data?.length) {
    const hiddenActors = new Set([
      ...eventSuppressedUsers.blockedIds,
      ...eventSuppressedUsers.mutedIds,
    ]);
    const mutedPostIds = new Set(
      (eventSubscriptionResult.data ?? []).map((subscription) => subscription.post_id),
    );
    const checkpoint = eventPreferences.notificationsReadAt
      ? new Date(eventPreferences.notificationsReadAt).getTime()
      : Number.NaN;
    const candidates: NotificationCandidate[] = eventResult.data
      .filter((event) => !event.actor_id || !hiddenActors.has(event.actor_id))
      .map((event) => {
        const postId = event.group_key.startsWith("forum-")
          ? event.group_key.split(":").slice(1).join(":")
          : undefined;
        return {
          id: event.id,
          eventIds: [event.id],
          type: event.kind as NotificationItem["type"],
          title: event.title,
          detail: event.detail,
          href: event.href,
          createdAt: event.created_at,
          groupKey: event.group_key,
          isRead: Boolean(event.read_at) || (
            Number.isFinite(checkpoint) && new Date(event.created_at).getTime() <= checkpoint
          ),
          postId,
        };
      })
      .filter((event) => !event.postId || !mutedPostIds.has(event.postId));

    return prepareNotifications(candidates, eventPreferences);
  }

  const [
    friendshipResult,
    recommendationResult,
    postResult,
    ownCommentResult,
    ownedProfileResult,
    subscriptionResult,
    mentionResult,
    conversations,
    preferences,
    suppressedUsers,
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
    supabase
      .from("forum_post_subscriptions")
      .select("post_id, status")
      .eq("user_id", user.id),
    supabase
      .from("forum_mentions")
      .select("id, actor_id, mentioned_user_id, post_id, comment_id, created_at")
      .eq("mentioned_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(40),
    getDirectConversationSummaries(user),
    getNotificationPreferences(user),
    getSuppressedUserIds(user),
  ]);

  const firstError =
    friendshipResult.error ??
    recommendationResult.error ??
    postResult.error ??
    ownCommentResult.error ??
    ownedProfileResult.error ??
    subscriptionResult.error ??
    mentionResult.error;

  if (firstError) {
    throw new Error(`Could not load notifications: ${firstError.message}`);
  }

  const hiddenNotificationActors = new Set([
    ...suppressedUsers.blockedIds,
    ...suppressedUsers.mutedIds,
  ]);
  const friendships = (friendshipResult.data ?? []).filter((friendship) => {
    const otherId =
      friendship.requester_id === user.id
        ? friendship.addressee_id
        : friendship.requester_id;
    return !hiddenNotificationActors.has(otherId);
  });
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
      !hiddenNotificationActors.has(recommendation.recommender_id) &&
      (
        acceptedFriendIds.has(recommendation.recommender_id) ||
        ownedProfileIds.has(recommendation.connector_profile_id)
      ),
  );
  const ownPosts = postResult.data ?? [];
  const subscriptions = subscriptionResult.data ?? [];
  const mutedPostIds = new Set(
    subscriptions
      .filter((subscription) => subscription.status === "muted")
      .map((subscription) => subscription.post_id),
  );
  const followedPostIds = subscriptions
    .filter((subscription) => subscription.status === "following")
    .map((subscription) => subscription.post_id);
  const mentions = (mentionResult.data ?? []).filter(
    (mention) =>
      !mutedPostIds.has(mention.post_id) &&
      !hiddenNotificationActors.has(mention.actor_id),
  );
  const trackedPostIds = Array.from(
    new Set([
      ...ownPosts.map((post) => post.id),
      ...followedPostIds,
    ]),
  ).filter((postId) => !mutedPostIds.has(postId));
  const titlePostIds = Array.from(
    new Set([
      ...ownPosts.map((post) => post.id),
      ...followedPostIds,
      ...mentions.map((mention) => mention.post_id),
    ]),
  );
  const ownCommentIds = (ownCommentResult.data ?? []).map((comment) => comment.id);
  const [postCommentResult, threadedReplyResult, relatedPostResult] = await Promise.all([
    trackedPostIds.length
    ? await supabase
        .from("forum_comments")
        .select("id, post_id, parent_comment_id, author_id, body, created_at")
        .in("post_id", trackedPostIds)
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
    titlePostIds.length
      ? await supabase
          .from("forum_posts")
          .select("id, title")
          .in("id", titlePostIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (postCommentResult.error || threadedReplyResult.error || relatedPostResult.error) {
    throw new Error(
      `Could not load notifications: ${(postCommentResult.error ?? threadedReplyResult.error ?? relatedPostResult.error)!.message}`,
    );
  }

  const mentionCommentIds = new Set(
    mentions.flatMap((mention) => mention.comment_id ? [mention.comment_id] : []),
  );
  const comments = Array.from(
    new Map(
      [...(postCommentResult.data ?? []), ...(threadedReplyResult.data ?? [])].map((comment) => [
        comment.id,
        comment,
      ]),
    ).values(),
  ).filter(
    (comment) =>
      !mutedPostIds.has(comment.post_id) &&
      !hiddenNotificationActors.has(comment.author_id ?? "") &&
      !mentionCommentIds.has(comment.id),
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
  mentions.forEach((mention) => actorIds.add(mention.actor_id));

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
  const postTitles = new Map(
    (relatedPostResult.data ?? ownPosts).map((post) => [post.id, post.title]),
  );
  const notifications: NotificationCandidate[] = [];

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

  mentions.forEach((mention) => {
    const actorName = memberNames.get(mention.actor_id) ?? fallbackName(mention.actor_id);
    notifications.push({
      id: `mention-${mention.id}`,
      type: "mention",
      title: `${actorName} mentioned you`,
      detail: postTitles.get(mention.post_id) ?? "Community post",
      href: mention.comment_id
        ? `/forum#comment-${mention.comment_id}`
        : `/forum#post-${mention.post_id}`,
      createdAt: mention.created_at,
    });
  });

  comments.forEach((comment) => {
    const commenterName = comment.author_id
      ? (memberNames.get(comment.author_id) ?? fallbackName(comment.author_id))
      : "A community member";

    notifications.push({
      id: `comment-${comment.id}`,
      type: "comment",
      title: ownPosts.some((post) => post.id === comment.post_id) ||
        Boolean(comment.parent_comment_id && ownCommentIds.includes(comment.parent_comment_id))
        ? `${commenterName} replied to you`
        : `${commenterName} commented on a conversation you follow`,
      detail: `${postTitles.get(comment.post_id) ?? "Community post"}: ${comment.body}`,
      href: `/forum#post-${comment.post_id}`,
      createdAt: comment.created_at,
    });
  });

  conversations
    .filter(
      (conversation) =>
        conversation.unreadCount > 0 &&
        !hiddenNotificationActors.has(conversation.recipientMemberId),
    )
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

  return prepareNotifications(notifications, preferences);
}

export async function setNotificationsRead(
  notificationIds: string[],
  shouldBeRead: boolean,
  user?: User | null,
) {
  const uniqueIds = Array.from(new Set(notificationIds.filter(Boolean)));
  if (uniqueIds.length === 0) return 0;

  if (!isSupabaseConfigured()) {
    await setLocalNotificationsRead(
      user?.id ?? LOCAL_DEMO_USER_ID,
      uniqueIds,
      shouldBeRead,
    );
    return uniqueIds.length;
  }

  if (!user) {
    throw new Error("Sign in before updating notifications.");
  }

  const uuidIds = uniqueIds.filter((id) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
  );
  if (uuidIds.length === 0) return 0;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_notification_read", {
    target_notification_ids: uuidIds,
    should_be_read: shouldBeRead,
  });

  if (error) {
    throw new Error(`Could not update notifications: ${error.message}`);
  }

  return data;
}
