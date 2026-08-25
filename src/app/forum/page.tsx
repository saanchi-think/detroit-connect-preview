import Link from "next/link";
import Image from "next/image";
import { BellOff, BellPlus, BellRing, Bookmark, BookmarkCheck, MessageCircle } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { ForumCommentComposer } from "@/components/forum-comment-composer";
import { ForumCommentThread } from "@/components/forum-comment-thread";
import { ForumPostComposer } from "@/components/forum-post-composer";
import { ForumPostEditor } from "@/components/forum-post-editor";
import { ForumPostOwnerMenu } from "@/components/forum-post-owner-menu";
import { ForumRichText } from "@/components/forum-rich-text";
import { ShareButton } from "@/components/share-button";
import { ReportContentMenu } from "@/components/report-content-menu";
import { getCurrentUser } from "@/lib/auth/user";
import {
  createForumCommentAction,
  createForumPostAction,
  deleteForumPostAction,
  editForumPostAction,
  toggleForumPostFollowAction,
  toggleForumPostLikeAction,
  toggleForumPostMuteAction,
  toggleForumPostSaveAction,
} from "@/lib/forum/actions";
import { getForumPosts, getForumPostsForCurrentUser } from "@/lib/forum/repository";
import { getFriendsDashboard } from "@/lib/friends/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const forumTopics = ["Business", "City Services", "Housing", "Moving", "Schools"];
const topicFilters = ["All", ...forumTopics];

type ForumPageProps = {
  searchParams: Promise<{
    topic?: string;
    error?: string;
    posted?: string;
    commented?: string;
    deleted?: string;
    edit?: string;
    reported?: string;
    safetyError?: string;
    updated?: string;
    view?: string;
  }>;
};

