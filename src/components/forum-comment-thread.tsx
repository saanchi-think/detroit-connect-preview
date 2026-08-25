import { Heart } from "lucide-react";
import Link from "next/link";
import { ForumCommentEditor } from "@/components/forum-comment-editor";
import { ForumRichText } from "@/components/forum-rich-text";
import { MentionTextarea } from "@/components/mention-textarea";
import { ReportContentMenu } from "@/components/report-content-menu";
import {
  createForumCommentAction,
  editForumCommentAction,
  toggleForumCommentLikeAction,
} from "@/lib/forum/actions";
import type { ForumCommentModel } from "@/lib/forum/repository";

type ForumCommentThreadProps = {
  comments: ForumCommentModel[];
  postId: string;
  needsSignIn: boolean;
  parentId?: string | null;
};

function CommentAuthor({ comment }: { comment: ForumCommentModel }) {
  const content = <strong>{comment.name}</strong>;
  return comment.profileHref ? <Link href={comment.profileHref}>{content}</Link> : content;
}

export function ForumCommentThread({ comments, postId, needsSignIn, parentId = null }: ForumCommentThreadProps) {
  const children = comments.filter((comment) => comment.parentId === parentId);

  if (children.length === 0) return null;

  return (
    <div className={parentId ? "forum-comment-children" : "forum-comment-list"}>
      {children.map((comment) => (
        <article className="forum-comment" id={`comment-${comment.id}`} key={comment.id}>
          <span className={`avatar forum-comment-avatar ${comment.avatarClass}`}>{comment.initials}</span>
          <div className="forum-comment-copy">
            <div className="forum-comment-byline">
              <CommentAuthor comment={comment} />
              <time dateTime={comment.createdAt}>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(comment.createdAt))}</time>
              {!needsSignIn ? (
                <ReportContentMenu
                  reportedUserId={comment.authorId}
                  returnTo={`/forum#comment-${comment.id}`}
                  targetId={comment.id}
                  targetType="comment"
                  trigger="overflow"
                />
              ) : null}
            </div>
            {comment.canEdit ? (
              <ForumCommentEditor
                action={editForumCommentAction}
                body={comment.body}
                commentId={comment.id}
                editableUntil={comment.editableUntil}
                isEdited={comment.updatedAt !== comment.createdAt}
                mentions={comment.mentions}
                postId={postId}
              />
            ) : (
              <>
                <p><ForumRichText mentions={comment.mentions} text={comment.body} /></p>
                {comment.updatedAt !== comment.createdAt ? <span className="forum-comment-edited">Edited</span> : null}
              </>
            )}
            <div className="forum-comment-actions">
              {needsSignIn ? (
                <Link className="forum-comment-like-link" href={`/login?next=${encodeURIComponent(`/forum#comment-${comment.id}`)}`}>
                  <Heart aria-hidden="true" size={14} />
                  Like{comment.likeCount > 0 ? ` ${comment.likeCount}` : ""}
                </Link>
              ) : (
                <form action={toggleForumCommentLikeAction} className="forum-comment-like-control">
                  <input name="commentId" type="hidden" value={comment.id} />
                  <button aria-pressed={comment.likedByCurrentUser} className={comment.likedByCurrentUser ? "is-liked" : ""} type="submit">
                    <Heart aria-hidden="true" fill={comment.likedByCurrentUser ? "currentColor" : "none"} size={14} />
                    {comment.likedByCurrentUser ? "Liked" : "Like"}{comment.likeCount > 0 ? ` ${comment.likeCount}` : ""}
                  </button>
                </form>
              )}
              {needsSignIn ? (
                <Link className="forum-reply-link" href={`/login?next=${encodeURIComponent(`/forum#comment-${comment.id}`)}`}>
                  Reply in thread
                </Link>
              ) : (
                <details className="forum-reply-control">
                  <summary>Reply in thread</summary>
                  <form action={createForumCommentAction}>
                    <input name="postId" type="hidden" value={postId} />
                    <input name="parentCommentId" type="hidden" value={comment.id} />
                    <label>
                      <span className="sr-only">Reply to {comment.name}</span>
                      <MentionTextarea
                        label={`Reply to ${comment.name}`}
                        maxLength={500}
                        minLength={2}
                        name="body"
                        placeholder={`Reply to ${comment.name}`}
                        required
                      />
                    </label>
                    <button type="submit">Post reply</button>
                  </form>
                </details>
              )}
            </div>
            <ForumCommentThread comments={comments} needsSignIn={needsSignIn} parentId={comment.id} postId={postId} />
          </div>
        </article>
      ))}
    </div>
  );
}
