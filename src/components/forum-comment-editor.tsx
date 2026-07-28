"use client";

import { useEffect, useState } from "react";

type ForumCommentEditorProps = {
  action: (formData: FormData) => Promise<void>;
  body: string;
  commentId: string;
  editableUntil: string;
  isEdited: boolean;
  postId: string;
};

export function ForumCommentEditor({
  action,
  body,
  commentId,
  editableUntil,
  isEdited,
  postId,
}: ForumCommentEditorProps) {
  const [editing, setEditing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const deadline = new Date(editableUntil).getTime();
  const canEdit = Number.isFinite(deadline) && now < deadline;

  useEffect(() => {
    if (!canEdit) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [canEdit]);

  if (!editing) {
    return (
      <>
        <p>{body}</p>
        <div className="forum-comment-meta-actions">
          {isEdited ? <span>Edited</span> : null}
          {canEdit ? <button onClick={() => setEditing(true)} type="button">Edit</button> : null}
        </div>
      </>
    );
  }

  return (
    <form action={action} className="forum-comment-edit-form">
      <input name="commentId" type="hidden" value={commentId} />
      <input name="postId" type="hidden" value={postId} />
      <label>
        <span className="sr-only">Edit comment</span>
        <textarea defaultValue={body} maxLength={500} minLength={2} name="body" required />
      </label>
      <div>
        <button type="button" onClick={() => setEditing(false)}>Cancel</button>
        <button type="submit">Save</button>
      </div>
    </form>
  );
}
