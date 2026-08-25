import { readFile } from "node:fs/promises";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { ConnectorProfileModel } from "@/lib/connectors/types";
import {
  getMentionTargets,
  type MentionTarget,
} from "@/lib/connectors/repository";
import { getLocalDataPath, writeLocalJson } from "@/lib/local-data";
import { getSuppressedUserIds } from "@/lib/safety/repository";
import {
  getLocalMemberIdsForProfile,
  getLocalProfileHref,
} from "@/lib/members/local-member-profiles";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type ForumMentionModel = {
  name: string;
  profileHref: string;
};

type ForumSubscriptionStatus = "none" | "following" | "muted";

type ForumCommentModel = {
  id: string;
  parentId: string | null;
  authorId: string | null;
  initials: string;
  avatarClass: string;
  name: string;
  profileHref: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  editableUntil: string;
  likeCount: number;
  likedByCurrentUser: boolean;
  mentions: ForumMentionModel[];
};

type ForumPostModel = {
  id: string;
  authorId: string | null;
  initials: string;
  avatarClass: string;
  name: string;
  profileHref: string | null;
  meta: string;
  topic: string;
  title: string;
  body: string;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
  comments: ForumCommentModel[];
  likeCount: number;
  likedByCurrentUser: boolean;
  canManage: boolean;
  savedByCurrentUser: boolean;
  subscriptionStatus: ForumSubscriptionStatus;
  mentions: ForumMentionModel[];
};

type ForumActivityCommentModel = {
  id: string;
  postId: string;
  postTitle: string;
  postTopic: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  parentId: string | null;
};

type LocalForumPost = {
  id: string;
  author_id: string | null;
  initials?: string;
  avatar_class?: string;
  name: string;
  meta?: string;
  topic: string;
  title: string;
  body: string;
  image_urls?: string[];
  created_at: string;
  updated_at?: string;
  // Kept only so older local demo files are read cleanly once.
  commentName?: string | null;
  comment?: string | null;
};

type LocalForumComment = {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  author_id: string | null;
  name: string;
  initials?: string;
  avatar_class?: string;
  body: string;
  created_at: string;
  updated_at?: string;
};

type LocalForumLike = {
  post_id: string;
  user_id: string;
  created_at: string;
};

type LocalForumCommentLike = {
  comment_id: string;
  user_id: string;
  created_at: string;
};

type LocalForumSave = {
  post_id: string;
  user_id: string;
  created_at: string;
};

type LocalForumSubscription = {
  post_id: string;
  user_id: string;
  status: Exclude<ForumSubscriptionStatus, "none">;
  created_at: string;
  updated_at: string;
};

type LocalForumMention = {
  id: string;
  actor_id: string;
  actor_name: string;
  mentioned_user_id: string;
  mentioned_name: string;
  profile_href: string;
  post_id: string;
  comment_id: string | null;
  created_at: string;
};

type LocalForumStore = {
  posts: LocalForumPost[];
  comments: LocalForumComment[];
  likes: LocalForumLike[];
  commentLikes: LocalForumCommentLike[];
  savedPosts: LocalForumSave[];
  subscriptions: LocalForumSubscription[];
  mentions: LocalForumMention[];
};

type ForumPostRow = Database["public"]["Tables"]["forum_posts"]["Row"];
type ForumCommentRow = Database["public"]["Tables"]["forum_comments"]["Row"];
type PublicMemberRow = Database["public"]["Tables"]["public_member_profiles"]["Row"];
type ForumLikeRow = Database["public"]["Tables"]["forum_post_likes"]["Row"];
type ForumCommentLikeRow = Database["public"]["Tables"]["forum_comment_likes"]["Row"];
type ForumSaveRow = Database["public"]["Tables"]["forum_saved_posts"]["Row"];
type ForumSubscriptionRow = Database["public"]["Tables"]["forum_post_subscriptions"]["Row"];

const LOCAL_FORUM_PATH = getLocalDataPath("local-dev-forum.json");
const LOCAL_DEV_USER_ID = "local-dev-user";
const avatarClasses = ["avatar-blue", "avatar-gold", "avatar-coral"];
const defaultPosts: LocalForumPost[] = [
  {
    id: "local-forum-housing",
    author_id: "local-maria",
    initials: "MR",
    avatar_class: "avatar-blue",
    name: "Maria Rodriguez",
    topic: "Housing",
    title: "Looking for renter-friendly neighborhoods near reliable transit",
    body: "My sister is moving to Detroit for a healthcare job. She wants a quiet place, transit access, and grocery options nearby. What areas should she compare first?",
    created_at: "2026-07-20T13:48:00.000Z",
  },
  {
    id: "local-forum-business",
    author_id: "local-amara",
    initials: "AK",
    avatar_class: "avatar-gold",
    name: "Amara King",
    topic: "Business",
    title: "Who helps new food businesses understand Detroit permits?",
    body: "I’m helping a friend test a pop-up concept. We need plain-English guidance on licensing, inspections, shared kitchens, and neighborhood events.",
    created_at: "2026-07-20T13:26:00.000Z",
  },
  {
    id: "local-forum-moving",
    author_id: "local-devon",
    initials: "DT",
    avatar_class: "avatar-coral",
    name: "Devon Taylor",
    topic: "Moving",
    title: "Moving checklist for the first two weeks?",
    body: "What should I do first after arriving: utilities, parking, license updates, doctors, neighborhood groups, or something else I’m missing?",
    created_at: "2026-07-20T13:00:00.000Z",
  },
];

