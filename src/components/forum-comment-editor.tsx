"use client";

import { useEffect, useState } from "react";
import { ForumRichText } from "@/components/forum-rich-text";
import { MentionTextarea } from "@/components/mention-textarea";
import type { ForumMentionModel } from "@/lib/forum/repository";

type ForumCommentEditorProps = {
  action: (formData: FormData) => Promise<void>;
  body: string;
  commentId: string;
  editableUntil: string;
  isEdited: boolean;
  mentions: ForumMentionModel[];
  postId: string;
};

export function ForumCommentEditor({
  action,
  body,
  commentId,
  editableUntil,
  isEdited,
  mentions,
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
        <p><ForumRichText mentions={mentions} text={body} /></p>
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
        <MentionTextarea
          defaultValue={body}
          label="Edit comment"
          maxLength={500}
          minLength={2}
          name="body"
          placeholder="Edit your comment"
          required
        />
      </label>
      <div>
        <button type="button" onClick={() => setEditing(false)}>Cancel</button>
        <button type="submit">Save</button>
      </div>
    </form>
  );
}
