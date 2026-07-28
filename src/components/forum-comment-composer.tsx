"use client";

import { MessageCircle } from "lucide-react";
import { useState } from "react";

type ForumCommentComposerProps = {
  action: (formData: FormData) => Promise<void>;
  postId: string;
};

export function ForumCommentComposer({ action, postId }: ForumCommentComposerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-expanded={open}
        className="comment-toggle"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <MessageCircle aria-hidden="true" size={16} />
        <span>{open ? "Close comment" : "Add comment"}</span>
      </button>
      {open ? (
        <form action={action} aria-label="Add a comment" className="inline-comment-form">
          <input name="postId" type="hidden" value={postId} />
          <label>
            <span className="sr-only">Comment</span>
            <textarea
              autoFocus
              maxLength={500}
              minLength={2}
              name="body"
              placeholder="Write a comment..."
              required
            />
          </label>
          <button type="submit">Post comment</button>
        </form>
      ) : null}
    </>
  );
}