const defaultComments: LocalForumComment[] = [
  {
    id: "local-comment-housing-1",
    post_id: "local-forum-housing",
    parent_comment_id: null,
    author_id: "local-jalen",
    name: "Jalen P.",
    initials: "JP",
    avatar_class: "avatar-gold",
    body: "Woodbridge and New Center are worth comparing if she wants Midtown access without being directly downtown.",
    created_at: "2026-07-20T13:55:00.000Z",
  },
  {
    id: "local-comment-housing-2",
    post_id: "local-forum-housing",
    parent_comment_id: "local-comment-housing-1",
    author_id: "local-maria",
    name: "Maria Rodriguez",
    initials: "MR",
    avatar_class: "avatar-blue",
    body: "Thank you. I’ll add both to her first weekend of neighborhood visits.",
    created_at: "2026-07-20T14:02:00.000Z",
  },
  {
    id: "local-comment-business-1",
    post_id: "local-forum-business",
    parent_comment_id: null,
    author_id: "local-nina",
    name: "Nina S.",
    initials: "NS",
    avatar_class: "avatar-coral",
    body: "Eastern Market has good small business programming. I can share two contacts.",
    created_at: "2026-07-20T13:39:00.000Z",
  },
  {
    id: "local-comment-moving-1",
    post_id: "local-forum-moving",
    parent_comment_id: null,
    author_id: "local-priya",
    name: "Priya M.",
    initials: "PM",
    avatar_class: "avatar-blue",
    body: "Start with utilities and parking, then join your neighborhood association list.",
    created_at: "2026-07-20T13:12:00.000Z",
  },
];

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "DC"
  );
}

