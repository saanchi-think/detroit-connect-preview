import { Bookmark, FileText, MessageCircle, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/lib/auth/user";
import {
  LOCAL_DEMO_USER_ID,
  getConnectorProfileById,
  getOwnedConnectorProfileId,
} from "@/lib/connectors/repository";
import {
  getForumCommentsByCurrentUser,
  getForumPostsByProfile,
  getSavedForumPosts,
  type ForumPostModel,
} from "@/lib/forum/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

type ActivityView = "posts" | "comments" | "saved";

type ProfileActivityPageProps = {
  searchParams: Promise<{ view?: string }>;
};

const activityTabs = [
  { id: "posts", label: "Posts", icon: FileText },
  { id: "comments", label: "Comments", icon: MessagesSquare },
  { id: "saved", label: "Saved posts", icon: Bookmark },
] as const;

function activityView(value?: string): ActivityView {
  return activityTabs.some((tab) => tab.id === value) ? (value as ActivityView) : "posts";
}

function activityDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function ActivityPostList({ posts, saved = false }: { posts: ForumPostModel[]; saved?: boolean }) {
  return (
    <div className="profile-activity-list">
      {posts.map((post) => (
        <article className="profile-activity-card" key={post.id}>
          <div className="profile-activity-card-topline">
            <span className="topic-badge">{post.topic}</span>
            <time dateTime={post.createdAt}>{activityDate(post.createdAt)}</time>
          </div>
          <Link href={`/forum#post-${post.id}`}>
            <h2>{post.title}</h2>
          </Link>
          <p>{post.body}</p>
          <footer>
            {saved ? <span>Posted by {post.name}</span> : <span>{post.comments.length} {post.comments.length === 1 ? "comment" : "comments"}</span>}
            <Link href={`/forum#post-${post.id}`}>Open discussion</Link>
          </footer>
        </article>
      ))}
    </div>
  );
}

function ActivityEmpty({ children }: { children: string }) {
  return (
    <div className="profile-activity-empty">
      <MessageCircle aria-hidden="true" size={21} />
      <p>{children}</p>
      <Link href="/forum">Browse Community Forum</Link>
    </div>
  );
}

export default async function ProfileActivityPage({ searchParams }: ProfileActivityPageProps) {
  const [{ view }, user] = await Promise.all([searchParams, getCurrentUser()]);
  if (isSupabaseConfigured() && !user) redirect("/login?next=/profile/activity");

  const profileId = await getOwnedConnectorProfileId(user?.id ?? LOCAL_DEMO_USER_ID);
  if (!profileId) redirect("/create-profile");
  const profile = await getConnectorProfileById(profileId);
  if (!profile) redirect("/create-profile");

  const [posts, comments, savedPosts] = await Promise.all([
    getForumPostsByProfile(profile, user, 100),
    getForumCommentsByCurrentUser(user, 100),
    getSavedForumPosts(user),
  ]);
  const activeView = activityView(view);
  const counts: Record<ActivityView, number> = {
    posts: posts.length,
    comments: comments.length,
    saved: savedPosts.length,
  };

  return (
    <main className="page-shell profile-activity-page">
      <AppHeader />
      <section className="page-hero compact profile-activity-hero">
        <div>
          <Link href="/profile">Back to profile</Link>
          <h1>Your activity</h1>
        </div>
        <Link className="profile-activity-forum-link" href="/forum">Community Forum</Link>
      </section>

      <nav aria-label="Your forum activity" className="profile-activity-tabs" role="tablist">
        {activityTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              aria-selected={activeView === tab.id}
              className={activeView === tab.id ? "is-active" : undefined}
              href={tab.id === "posts" ? "/profile/activity" : `/profile/activity?view=${tab.id}`}
              key={tab.id}
              role="tab"
            >
              <Icon aria-hidden="true" size={17} />
              <span>{tab.label}</span>
              <strong>{counts[tab.id]}</strong>
            </Link>
          );
        })}
      </nav>

      <section className="profile-activity-panel" role="tabpanel">
        {activeView === "posts" ? (
          posts.length > 0 ? <ActivityPostList posts={posts} /> : <ActivityEmpty>You have not posted yet.</ActivityEmpty>
        ) : null}

        {activeView === "comments" ? (
          comments.length > 0 ? (
            <div className="profile-activity-list">
              {comments.map((comment) => (
                <article className="profile-activity-card is-comment" key={comment.id}>
                  <div className="profile-activity-card-topline">
                    <span className="topic-badge">{comment.postTopic}</span>
                    <time dateTime={comment.createdAt}>{activityDate(comment.createdAt)}</time>
                  </div>
                  <small>{comment.parentId ? "Replied in" : "Commented on"}</small>
                  <Link href={`/forum#comment-${comment.id}`}><h2>{comment.postTitle}</h2></Link>
                  <blockquote>{comment.body}</blockquote>
                  <footer><span>Your comment</span><Link href={`/forum#comment-${comment.id}`}>Open discussion</Link></footer>
                </article>
              ))}
            </div>
          ) : <ActivityEmpty>You have not commented yet.</ActivityEmpty>
        ) : null}

        {activeView === "saved" ? (
          savedPosts.length > 0 ? <ActivityPostList posts={savedPosts} saved /> : <ActivityEmpty>You have not saved any discussions yet.</ActivityEmpty>
        ) : null}
      </section>
    </main>
  );
}
