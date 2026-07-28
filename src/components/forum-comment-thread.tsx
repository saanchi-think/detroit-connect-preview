import Link from "next/link";
import { ForumCommentEditor } from "@/components/forum-comment-editor";
import { createForumCommentAction, editForumCommentAction } from "@/lib/forum/actions";
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
            </div>
            {comment.canEdit ? (
              <ForumCommentEditor
                action={editForumCommentAction}
                body={comment.body}
                commentId={comment.id}
                editableUntil={comment.editableUntil}
                isEdited={comment.updatedAt !== comment.createdAt}
                postId={postId}
              />
            ) : (
              <>
                <p>{comment.body}</p>
                {comment.updatedAt !== comment.createdAt ? <span className="forum-comment-edited">Edited</span> : null}
              </>
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
                    <textarea maxLength={500} minLength={2} name="body" placeholder={`Reply to ${comment.name}`} required />
                  </label>
                  <button type="submit">Post reply</button>
                </form>
              </details>
            )}
            <ForumCommentThread comments={comments} needsSignIn={needsSignIn} parentId={comment.id} postId={postId} />
          </div>
        </article>
      ))}
    </div>
  );
}