function formatPostTime(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getLocalUserId(user?: User | null) {
  return user?.id ?? LOCAL_DEV_USER_ID;
}

function getMentionOwnerId(target: MentionTarget) {
  if (isSupabaseConfigured()) {
    return target.ownerId;
  }

  return target.ownerId ?? getLocalMemberIdsForProfile(target.profileId)[0] ?? null;
}

function escapeRegularExpression(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveMentions(text: string, targets: MentionTarget[]): ForumMentionModel[] {
  return targets
    .filter((target) => {
      const expression = new RegExp(
        `@${escapeRegularExpression(target.name)}(?=$|[\\s.,!?;:)'"])`,
        "i",
      );
      return expression.test(text);
    })
    .map((target) => ({ name: target.name, profileHref: target.profileHref }));
}

function localMentionRecords(
  text: string,
  targets: MentionTarget[],
  input: {
    actorId: string;
    actorName: string;
    postId: string;
    commentId?: string | null;
  },
): LocalForumMention[] {
  return resolveMentions(text, targets).flatMap((mention) => {
    const target = targets.find(
      (candidate) =>
        candidate.name.toLowerCase() === mention.name.toLowerCase() &&
        candidate.profileHref === mention.profileHref,
    );
    const mentionedUserId = target ? getMentionOwnerId(target) : null;
    if (!mentionedUserId || mentionedUserId === input.actorId) return [];
    return [{
      id: crypto.randomUUID(),
      actor_id: input.actorId,
      actor_name: input.actorName,
      mentioned_user_id: mentionedUserId,
      mentioned_name: mention.name,
      profile_href: mention.profileHref,
      post_id: input.postId,
      comment_id: input.commentId ?? null,
      created_at: new Date().toISOString(),
    }];
  });
}

async function syncSupabaseMentions(
  supabase: SupabaseClient<Database>,
  text: string,
  targets: MentionTarget[],
  input: { actorId: string; postId: string; commentId?: string | null },
) {
  let deleteQuery = supabase
    .from("forum_mentions")
    .delete()
    .eq("actor_id", input.actorId)
    .eq("post_id", input.postId);
  deleteQuery = input.commentId
    ? deleteQuery.eq("comment_id", input.commentId)
    : deleteQuery.is("comment_id", null);
  const { error: deleteError } = await deleteQuery;
  if (deleteError) throw new Error(`Could not update mentions: ${deleteError.message}`);

  const mentionedUserIds = Array.from(
    new Set(
      resolveMentions(text, targets)
        .flatMap((mention) => {
          const target = targets.find(
            (candidate) =>
              candidate.name.toLowerCase() === mention.name.toLowerCase() &&
              candidate.profileHref === mention.profileHref,
          );
          const ownerId = target ? getMentionOwnerId(target) : null;
          return ownerId && ownerId !== input.actorId ? [ownerId] : [];
        }),
    ),
  );
  if (mentionedUserIds.length === 0) return;

  const { error: insertError } = await supabase.from("forum_mentions").insert(
    mentionedUserIds.map((mentionedUserId) => ({
      actor_id: input.actorId,
      mentioned_user_id: mentionedUserId,
      post_id: input.postId,
      comment_id: input.commentId ?? null,
    })),
  );
  if (insertError) throw new Error(`Could not update mentions: ${insertError.message}`);
}

const COMMENT_EDIT_WINDOW_MS = 2 * 60 * 1000;

function commentEditMetadata(authorId: string | null, createdAt: string, updatedAt: string, user?: User | null) {
  const deadline = new Date(createdAt).getTime() + COMMENT_EDIT_WINDOW_MS;
  const viewerId = getLocalUserId(user);
  return {
    updatedAt,
    canEdit: authorId === viewerId && Number.isFinite(deadline) && Date.now() < deadline,
    editableUntil: new Date(deadline).toISOString(),
  };
}

function legacyPostsToStore(posts: LocalForumPost[]): LocalForumStore {
  const comments = posts.flatMap((post) =>
    post.comment && post.commentName
      ? [
          {
            id: `legacy-comment-${post.id}`,
            post_id: post.id,
            parent_comment_id: null,
            author_id: null,
            name: post.commentName,
            body: post.comment,
            created_at: post.created_at,
          },
        ]
      : [],
  );

  return { posts, comments, likes: [], commentLikes: [], savedPosts: [], subscriptions: [], mentions: [] };
}

async function readLocalStore(): Promise<LocalForumStore> {
  try {
    const parsed = JSON.parse(await readFile(LOCAL_FORUM_PATH, "utf8")) as LocalForumStore | LocalForumPost[];
    return Array.isArray(parsed)
      ? legacyPostsToStore(parsed)
      : {
          posts: parsed.posts ?? [],
          comments: parsed.comments ?? [],
          likes: parsed.likes ?? [],
          commentLikes: parsed.commentLikes ?? [],
          savedPosts: parsed.savedPosts ?? [],
          subscriptions: parsed.subscriptions ?? [],
          mentions: parsed.mentions ?? [],
        };
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }

    const initialStore: LocalForumStore = {
      posts: defaultPosts,
      comments: defaultComments,
      likes: [],
      commentLikes: [],
      savedPosts: [],
      subscriptions: [],
      mentions: [],
    };
    await writeLocalStore(initialStore);
    return initialStore;
  }
}

async function writeLocalStore(store: LocalForumStore) {
  await writeLocalJson(LOCAL_FORUM_PATH, store);
}

function localPostToModel(
  post: LocalForumPost,
  store: LocalForumStore,
  mentionTargets: MentionTarget[],
  user?: User | null,
): ForumPostModel {
  const userId = getLocalUserId(user);
  const commentLikesByComment = new Map<string, LocalForumCommentLike[]>();
  store.commentLikes.forEach((like) => {
    commentLikesByComment.set(like.comment_id, [...(commentLikesByComment.get(like.comment_id) ?? []), like]);
  });
  const comments = store.comments
    .filter((comment) => comment.post_id === post.id)
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
    .map((comment, index) => {
      const commentLikes = commentLikesByComment.get(comment.id) ?? [];
      return {
      id: comment.id,
      parentId: comment.parent_comment_id,
      authorId: comment.author_id,
      initials: comment.initials ?? getInitials(comment.name),
      avatarClass: comment.avatar_class ?? avatarClasses[index % avatarClasses.length],
      name: comment.name,
      profileHref: getLocalProfileHref(comment.author_id, comment.name),
      body: comment.body,
      createdAt: comment.created_at,
      likeCount: commentLikes.length,
      likedByCurrentUser: commentLikes.some((like) => like.user_id === userId),
      mentions: resolveMentions(comment.body, mentionTargets),
      ...commentEditMetadata(
        comment.author_id,
        comment.created_at,
        comment.updated_at ?? comment.created_at,
        user,
      ),
      };
    });
  const likes = store.likes.filter((like) => like.post_id === post.id);
  const subscription = store.subscriptions.find(
    (candidate) => candidate.post_id === post.id && candidate.user_id === userId,
  );

  return {
    id: post.id,
    authorId: post.author_id,
    initials: post.initials ?? getInitials(post.name),
    avatarClass: post.avatar_class ?? "avatar-blue",
    name: post.name,
    profileHref: getLocalProfileHref(post.author_id, post.name),
    meta: post.meta ?? formatPostTime(post.created_at),
    topic: post.topic,
    title: post.title,
    body: post.body,
    imageUrls: post.image_urls ?? [],
    createdAt: post.created_at,
    updatedAt: post.updated_at ?? post.created_at,
    comments,
    likeCount: likes.length,
    likedByCurrentUser: likes.some((like) => like.user_id === userId),
    canManage: post.author_id === userId,
    savedByCurrentUser: store.savedPosts.some(
      (savedPost) => savedPost.post_id === post.id && savedPost.user_id === userId,
    ),
    subscriptionStatus: subscription?.status ?? "none",
    mentions: resolveMentions(post.body, mentionTargets),
  };
}

async function getSupabasePosts(
  topic?: string,
  user?: User | null,
  authorId?: string | null,
  limit = 40,
  selectedPostIds?: string[],
): Promise<ForumPostModel[]> {
  const supabase = (await createClient()) as SupabaseClient<Database>;
  const [mentionTargets, suppressedUsers] = await Promise.all([
    getMentionTargets(),
    getSuppressedUserIds(user),
  ]);
  const hiddenAuthorIds = new Set([
    ...suppressedUsers.blockedIds,
    ...suppressedUsers.mutedIds,
  ]);
  let postsQuery = supabase
    .from("forum_posts")
    .select("id, author_id, title, body, topic, image_urls, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (topic && topic !== "All") {
    postsQuery = postsQuery.eq("topic", topic);
  }
  if (authorId) {
    postsQuery = postsQuery.eq("author_id", authorId);
  }
  if (selectedPostIds) {
    if (selectedPostIds.length === 0) return [];
    postsQuery = postsQuery.in("id", selectedPostIds);
  }

  const { data: postData, error: postError } = await postsQuery;
  if (postError) {
    throw new Error(`Could not load forum posts: ${postError.message}`);
  }

  const posts = ((postData ?? []) as ForumPostRow[]).filter(
    (post) => !post.author_id || !hiddenAuthorIds.has(post.author_id),
  );
  const postIds = posts.map((post) => post.id);
  const authorIds = posts.flatMap((post) => (post.author_id ? [post.author_id] : []));
  const { data: commentData, error: commentError } = postIds.length
    ? await supabase
        .from("forum_comments")
        .select("id, post_id, parent_comment_id, author_id, body, created_at, updated_at")
        .in("post_id", postIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  if (commentError) {
    throw new Error(`Could not load forum comments: ${commentError.message}`);
  }

  const comments = ((commentData ?? []) as ForumCommentRow[]).filter(
    (comment) => !comment.author_id || !hiddenAuthorIds.has(comment.author_id),
  );
  authorIds.push(...comments.flatMap((comment) => (comment.author_id ? [comment.author_id] : [])));
  const commentIds = comments.map((comment) => comment.id);
  const { data: commentLikeData, error: commentLikeError } = commentIds.length
    ? await supabase
        .from("forum_comment_likes")
        .select("comment_id, user_id, created_at")
        .in("comment_id", commentIds)
    : { data: [], error: null };
  if (commentLikeError) {
    throw new Error(`Could not load forum comment likes: ${commentLikeError.message}`);
  }
  const uniqueAuthorIds = Array.from(new Set(authorIds));
  const { data: memberData, error: memberError } = uniqueAuthorIds.length
    ? await supabase
        .from("public_member_profiles")
        .select("id, display_name, avatar_url")
        .in("id", uniqueAuthorIds)
    : { data: [], error: null };
  if (memberError) {
    throw new Error(`Could not load forum members: ${memberError.message}`);
  }

  const { data: profileData, error: profileError } = uniqueAuthorIds.length
    ? await supabase.from("connector_profiles").select("id, owner_id").in("owner_id", uniqueAuthorIds)
    : { data: [], error: null };
  if (profileError) {
    throw new Error(`Could not load forum author profiles: ${profileError.message}`);
  }

  const { data: likeData, error: likeError } = postIds.length
    ? await supabase.from("forum_post_likes").select("post_id, user_id, created_at").in("post_id", postIds)
    : { data: [], error: null };
  if (likeError) {
    throw new Error(`Could not load forum likes: ${likeError.message}`);
  }
  const [{ data: saveData, error: saveError }, { data: subscriptionData, error: subscriptionError }] =
    user && postIds.length
      ? await Promise.all([
          supabase
            .from("forum_saved_posts")
            .select("post_id, user_id, created_at")
            .eq("user_id", user.id)
            .in("post_id", postIds),
          supabase
            .from("forum_post_subscriptions")
            .select("post_id, user_id, status, created_at, updated_at")
            .eq("user_id", user.id)
            .in("post_id", postIds),
        ])
      : [
          { data: [] as ForumSaveRow[], error: null },
          { data: [] as ForumSubscriptionRow[], error: null },
        ];
  if (saveError || subscriptionError) {
    throw new Error(
      `Could not load forum controls: ${(saveError ?? subscriptionError)!.message}`,
    );
  }

  const members = new Map(
    ((memberData ?? []) as PublicMemberRow[]).map((member) => [member.id, member.display_name]),
  );
  const profileIdsByOwner = new Map(
    (profileData ?? []).flatMap((profile) => (profile.owner_id ? [[profile.owner_id, profile.id] as const] : [])),
  );
  const likesByPost = new Map<string, ForumLikeRow[]>();
  ((likeData ?? []) as ForumLikeRow[]).forEach((like) => {
    likesByPost.set(like.post_id, [...(likesByPost.get(like.post_id) ?? []), like]);
  });
  const likesByComment = new Map<string, ForumCommentLikeRow[]>();
  ((commentLikeData ?? []) as ForumCommentLikeRow[]).forEach((like) => {
    likesByComment.set(like.comment_id, [...(likesByComment.get(like.comment_id) ?? []), like]);
  });
  const savedPostIds = new Set(((saveData ?? []) as ForumSaveRow[]).map((save) => save.post_id));
  const subscriptionsByPost = new Map(
    ((subscriptionData ?? []) as ForumSubscriptionRow[]).map((subscription) => [
      subscription.post_id,
      subscription.status === "muted" ? "muted" as const : "following" as const,
    ]),
  );

  return posts.map((post, index) => {
    const authorName = post.author_id ? (members.get(post.author_id) ?? "Detroit Connect member") : "Community member";
    const postComments = comments
      .filter((comment) => comment.post_id === post.id)
      .map((comment, commentIndex) => {
        const name = comment.author_id ? (members.get(comment.author_id) ?? "Community member") : "Community member";
        const commentLikes = likesByComment.get(comment.id) ?? [];
        return {
          id: comment.id,
          parentId: comment.parent_comment_id,
          authorId: comment.author_id,
          initials: getInitials(name),
          avatarClass: avatarClasses[commentIndex % avatarClasses.length],
          name,
          profileHref: comment.author_id
            ? profileIdsByOwner.get(comment.author_id)
              ? `/connectors/${profileIdsByOwner.get(comment.author_id)}`
              : `/members/${comment.author_id}`
            : null,
          body: comment.body,
          createdAt: comment.created_at,
          updatedAt: comment.updated_at,
          likeCount: commentLikes.length,
          likedByCurrentUser: Boolean(user && commentLikes.some((like) => like.user_id === user.id)),
          mentions: resolveMentions(comment.body, mentionTargets),
          canEdit:
            Boolean(user) &&
            comment.author_id === user?.id &&
            Date.now() < new Date(comment.created_at).getTime() + COMMENT_EDIT_WINDOW_MS,
          editableUntil: new Date(
            new Date(comment.created_at).getTime() + COMMENT_EDIT_WINDOW_MS,
          ).toISOString(),
        };
      });
    const likes = likesByPost.get(post.id) ?? [];

    return {
      id: post.id,
      authorId: post.author_id,
      initials: getInitials(authorName),
      avatarClass: avatarClasses[index % avatarClasses.length],
      name: authorName,
      profileHref: post.author_id
        ? profileIdsByOwner.get(post.author_id)
          ? `/connectors/${profileIdsByOwner.get(post.author_id)}`
          : `/members/${post.author_id}`
        : null,
      meta: formatPostTime(post.created_at),
      topic: post.topic,
      title: post.title,
      body: post.body,
      imageUrls: post.image_urls ?? [],
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      comments: postComments,
      likeCount: likes.length,
      likedByCurrentUser: Boolean(user && likes.some((like) => like.user_id === user.id)),
      canManage: Boolean(user && post.author_id === user.id),
      savedByCurrentUser: savedPostIds.has(post.id),
      subscriptionStatus: subscriptionsByPost.get(post.id) ?? "none",
      mentions: resolveMentions(post.body, mentionTargets),
    };
  });
}

export async function getForumPosts(topic?: string, user?: User | null) {
  if (isSupabaseConfigured()) {
    return getSupabasePosts(topic, user);
  }

  const [store, mentionTargets, suppressedUsers] = await Promise.all([
    readLocalStore(),
    getMentionTargets(),
    getSuppressedUserIds(user),
  ]);
  const hiddenAuthorIds = new Set([
    ...suppressedUsers.blockedIds,
    ...suppressedUsers.mutedIds,
  ]);
  return store.posts
    .filter(
      (post) =>
        (!post.author_id || !hiddenAuthorIds.has(post.author_id)) &&
        (!topic || topic === "All" || post.topic === topic),
    )
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .map((post) => localPostToModel(post, store, mentionTargets, user))
    .map((post) => ({
      ...post,
      comments: post.comments.filter(
        (comment) => !comment.authorId || !hiddenAuthorIds.has(comment.authorId),
      ),
    }));
}

export async function getForumPostsByProfile(
  profile: ConnectorProfileModel,
  user?: User | null,
  limit = 4,
) {
  if (isSupabaseConfigured()) {
    if (!profile.ownerId) return [];
    return getSupabasePosts(undefined, user, profile.ownerId, limit);
  }

  const [store, mentionTargets, suppressedUsers] = await Promise.all([
    readLocalStore(),
    getMentionTargets(),
    getSuppressedUserIds(user),
  ]);
  const hiddenAuthorIds = new Set([
    ...suppressedUsers.blockedIds,
    ...suppressedUsers.mutedIds,
  ]);
  const authorIds = new Set([
    ...getLocalMemberIdsForProfile(profile.id),
    ...(profile.ownerId ? [profile.ownerId] : []),
  ]);

  return store.posts
    .filter(
      (post) =>
        Boolean(post.author_id && authorIds.has(post.author_id)) &&
        !hiddenAuthorIds.has(post.author_id!),
    )
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, limit)
    .map((post) => localPostToModel(post, store, mentionTargets, user))
    .map((post) => ({
      ...post,
      comments: post.comments.filter(
        (comment) => !comment.authorId || !hiddenAuthorIds.has(comment.authorId),
      ),
    }));
}

export async function getForumPostsForCurrentUser(
  view: "posts" | "commented",
  topic?: string,
  user?: User | null,
  limit = 100,
) {
  const viewerId = getLocalUserId(user);

  if (isSupabaseConfigured()) {
    if (!user) return [];
    if (view === "posts") {
      return getSupabasePosts(topic, user, user.id, limit);
    }

    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { data, error } = await supabase
      .from("forum_comments")
      .select("post_id, created_at")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit * 2);
    if (error) throw new Error(`Could not load your forum activity: ${error.message}`);

    const postIds = Array.from(new Set((data ?? []).map((comment) => comment.post_id))).slice(0, limit);
    return getSupabasePosts(topic, user, undefined, postIds.length || 1, postIds);
  }

  const posts = await getForumPosts(topic, user);
  if (view === "posts") {
    return posts.filter((post) => post.authorId === viewerId).slice(0, limit);
  }

  return posts
    .filter((post) => post.comments.some((comment) => comment.authorId === viewerId))
    .slice(0, limit);
}