export default async function ForumPage({ searchParams }: ForumPageProps) {
  const params = await searchParams;
  const activeTopic = topicFilters.includes(params.topic ?? "") ? params.topic! : "All";
  const user = await getCurrentUser();
  const needsSignIn = isSupabaseConfigured() && !user;
  const activeActivity = params.view === "mine" || params.view === "commented" ? params.view : null;
  const posts = activeActivity
    ? await getForumPostsForCurrentUser(activeActivity === "mine" ? "posts" : "commented", activeTopic, user)
    : await getForumPosts(activeTopic, user);
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
          <div className="forum-activity-filters">
            <span>Your activity</span>
            <Link className={activeActivity === "mine" ? "topic-filter is-active" : "topic-filter"} href="/forum?view=mine">
              My posts
            </Link>
            <Link className={activeActivity === "commented" ? "topic-filter is-active" : "topic-filter"} href="/forum?view=commented">
              Posts I commented on
            </Link>
          </div>
          <span className="forum-filter-label">Topics</span>
          {topicFilters.map((topic) => (
            <Link
              className={`topic-filter ${!activeActivity && activeTopic === topic ? "is-active" : ""}`}
              href={topic === "All" ? "/forum" : `/forum?topic=${encodeURIComponent(topic)}`}
              key={topic}
            >
              {topic}
            </Link>
          ))}
        </nav>

        <section className="feed-column">
          {params.reported === "1" ? (
            <div className="page-notice" role="status">Report submitted for review.</div>
          ) : null}
          {params.safetyError ? (
            <div className="page-notice is-error" role="alert">{params.safetyError}</div>
          ) : null}
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
              topics={forumTopics}
            />
          )}

          {posts.length === 0 ? (
            <div className="forum-activity-empty">
              <MessageCircle aria-hidden="true" size={20} />
              <strong>{activeActivity === "mine" ? "No posts yet" : activeActivity === "commented" ? "No commented discussions yet" : "No discussions found"}</strong>
              <p>{activeActivity ? "Your forum activity will appear here." : "Try another topic."}</p>
            </div>
          ) : null}

          {posts.map((post) => (
            <article className="forum-post" id={`post-${post.id}`} key={post.id}>
              <header>
                <span className={`avatar ${post.avatarClass}`}>{post.initials}</span>
                <div>
                  {post.profileHref ? <Link className="forum-profile-link" href={post.profileHref}>{post.name}</Link> : <strong>{post.name}</strong>}
                  <small>{post.meta}{post.updatedAt !== post.createdAt ? " · Edited" : ""}</small>
                </div>
                <div className="forum-post-header-tools">
                  <span className="topic-badge">{post.topic}</span>
                  {!needsSignIn ? (
                    <>
                      <form action={toggleForumPostSaveAction}>
                        <input name="postId" type="hidden" value={post.id} />
                        <input name="returnTo" type="hidden" value={`/forum#post-${post.id}`} />
                        <button
                          aria-label={post.savedByCurrentUser ? "Remove discussion bookmark" : "Bookmark discussion"}
                          className={post.savedByCurrentUser ? "is-active" : ""}
                          title={post.savedByCurrentUser ? "Saved" : "Save post"}
                          type="submit"
                        >
                          {post.savedByCurrentUser
                            ? <BookmarkCheck aria-hidden="true" size={17} />
                            : <Bookmark aria-hidden="true" size={17} />}
                        </button>
                      </form>
                      {post.subscriptionStatus === "none" ? (
                        <form action={toggleForumPostFollowAction}>
                          <input name="postId" type="hidden" value={post.id} />
                          <input name="returnTo" type="hidden" value={`/forum#post-${post.id}`} />
                          <button aria-label="Follow conversation" title="Follow conversation" type="submit">
                            <BellPlus aria-hidden="true" size={17} />
                          </button>
                        </form>
                      ) : post.subscriptionStatus === "following" ? (
                        <>
                          <form action={toggleForumPostFollowAction}>
                            <input name="postId" type="hidden" value={post.id} />
                            <input name="returnTo" type="hidden" value={`/forum#post-${post.id}`} />
                            <button
                              aria-label="Unfollow conversation"
                              className="is-active"
                              title="Following"
                              type="submit"
                            >
                              <BellRing aria-hidden="true" size={17} />
                            </button>
                          </form>
                          <form action={toggleForumPostMuteAction}>
                            <input name="postId" type="hidden" value={post.id} />
                            <input name="returnTo" type="hidden" value={`/forum#post-${post.id}`} />
                            <button aria-label="Mute conversation" title="Mute notifications" type="submit">
                              <BellOff aria-hidden="true" size={17} />
                            </button>
                          </form>
                        </>
                      ) : (
                        <form action={toggleForumPostMuteAction}>
                          <input name="postId" type="hidden" value={post.id} />
                          <input name="returnTo" type="hidden" value={`/forum#post-${post.id}`} />
                          <button
                            aria-label="Resume conversation notifications"
                            className="is-muted"
                            title="Notifications muted"
                            type="submit"
                          >
                            <BellOff aria-hidden="true" size={17} />
                          </button>
                        </form>
                      )}
                      {post.canManage ? (
                        <ForumPostOwnerMenu
                          deleteAction={deleteForumPostAction}
                          editHref={`/forum?edit=${encodeURIComponent(post.id)}#post-${post.id}`}
                          postId={post.id}
                        />
                      ) : !needsSignIn ? (
                        <ReportContentMenu
                          reportedUserId={post.authorId}
                          returnTo={`/forum#post-${post.id}`}
                          targetId={post.id}
                          targetType="post"
                          trigger="overflow"
                        />
                      ) : null}
                    </>
                  ) : null}
                </div>
              </header>
              {post.canManage && params.edit === post.id ? (
                <ForumPostEditor action={editForumPostAction} post={post} topics={forumTopics} />
              ) : (
                <>
                  <h2>{post.title}</h2>
                  <p><ForumRichText mentions={post.mentions} text={post.body} /></p>
                </>
              )}
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
                      <svg aria-hidden="true" viewBox="0 0 24 24"><path fill={post.likedByCurrentUser ? "currentColor" : "none"} d="m12 21-1.7-1.6C5.2 14.8 2 11.9 2 8.3 2 5.4 4.3 3 7.2 3c1.6 0 3.2.8 4.2 2.1C12.5 3.8 14 3 15.8 3 18.7 3 21 5.4 21 8.3c0 3.6-3.2 6.5-8.3 11.1L12 21Z" /></svg>
                      <span>{post.likedByCurrentUser ? "Liked" : "Like"}{post.likeCount > 0 ? ` ${post.likeCount}` : ""}</span>
                    </button>
                  </form>
                )}
                {needsSignIn ? (
                  <Link className="post-action-link comment-action-link" href={`/login?next=${encodeURIComponent(`/forum#post-${post.id}`)}`}>
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6.2A8 8 0 1 1 21 12Z" />
                    </svg>
                    <span>Comment</span>
                  </Link>
                ) : (
                  <ForumCommentComposer action={createForumCommentAction} postId={post.id} />
                )}
                <ShareButton friends={shareFriends} path={`/forum#post-${post.id}`} title={post.title} />
              </div>
              {post.comments.length > 0 ? (
                <ForumCommentThread
                  comments={post.comments}
                  needsSignIn={needsSignIn}
                  postId={post.id}
                />
              ) : null}
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
