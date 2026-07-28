import Link from "next/link";
import Image from "next/image";
import { AppHeader } from "@/components/app-header";
import { ForumCommentComposer } from "@/components/forum-comment-composer";
import { ForumCommentThread } from "@/components/forum-comment-thread";
import { ForumPostComposer } from "@/components/forum-post-composer";
import { ShareButton } from "@/components/share-button";
import { getCurrentUser } from "@/lib/auth/user";
import { createForumCommentAction, createForumPostAction, toggleForumPostLikeAction } from "@/lib/forum/actions";
import { getForumPosts } from "@/lib/forum/repository";
import { getFriendsDashboard } from "@/lib/friends/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const topicFilters = ["All", "Housing", "Schools", "Business", "Moving", "City Services"];

type ForumPageProps = {
  searchParams: Promise<{ topic?: string; error?: string; posted?: string; commented?: string }>;
};

export default async function ForumPage({ searchParams }: ForumPageProps) {
  const params = await searchParams;
  const activeTopic = topicFilters.includes(params.topic ?? "") ? params.topic! : "All";
  const user = await getCurrentUser();
  const posts = await getForumPosts(activeTopic, user);
  const needsSignIn = isSupabaseConfigured() && !user;
  const friends = needsSignIn ? [] : (await getFriendsDashboard(user)).friends;
  const shareFriends = friends.map(({ id, initials, name, profileHref }) => ({
    id,
    initials,
    name,
    profileHref,
  }));

  return (
    <main className="forum-shell">
      <AppHeader />
      <section className="forum-hero" aria-labelledby="forum-title">
        <h1 id="forum-title">Ask & Answer</h1>
      </section>

      <section className="forum-layout" aria-label="Community forum">
        <nav className="forum-sidebar" aria-label="Forum topics">
          <div className="forum-filter-heading">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            <strong>Filter posts</strong>
          </div>
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
            <ForumPostComposer
              action={createForumPostAction}
              error={params.error}
              posted={params.posted === "1"}
              topics={topicFilters.slice(1)}
            />
          )}

          {posts.map((post) => (
            <article className="forum-post" id={`post-${post.id}`} key={post.id}>
              <header>
                <span className={`avatar ${post.avatarClass}`}>{post.initials}</span>
                <div>
                  {post.profileHref ? <Link className="forum-profile-link" href={post.profileHref}>{post.name}</Link> : <strong>{post.name}</strong>}
                  <small>{post.meta}</small>
                </div>
                <span className="topic-badge">{post.topic}</span>
              </header>
              <h2>{post.title}</h2>
              <p>{post.body}</p>
              {post.imageUrls.length > 0 ? (
                <div className={`forum-post-images is-${post.imageUrls.length}`}>
                  {post.imageUrls.map((imageUrl, index) => (
                    <div className="forum-post-image" key={imageUrl}>
                      <Image
                        alt={`Image ${index + 1} of ${post.imageUrls.length} for ${post.title}`}
                        fill
                        sizes={post.imageUrls.length === 1 ? "(max-width: 760px) 100vw, 620px" : "(max-width: 760px) 50vw, 310px"}
                        src={imageUrl}
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="post-actions">
                {needsSignIn ? (
                  <Link className="post-action-link like-control" href={`/login?next=${encodeURIComponent(`/forum#post-${post.id}`)}`}>
                    <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m12 21-1.7-1.6C5.2 14.8 2 11.9 2 8.3 2 5.4 4.3 3 7.2 3c1.6 0 3.2.8 4.2 2.1C12.5 3.8 14 3 15.8 3 18.7 3 21 5.4 21 8.3c0 3.6-3.2 6.5-8.3 11.1L12 21Z" /></svg>
                    <span>Like {post.likeCount > 0 ? post.likeCount : ""}</span>
                  </Link>
                ) : (
                  <form action={toggleForumPostLikeAction} className="like-control">
                    <input name="postId" type="hidden" value={post.id} />
                    <button className={post.likedByCurrentUser ? "is-liked" : ""} type="submit">
                      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m12 21-1.7-1.6C5.2 14.8 2 11.9 2 8.3 2 5.4 4.3 3 7.2 3c1.6 0 3.2.8 4.2 2.1C12.5 3.8 14 3 15.8 3 18.7 3 21 5.4 21 8.3c0 3.6-3.2 6.5-8.3 11.1L12 21Z" /></svg>
                      <span>{post.likedByCurrentUser ? "Liked" : "Like"}{post.likeCount > 0 ? ` ${post.likeCount}` : ""}</span>
                    </button>
                  </form>
                )}
                {needsSignIn ? (
                  <Link className="post-action-link comment-action-link" href={`/login?next=${encodeURIComponent(`/forum#post-${post.id}`)}`}>
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6.2A8 8 0 1 1 21 12Z" />
                    </svg>
                    <span>Add comment</span>
                  </Link>
                ) : (
                  <ForumCommentComposer action={createForumCommentAction} postId={post.id} />
                )}
                <ShareButton friends={shareFriends} path={`/forum#post-${post.id}`} title={post.title} />
              </div>
              {post.comments.length > 0 ? <ForumCommentThread comments={post.comments} needsSignIn={needsSignIn} postId={post.id} /> : null}
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