export async function getForumCommentsByCurrentUser(
  user?: User | null,
  limit = 100,
): Promise<ForumActivityCommentModel[]> {
  const viewerId = getLocalUserId(user);

  if (isSupabaseConfigured()) {
    if (!user) return [];
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { data, error } = await supabase
      .from("forum_comments")
      .select("id, post_id, parent_comment_id, body, created_at, updated_at")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Could not load your comments: ${error.message}`);

    const comments = (data ?? []) as ForumCommentRow[];
    const postIds = Array.from(new Set(comments.map((comment) => comment.post_id)));
    const { data: postData, error: postError } = postIds.length
      ? await supabase.from("forum_posts").select("id, title, topic").in("id", postIds)
      : { data: [], error: null };
    if (postError) throw new Error(`Could not load the related posts: ${postError.message}`);
    const postsById = new Map((postData ?? []).map((post) => [post.id, post]));

    return comments.flatMap((comment) => {
      const post = postsById.get(comment.post_id);
      return post
        ? [{
            id: comment.id,
            postId: comment.post_id,
            postTitle: post.title,
            postTopic: post.topic,
            body: comment.body,
            createdAt: comment.created_at,
            updatedAt: comment.updated_at,
            parentId: comment.parent_comment_id,
          }]
        : [];
    });
  }

  const store = await readLocalStore();
  const postsById = new Map(store.posts.map((post) => [post.id, post]));
  return store.comments
    .filter((comment) => comment.author_id === viewerId)
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, limit)
    .flatMap((comment) => {
      const post = postsById.get(comment.post_id);
      return post
        ? [{
            id: comment.id,
            postId: comment.post_id,
            postTitle: post.title,
            postTopic: post.topic,
            body: comment.body,
            createdAt: comment.created_at,
            updatedAt: comment.updated_at ?? comment.created_at,
            parentId: comment.parent_comment_id,
          }]
        : [];
    });
}

export async function createForumPost(
  input: { title: string; body: string; topic: string; imageUrls?: string[] },
  user?: User | null,
) {
  const mentionTargets = await getMentionTargets();
  if (isSupabaseConfigured()) {
    if (!user) throw new Error("Sign in before creating a forum post.");
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { data, error } = await supabase
      .from("forum_posts")
      .insert({
        author_id: user.id,
        title: input.title,
        body: input.body,
        topic: input.topic,
        image_urls: input.imageUrls ?? [],
      })
      .select("id")
      .single();
    if (error) throw new Error(`Could not publish the forum post: ${error.message}`);

    try {
      const { error: subscriptionError } = await supabase.from("forum_post_subscriptions").insert({
        user_id: user.id,
        post_id: data.id,
        status: "following",
      });
      if (subscriptionError) {
        throw new Error(`Could not follow the new post: ${subscriptionError.message}`);
      }
      await syncSupabaseMentions(supabase, input.body, mentionTargets, {
        actorId: user.id,
        postId: data.id,
      });
    } catch (operationError) {
      await supabase.from("forum_posts").delete().eq("id", data.id).eq("author_id", user.id);
      throw operationError;
    }

    return { mode: "supabase" as const };
  }

  const store = await readLocalStore();
  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "You";
  const userId = getLocalUserId(user);
  const now = new Date().toISOString();
  const record: LocalForumPost = {
    id: crypto.randomUUID(), author_id: userId, initials: getInitials(name), avatar_class: "avatar-blue",
    name,
    topic: input.topic,
    title: input.title,
    body: input.body,
    image_urls: input.imageUrls ?? [],
    created_at: now,
    updated_at: now,
  };
  store.posts.unshift(record);
  store.subscriptions.push({
    post_id: record.id,
    user_id: userId,
    status: "following",
    created_at: now,
    updated_at: now,
  });
  store.mentions.push(
    ...localMentionRecords(input.body, mentionTargets, {
      actorId: userId,
      actorName: name,
      postId: record.id,
    }),
  );
  await writeLocalStore(store);
  return { mode: "local" as const };
}

export async function createForumComment(
  input: { postId: string; body: string; parentCommentId?: string | null },
  user?: User | null,
) {
  const mentionTargets = await getMentionTargets();
  if (isSupabaseConfigured()) {
    if (!user) throw new Error("Sign in before commenting.");
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { data, error } = await supabase
      .from("forum_comments")
      .insert({
        post_id: input.postId, author_id: user.id, body: input.body, parent_comment_id: input.parentCommentId ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Could not publish the comment: ${error.message}`);

    try {
      const { data: subscription } = await supabase
        .from("forum_post_subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .eq("post_id", input.postId)
        .maybeSingle();
      if (!subscription) {
        const { error: subscriptionError } = await supabase.from("forum_post_subscriptions").insert({
          user_id: user.id,
          post_id: input.postId,
          status: "following",
        });
        if (subscriptionError) {
          throw new Error(`Could not follow the conversation: ${subscriptionError.message}`);
        }
      }
      await syncSupabaseMentions(supabase, input.body, mentionTargets, {
        actorId: user.id,
        postId: input.postId,
        commentId: data.id,
      });
    } catch (operationError) {
      await supabase.from("forum_comments").delete().eq("id", data.id).eq("author_id", user.id);
      throw operationError;
    }

    return { mode: "supabase" as const };
  }

  const store = await readLocalStore();
  if (!store.posts.some((post) => post.id === input.postId)) throw new Error("That forum post could not be found.");
  if (input.parentCommentId && !store.comments.some((comment) => comment.id === input.parentCommentId && comment.post_id === input.postId)) {
    throw new Error("That comment is no longer available to reply to.");
  }
  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "You";
  const userId = getLocalUserId(user);
  const now = new Date().toISOString();
  const comment: LocalForumComment = {
    id: crypto.randomUUID(), post_id: input.postId, parent_comment_id: input.parentCommentId ?? null,
    author_id: userId, name, initials: getInitials(name), avatar_class: "avatar-blue",
    body: input.body,
    created_at: now,
    updated_at: now,
  };
  store.comments.push(comment);
  if (!store.subscriptions.some(
    (subscription) => subscription.post_id === input.postId && subscription.user_id === userId,
  )) {
    store.subscriptions.push({
      post_id: input.postId,
      user_id: userId,
      status: "following",
      created_at: now,
      updated_at: now,
    });
  }
  store.mentions.push(
    ...localMentionRecords(input.body, mentionTargets, {
      actorId: userId,
      actorName: name,
      postId: input.postId,
      commentId: comment.id,
    }),
  );
  await writeLocalStore(store);
  return { mode: "local" as const };
}

