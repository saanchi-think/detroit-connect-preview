import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { ShareButton } from "@/components/share-button";
import { getCurrentUser } from "@/lib/auth/user";
import { createForumCommentAction, createForumPostAction } from "@/lib/forum/actions";
import { getForumPosts } from "@/lib/forum/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const topicFilters = ["All", "Housing", "Schools", "Business", "Moving", "City Services"];

type ForumPageProps = {
  searchParams: Promise<{ topic?: string; error?: string; posted?: string; commented?: string }>;
};

export default async function ForumPage({ searchParams }: ForumPageProps) {
  const params = await searchParams;
  const activeTopic = topicFilters.includes(params.topic ?? "") ? params.topic! : "All";
  const [posts, user] = await Promise.all([getForumPosts(activeTopic), getCurrentUser()]);
  const needsSignIn = isSupabaseConfigured() && !user;

  return (
    <main className="forum-shell">
      <AppHeader />
      <section className="forum-hero" aria-labelledby="forum-title">
        <h1 id="forum-title">Ask & Answer</h1>
      </section>

      <section className="forum-layout" aria-label="Community forum">
        <nav className="forum-sidebar" aria-label="Forum topics">
          {topicFilters.map((topic) => (
            <Link
              className={`topic-filter ${activeTopic === topic ? "is-active" : ""}`}
              href={topic === "All" ? "/forum" : `/forum?topic=${encodeURIComponent(topic)}`}
              key={topic}
            >
              {topic}
            </Link>
          ))}
        </nav>

        <section className="feed-column">
          {needsSignIn ? (
            <section className="composer composer-sign-in" aria-label="Sign in to post">
              <strong>Join the conversation</strong>
              <Link href="/login?next=/forum">Sign in to post</Link>
            </section>
          ) : (
            <form className="composer" action={createForumPostAction} aria-label="Create a forum post">
              <div className="composer-avatar">DC</div>
              <div className="composer-title">
                <strong>Start a conversation</strong>
              </div>
              {params.error ? <div className="form-message is-error">{params.error}</div> : null}
              {params.posted === "1" ? <div className="form-message">Posted.</div> : null}
              <label>
                <span>Title</span>
                <input
                  maxLength={120}
                  minLength={5}
                  name="title"
                  placeholder="Example: Moving near Midtown in August"
                  required
                  type="text"
                />
              </label>
              <label>
                <span>Details</span>
                <textarea
                  maxLength={2000}
                  minLength={10}
                  name="body"
                  placeholder="What should neighbors know before they answer?"
                  required
                />
              </label>
              <div className="composer-actions">
                <select aria-label="Post topic" defaultValue="" name="topic" required>
                  <option disabled value="">Choose topic</option>
                  {topicFilters.slice(1).map((topic) => (
                    <option key={topic}>{topic}</option>
                  ))}
                </select>
                <button type="submit">Post request</button>
              </div>
            </form>
          )}

          {posts.map((post) => (
            <article className="forum-post" id={`post-${post.id}`} key={post.id}>
              <header>
                <span className={`avatar ${post.avatarClass}`}>{post.initials}</span>
                <div>
                  <strong>{post.name}</strong>
                  <small>{post.meta}</small>
                </div>
                <span className="topic-badge">{post.topic}</span>
              </header>
              <h2>{post.title}</h2>
              <p>{post.body}</p>
              <div className="post-actions">
                {needsSignIn ? (
                  <Link className="post-action-link" href={`/login?next=${encodeURIComponent(`/forum#post-${post.id}`)}`}>
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6.2A8 8 0 1 1 21 12Z" />
                    </svg>
                    <span>Comment</span>
                  </Link>
                ) : (
                  <details className="comment-control">
                    <summary>
                      <svg aria-hidden="true" viewBox="0 0 24 24">
                        <path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6.2A8 8 0 1 1 21 12Z" />
                      </svg>
                      <span>Comment</span>
                    </summary>
                    <form action={createForumCommentAction}>
                      <input name="postId" type="hidden" value={post.id} />
                      <label>
                        <span className="sr-only">Comment</span>
                        <textarea maxLength={500} minLength={2} name="body" placeholder="Add a helpful reply" required />
                      </label>
                      <button type="submit">Post</button>
                    </form>
                  </details>
                )}
                <ShareButton path={`/forum#post-${post.id}`} />
              </div>
              {post.commentName && post.comment ? (
                <div className="comment-preview">
                  <strong>{post.commentName}</strong>
                  <span>{post.comment}</span>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
