import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type ForumPostModel = {
  id: string;
  initials: string;
  avatarClass: string;
  name: string;
  meta: string;
  topic: string;
  title: string;
  body: string;
  commentName: string | null;
  comment: string | null;
};

type LocalForumPost = ForumPostModel & {
  author_id: string;
  created_at: string;
};

type ForumPostRow = Database["public"]["Tables"]["forum_posts"]["Row"];
type ForumCommentRow = Database["public"]["Tables"]["forum_comments"]["Row"];
type PublicMemberRow = Database["public"]["Tables"]["public_member_profiles"]["Row"];

const LOCAL_FORUM_PATH = path.join(process.cwd(), "data", "local-dev-forum.json");
const LOCAL_DEV_USER_ID = "local-dev-user";
const avatarClasses = ["avatar-blue", "avatar-gold", "avatar-coral"];

const defaultPosts: LocalForumPost[] = [
  {
    id: "local-forum-housing",
    author_id: "local-maria",
    initials: "MR",
    avatarClass: "avatar-blue",
    name: "Maria Rodriguez",
    meta: "Southwest Detroit connector · 12 min ago",
    topic: "Housing",
    title: "Looking for renter-friendly neighborhoods near reliable transit",
    body: "My sister is moving to Detroit for a healthcare job. She wants a quiet place, transit access, and grocery options nearby. What areas should she compare first?",
    commentName: "Jalen P.",
    comment: "Woodbridge and New Center are worth comparing if she wants Midtown access without being directly downtown.",
    created_at: "2026-07-20T13:48:00.000Z",
  },
  {
    id: "local-forum-business",
    author_id: "local-amara",
    initials: "AK",
    avatarClass: "avatar-gold",
    name: "Amara King",
    meta: "Small business mentor · 34 min ago",
    topic: "Business",
    title: "Who helps new food businesses understand Detroit permits?",
    body: "I’m helping a friend test a pop-up concept. We need plain-English guidance on licensing, inspections, shared kitchens, and neighborhood events.",
    commentName: "Nina S.",
    comment: "Eastern Market has good small business programming. I can share two contacts.",
    created_at: "2026-07-20T13:26:00.000Z",
  },
  {
    id: "local-forum-moving",
    author_id: "local-devon",
    initials: "DT",
    avatarClass: "avatar-coral",
    name: "Devon Taylor",
    meta: "New to Detroit · 1 hr ago",
    topic: "Moving",
    title: "Moving checklist for the first two weeks?",
    body: "What should I do first after arriving: utilities, parking, license updates, doctors, neighborhood groups, or something else I’m missing?",
    commentName: "Priya M.",
    comment: "Start with utilities and parking, then join your neighborhood association list.",
    created_at: "2026-07-20T13:00:00.000Z",
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

async function readLocalPosts() {
  try {
    return JSON.parse(await readFile(LOCAL_FORUM_PATH, "utf8")) as LocalForumPost[];
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }

    await writeLocalPosts(defaultPosts);
    return defaultPosts;
  }
}

async function writeLocalPosts(posts: LocalForumPost[]) {
  await mkdir(path.dirname(LOCAL_FORUM_PATH), { recursive: true });
  await writeFile(LOCAL_FORUM_PATH, `${JSON.stringify(posts, null, 2)}\n`, "utf8");
}

async function getSupabasePosts(topic?: string): Promise<ForumPostModel[]> {
  const supabase = (await createClient()) as SupabaseClient<Database>;
  let postsQuery = supabase
    .from("forum_posts")
    .select("id, author_id, title, body, topic, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(40);

  if (topic && topic !== "All") {
    postsQuery = postsQuery.eq("topic", topic);
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
        .select("id, post_id, author_id, body, created_at")
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

  const members = new Map(
    ((memberData ?? []) as PublicMemberRow[]).map((member) => [member.id, member.display_name]),
  );
  const firstCommentByPost = new Map<string, ForumCommentRow>();

  comments.forEach((comment) => {
    if (!firstCommentByPost.has(comment.post_id)) {
      firstCommentByPost.set(comment.post_id, comment);
    }
  });

  return posts.map((post, index) => {
    const authorName = post.author_id ? (members.get(post.author_id) ?? "Detroit Connect member") : "Community member";
    const comment = firstCommentByPost.get(post.id);
    const commentName = comment?.author_id ? (members.get(comment.author_id) ?? "Community member") : null;

    return {
      id: post.id,
      initials: getInitials(authorName),
      avatarClass: avatarClasses[index % avatarClasses.length],
      name: authorName,
      meta: formatPostTime(post.created_at),
      topic: post.topic,
      title: post.title,
      body: post.body,
      commentName,
      comment: comment?.body ?? null,
    };
  });
}

export async function getForumPosts(topic?: string) {
  if (isSupabaseConfigured()) {
    return getSupabasePosts(topic);
  }

  const posts = await readLocalPosts();
  return posts.filter((post) => !topic || topic === "All" || post.topic === topic);
}

export async function createForumPost(
  input: { title: string; body: string; topic: string },
  user?: User | null,
) {
  if (isSupabaseConfigured()) {
    if (!user) {
      throw new Error("Sign in before creating a forum post.");
    }

    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { error } = await supabase.from("forum_posts").insert({
      author_id: user.id,
      title: input.title,
      body: input.body,
      topic: input.topic,
    });

    if (error) {
      throw new Error(`Could not publish the forum post: ${error.message}`);
    }

    return { mode: "supabase" as const };
  }

  const posts = await readLocalPosts();
  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "You";
  const createdAt = new Date().toISOString();
  const record: LocalForumPost = {
    id: crypto.randomUUID(),
    author_id: user?.id ?? LOCAL_DEV_USER_ID,
    initials: getInitials(name),
    avatarClass: "avatar-blue",
    name,
    meta: "Just now",
    topic: input.topic,
    title: input.title,
    body: input.body,
    commentName: null,
    comment: null,
    created_at: createdAt,
  };

  await writeLocalPosts([record, ...posts]);
  return { mode: "local" as const };
}

export async function createForumComment(postId: string, body: string, user?: User | null) {
  if (isSupabaseConfigured()) {
    if (!user) {
      throw new Error("Sign in before commenting.");
    }

    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { error } = await supabase.from("forum_comments").insert({
      post_id: postId,
      author_id: user.id,
      body,
    });

    if (error) {
      throw new Error(`Could not publish the comment: ${error.message}`);
    }

    return { mode: "supabase" as const };
  }

  const posts = await readLocalPosts();
  const postIndex = posts.findIndex((post) => post.id === postId);

  if (postIndex < 0) {
    throw new Error("That forum post could not be found.");
  }

  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "You";
  posts[postIndex] = { ...posts[postIndex], commentName: name, comment: body };
  await writeLocalPosts(posts);
  return { mode: "local" as const };
}

export type { ForumPostModel };
