"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

type ForumPostOwnerMenuProps = {
  deleteAction: (formData: FormData) => Promise<void>;
  editHref: string;
  postId: string;
};

export function ForumPostOwnerMenu({
  deleteAction,
  editHref,
  postId,
}: ForumPostOwnerMenuProps) {
  return (
    <details className="forum-post-owner-menu">
      <summary aria-label="Post options" title="Post options">
        <MoreHorizontal aria-hidden="true" size={18} />
      </summary>
      <div>
        <Link href={editHref}>
          <Pencil aria-hidden="true" size={15} />
          Edit post
        </Link>
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (!window.confirm("Delete this post and all of its comments?")) {
              event.preventDefault();
            }
          }}
        >
          <input name="postId" type="hidden" value={postId} />
          <button type="submit">
            <Trash2 aria-hidden="true" size={15} />
            Delete post
          </button>
        </form>
      </div>
    </details>
  );
}