export async function updateForumComment(
  input: { commentId: string; postId: string; body: string },
  user?: User | null,
) {
  const mentionTargets = await getMentionTargets();
  if (isSupabaseConfigured()) {
    if (!user) throw new Error("Sign in before editing a comment.");
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { data: comment, error: readError } = await supabase
      .from("forum_comments")
      .select("author_id, created_at")
      .eq("id", input.commentId)
      .eq("post_id", input.postId)
      .maybeSingle();
    if (readError) throw new Error(`Could not edit the comment: ${readError.message}`);
    if (!comment || comment.author_id !== user.id) throw new Error("You can only edit your own comment.");
    if (Date.now() >= new Date(comment.created_at).getTime() + COMMENT_EDIT_WINDOW_MS) {
      throw new Error("Comments can only be edited for 2 minutes after posting.");
    }
    const { error } = await supabase
      .from("forum_comments")
      .update({ body: input.body, updated_at: new Date().toISOString() })
      .eq("id", input.commentId)
      .eq("author_id", user.id);
    if (error) throw new Error(`Could not edit the comment: ${error.message}`);
    await syncSupabaseMentions(supabase, input.body, mentionTargets, {
      actorId: user.id,
      postId: input.postId,
      commentId: input.commentId,
    });
    return;
  }

  const store = await readLocalStore();
  const comment = store.comments.find(
    (candidate) => candidate.id === input.commentId && candidate.post_id === input.postId,
  );
  if (!comment) throw new Error("That comment could not be found.");
  if (comment.author_id !== getLocalUserId(user)) throw new Error("You can only edit your own comment.");
  if (Date.now() >= new Date(comment.created_at).getTime() + COMMENT_EDIT_WINDOW_MS) {
    throw new Error("Comments can only be edited for 2 minutes after posting.");
  }
  comment.body = input.body;
  comment.updated_at = new Date().toISOString();
  store.mentions = store.mentions.filter((mention) => mention.comment_id !== input.commentId);
  const actorName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "You";
  store.mentions.push(
    ...localMentionRecords(input.body, mentionTargets, {
      actorId: getLocalUserId(user),
      actorName,
      postId: input.postId,
      commentId: input.commentId,
    }),
  );
  await writeLocalStore(store);
}

