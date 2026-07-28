import { readFile } from "node:fs/promises";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { ConnectorProfileModel } from "@/lib/connectors/types";
import { getLocalDataPath, writeLocalJson } from "@/lib/local-data";
import {
  getLocalMemberIdsForProfile,
  getLocalProfileHref,
} from "@/lib/members/local-member-profiles";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

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
  comments: ForumCommentModel[];
  likeCount: number;
  likedByCurrentUser: boolean;
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

type LocalForumStore = {
  posts: LocalForumPost[];
  comments: LocalForumComment[];
  likes: LocalForumLike[];
};

type ForumPostRow = Database["public"]["Tables"]["forum_posts"]["Row"];
type ForumCommentRow = Database["public"]["Tables"]["forum_comments"]["Row"];
type PublicMemberRow = Database["public"]["Tables"]["public_member_profiles"]["Row"];
type ForumLikeRow = Database["public"]["Tables"]["forum_post_likes"]["Row"];

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

  return { posts, comments, likes: [] };
}

async function readLocalStore(): Promise<LocalForumStore> {
  try {
    const parsed = JSON.parse(await readFile(LOCAL_FORUM_PATH, "utf8")) as LocalForumStore | LocalForumPost[];
    return Array.isArray(parsed) ? legacyPostsToStore(parsed) : parsed;
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }

    const initialStore: LocalForumStore = { posts: defaultPosts, comments: defaultComments, likes: [] };
    await writeLocalStore(initialStore);
    return initialStore;
  }
}

async function writeLocalStore(store: LocalForumStore) {
  await writeLocalJson(LOCAL_FORUM_PATH, store);
}

function localPostToModel(post: LocalForumPost, store: LocalForumStore, user?: User | null): ForumPostModel {
  const comments = store.comments
    .filter((comment) => comment.post_id === post.id)
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
    .map((comment, index) => ({
      id: comment.id,
      parentId: comment.parent_comment_id,
      authorId: comment.author_id,
      initials: comment.initials ?? getInitials(comment.name),
      avatarClass: comment.avatar_class ?? avatarClasses[index % avatarClasses.length],
      name: comment.name,
      profileHref: getLocalProfileHref(comment.author_id, comment.name),
      body: comment.body,
      createdAt: comment.created_at,
      ...commentEditMetadata(
        comment.author_id,
        comment.created_at,
        comment.updated_at ?? comment.created_at,
        user,
      ),
    }));
  const likes = store.likes.filter((like) => like.post_id === post.id);
  const userId = getLocalUserId(user);

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
    comments,
    likeCount: likes.length,
    likedByCurrentUser: likes.some((like) => like.user_id === userId),
  };
}

async function getSupabasePosts(
  topic?: string,
  user?: User | null,
  authorId?: string | null,
): Promise<ForumPostModel[]> {
  const supabase = (await createClient()) as SupabaseClient<Database>;
  let postsQuery = supabase
    .from("forum_posts")
    .select("id, author_id, title, body, topic, image_urls, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(40);

  if (topic && topic !== "All") {
    postsQuery = postsQuery.eq("topic", topic);
  }
  if (authorId) {
    postsQuery = postsQuery.eq("author_id", authorId);
  }

  const { data: postData, error: postError } = await postsQuery;
  if (postError) {
    throw new Error(`Could not load forum posts: ${postError.message}`);
  }

  const posts = (postData ?? []) as ForumPostRow[];
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

  const comments = (commentData ?? []) as ForumCommentRow[];
  authorIds.push(...comments.flatMap((comment) => (comment.author_id ? [comment.author_id] : [])));
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

  return posts.map((post, index) => {
    const authorName = post.author_id ? (members.get(post.author_id) ?? "Detroit Connect member") : "Community member";
    const postComments = comments
      .filter((comment) => comment.post_id === post.id)
      .map((comment, commentIndex) => {
        const name = comment.author_id ? (members.get(comment.author_id) ?? "Community member") : "Community member";
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
      comments: postComments,
      likeCount: likes.length,
      likedByCurrentUser: Boolean(user && likes.some((like) => like.user_id === user.id)),
    };
  });
}

export async function getForumPosts(topic?: string, user?: User | null) {
  if (isSupabaseConfigured()) {
    return getSupabasePosts(topic, user);
  }

  const store = await readLocalStore();
  return store.posts
    .filter((post) => !topic || topic === "All" || post.topic === topic)
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .map((post) => localPostToModel(post, store, user));
}

export async function getForumPostsByProfile(
  profile: ConnectorProfileModel,
  user?: User | null,
  limit = 4,
) {
  if (isSupabaseConfigured()) {
    if (!profile.ownerId) return [];
    return (await getSupabasePosts(undefined, user, profile.ownerId)).slice(0, limit);
  }

  const store = await readLocalStore();
  const authorIds = new Set([
    ...getLocalMemberIdsForProfile(profile.id),
    ...(profile.ownerId ? [profile.ownerId] : []),
  ]);

  return store.posts
    .filter((post) => Boolean(post.author_id && authorIds.has(post.author_id)))
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, limit)
    .map((post) => localPostToModel(post, store, user));
}

export async function createForumPost(
  input: { title: string; body: string; topic: string; imageUrls?: string[] },
  user?: User | null,
) {
  if (isSupabaseConfigured()) {
    if (!user) throw new Error("Sign in before creating a forum post.");
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { error } = await supabase.from("forum_posts").insert({
      author_id: user.id,
      title: input.title,
      body: input.body,
      topic: input.topic,
      image_urls: input.imageUrls ?? [],
    });
    if (error) throw new Error(`Could not publish the forum post: ${error.message}`);
    return { mode: "supabase" as const };
  }

  const store = await readLocalStore();
  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "You";
  const record: LocalForumPost = {
    id: crypto.randomUUID(), author_id: getLocalUserId(user), initials: getInitials(name), avatar_class: "avatar-blue",
    name,
    topic: input.topic,
    title: input.title,
    body: input.body,
    image_urls: input.imageUrls ?? [],
    created_at: new Date().toISOString(),
  };
  store.posts.unshift(record);
  await writeLocalStore(store);
  return { mode: "local" as const };
}

export async function createForumComment(
  input: { postId: string; body: string; parentCommentId?: string | null },
  user?: User | null,
) {
  if (isSupabaseConfigured()) {
    if (!user) throw new Error("Sign in before commenting.");
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { error } = await supabase.from("forum_comments").insert({
      post_id: input.postId, author_id: user.id, body: input.body, parent_comment_id: input.parentCommentId ?? null,
    });
    if (error) throw new Error(`Could not publish the comment: ${error.message}`);
    return { mode: "supabase" as const };
  }

  const store = await readLocalStore();
  if (!store.posts.some((post) => post.id === input.postId)) throw new Error("That forum post could not be found.");
  if (input.parentCommentId && !store.comments.some((comment) => comment.id === input.parentCommentId && comment.post_id === input.postId)) {
    throw new Error("That comment is no longer available to reply to.");
  }
  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "You";
  store.comments.push({
    id: crypto.randomUUID(), post_id: input.postId, parent_comment_id: input.parentCommentId ?? null,
    author_id: getLocalUserId(user), name, initials: getInitials(name), avatar_class: "avatar-blue",
    body: input.body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  await writeLocalStore(store);
  return { mode: "local" as const };
}

export async function updateForumComment(
  input: { commentId: string; postId: string; body: string },
  user?: User | null,
) {
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

export type { ForumCommentModel, ForumPostModel };