export async function toggleForumPostLike(postId: string, user?: User | null) {
  if (isSupabaseConfigured()) {
    if (!user) throw new Error("Sign in before liking a forum post.");
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { data: existing, error: existingError } = await supabase
      .from("forum_post_likes").select("post_id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
    if (existingError) throw new Error(`Could not update the like: ${existingError.message}`);
    const { error } = existing
      ? await supabase.from("forum_post_likes").delete().eq("post_id", postId).eq("user_id", user.id)
      : await supabase.from("forum_post_likes").insert({ post_id: postId, user_id: user.id });
    if (error) throw new Error(`Could not update the like: ${error.message}`);
    return { mode: "supabase" as const, liked: !existing };
  }

  const store = await readLocalStore();
  if (!store.posts.some((post) => post.id === postId)) throw new Error("That forum post could not be found.");
  const userId = getLocalUserId(user);
  const existingIndex = store.likes.findIndex((like) => like.post_id === postId && like.user_id === userId);
  if (existingIndex >= 0) {
    store.likes.splice(existingIndex, 1);
    await writeLocalStore(store);
    return { mode: "local" as const, liked: false };
  }
  store.likes.push({ post_id: postId, user_id: userId, created_at: new Date().toISOString() });
  await writeLocalStore(store);
  return { mode: "local" as const, liked: true };
}

export async function toggleForumCommentLike(commentId: string, user?: User | null) {
  if (isSupabaseConfigured()) {
    if (!user) throw new Error("Sign in before liking a comment.");
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { data: existing, error: existingError } = await supabase
      .from("forum_comment_likes")
      .select("comment_id")
      .eq("comment_id", commentId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existingError) throw new Error(`Could not update the comment like: ${existingError.message}`);
    const { error } = existing
      ? await supabase.from("forum_comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id)
      : await supabase.from("forum_comment_likes").insert({ comment_id: commentId, user_id: user.id });
    if (error) throw new Error(`Could not update the comment like: ${error.message}`);
    return { mode: "supabase" as const, liked: !existing };
  }

  const store = await readLocalStore();
  if (!store.comments.some((comment) => comment.id === commentId)) {
    throw new Error("That comment could not be found.");
  }
  const userId = getLocalUserId(user);
  const existingIndex = store.commentLikes.findIndex(
    (like) => like.comment_id === commentId && like.user_id === userId,
  );
  if (existingIndex >= 0) {
    store.commentLikes.splice(existingIndex, 1);
    await writeLocalStore(store);
    return { mode: "local" as const, liked: false };
  }
  store.commentLikes.push({ comment_id: commentId, user_id: userId, created_at: new Date().toISOString() });
  await writeLocalStore(store);
  return { mode: "local" as const, liked: true };
}

export async function updateForumPost(
  input: { postId: string; title: string; body: string; topic: string },
  user?: User | null,
) {
  const mentionTargets = await getMentionTargets();
  if (isSupabaseConfigured()) {
    if (!user) throw new Error("Sign in before editing a forum post.");
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { data: post, error: readError } = await supabase
      .from("forum_posts")
      .select("author_id")
      .eq("id", input.postId)
      .maybeSingle();
    if (readError) throw new Error(`Could not edit the post: ${readError.message}`);
    if (!post || post.author_id !== user.id) throw new Error("You can only edit your own post.");
    const { error } = await supabase
      .from("forum_posts")
      .update({
        title: input.title,
        body: input.body,
        topic: input.topic,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.postId)
      .eq("author_id", user.id);
    if (error) throw new Error(`Could not edit the post: ${error.message}`);
    await syncSupabaseMentions(supabase, input.body, mentionTargets, {
      actorId: user.id,
      postId: input.postId,
    });
    return;
  }

  const store = await readLocalStore();
  const post = store.posts.find((candidate) => candidate.id === input.postId);
  if (!post) throw new Error("That forum post could not be found.");
  if (post.author_id !== getLocalUserId(user)) throw new Error("You can only edit your own post.");
  post.title = input.title;
  post.body = input.body;
  post.topic = input.topic;
  post.updated_at = new Date().toISOString();
  store.mentions = store.mentions.filter(
    (mention) => mention.post_id !== input.postId || mention.comment_id !== null,
  );
  const actorName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "You";
  store.mentions.push(
    ...localMentionRecords(input.body, mentionTargets, {
      actorId: getLocalUserId(user),
      actorName,
      postId: input.postId,
    }),
  );
  await writeLocalStore(store);
}

export async function deleteForumPost(postId: string, user?: User | null) {
  if (isSupabaseConfigured()) {
    if (!user) throw new Error("Sign in before deleting a forum post.");
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { data: post, error: readError } = await supabase
      .from("forum_posts")
      .select("author_id")
      .eq("id", postId)
      .maybeSingle();
    if (readError) throw new Error(`Could not delete the post: ${readError.message}`);
    if (!post || post.author_id !== user.id) throw new Error("You can only delete your own post.");
    const { error } = await supabase
      .from("forum_posts")
      .delete()
      .eq("id", postId)
      .eq("author_id", user.id);
    if (error) throw new Error(`Could not delete the post: ${error.message}`);
    return;
  }

  const store = await readLocalStore();
  const post = store.posts.find((candidate) => candidate.id === postId);
  if (!post) throw new Error("That forum post could not be found.");
  if (post.author_id !== getLocalUserId(user)) throw new Error("You can only delete your own post.");
  store.posts = store.posts.filter((candidate) => candidate.id !== postId);
  store.comments = store.comments.filter((comment) => comment.post_id !== postId);
  store.likes = store.likes.filter((like) => like.post_id !== postId);
  store.savedPosts = store.savedPosts.filter((save) => save.post_id !== postId);
  store.subscriptions = store.subscriptions.filter(
    (subscription) => subscription.post_id !== postId,
  );
  store.mentions = store.mentions.filter((mention) => mention.post_id !== postId);
  await writeLocalStore(store);
}

export async function toggleForumPostSave(postId: string, user?: User | null) {
  if (isSupabaseConfigured()) {
    if (!user) throw new Error("Sign in before saving a forum post.");
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { data: existing, error: readError } = await supabase
      .from("forum_saved_posts")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (readError) throw new Error(`Could not update the saved post: ${readError.message}`);
    const { error } = existing
      ? await supabase.from("forum_saved_posts").delete().eq("post_id", postId).eq("user_id", user.id)
      : await supabase.from("forum_saved_posts").insert({ post_id: postId, user_id: user.id });
    if (error) throw new Error(`Could not update the saved post: ${error.message}`);
    return { saved: !existing };
  }

  const store = await readLocalStore();
  if (!store.posts.some((post) => post.id === postId)) throw new Error("That forum post could not be found.");
  const userId = getLocalUserId(user);
  const existingIndex = store.savedPosts.findIndex(
    (save) => save.post_id === postId && save.user_id === userId,
  );
  if (existingIndex >= 0) {
    store.savedPosts.splice(existingIndex, 1);
    await writeLocalStore(store);
    return { saved: false };
  }
  store.savedPosts.push({ post_id: postId, user_id: userId, created_at: new Date().toISOString() });
  await writeLocalStore(store);
  return { saved: true };
}

export async function toggleForumPostFollow(postId: string, user?: User | null) {
  if (isSupabaseConfigured()) {
    if (!user) throw new Error("Sign in before following a forum post.");
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { data: existing, error: readError } = await supabase
      .from("forum_post_subscriptions")
      .select("status")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (readError) throw new Error(`Could not update the conversation: ${readError.message}`);
    const { error } = existing?.status === "following"
      ? await supabase.from("forum_post_subscriptions").delete().eq("post_id", postId).eq("user_id", user.id)
      : await supabase.from("forum_post_subscriptions").upsert({
          post_id: postId,
          user_id: user.id,
          status: "following",
          updated_at: new Date().toISOString(),
        });
    if (error) throw new Error(`Could not update the conversation: ${error.message}`);
    return { status: existing?.status === "following" ? "none" as const : "following" as const };
  }

  const store = await readLocalStore();
  if (!store.posts.some((post) => post.id === postId)) throw new Error("That forum post could not be found.");
  const userId = getLocalUserId(user);
  const index = store.subscriptions.findIndex(
    (subscription) => subscription.post_id === postId && subscription.user_id === userId,
  );
  if (index >= 0 && store.subscriptions[index].status === "following") {
    store.subscriptions.splice(index, 1);
    await writeLocalStore(store);
    return { status: "none" as const };
  }
  const now = new Date().toISOString();
  const next: LocalForumSubscription = {
    post_id: postId,
    user_id: userId,
    status: "following",
    created_at: index >= 0 ? store.subscriptions[index].created_at : now,
    updated_at: now,
  };
  if (index >= 0) store.subscriptions[index] = next;
  else store.subscriptions.push(next);
  await writeLocalStore(store);
  return { status: "following" as const };
}

export async function toggleForumPostMute(postId: string, user?: User | null) {
  if (isSupabaseConfigured()) {
    if (!user) throw new Error("Sign in before muting a forum post.");
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { data: existing, error: readError } = await supabase
      .from("forum_post_subscriptions")
      .select("status")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (readError) throw new Error(`Could not update notifications: ${readError.message}`);
    const nextStatus = existing?.status === "muted" ? "following" : "muted";
    const { error } = await supabase.from("forum_post_subscriptions").upsert({
      post_id: postId,
      user_id: user.id,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Could not update notifications: ${error.message}`);
    return { status: nextStatus as "following" | "muted" };
  }

  const store = await readLocalStore();
  if (!store.posts.some((post) => post.id === postId)) throw new Error("That forum post could not be found.");
  const userId = getLocalUserId(user);
  const index = store.subscriptions.findIndex(
    (subscription) => subscription.post_id === postId && subscription.user_id === userId,
  );
  const nextStatus = index >= 0 && store.subscriptions[index].status === "muted"
    ? "following"
    : "muted";
  const now = new Date().toISOString();
  const next: LocalForumSubscription = {
    post_id: postId,
    user_id: userId,
    status: nextStatus,
    created_at: index >= 0 ? store.subscriptions[index].created_at : now,
    updated_at: now,
  };
  if (index >= 0) store.subscriptions[index] = next;
  else store.subscriptions.push(next);
  await writeLocalStore(store);
  return { status: nextStatus };
}

export async function getSavedForumPosts(user?: User | null) {
  if (isSupabaseConfigured()) {
    if (!user) return [];
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { data, error } = await supabase
      .from("forum_saved_posts")
      .select("post_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(`Could not load saved posts: ${error.message}`);
    const postIds = (data ?? []).map((save) => save.post_id);
    return getSupabasePosts(undefined, user, undefined, postIds.length || 1, postIds);
  }

  return (await getForumPosts(undefined, user)).filter((post) => post.savedByCurrentUser);
}

export type {
  ForumActivityCommentModel,
  ForumCommentModel,
  ForumMentionModel,
  ForumPostModel,
  ForumSubscriptionStatus,
};
