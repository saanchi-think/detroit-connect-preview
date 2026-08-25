import Link from "next/link";
import { MentionTextarea } from "@/components/mention-textarea";
import type { ForumPostModel } from "@/lib/forum/repository";

type ForumPostEditorProps = {
  action: (formData: FormData) => Promise<void>;
  post: ForumPostModel;
  topics: string[];
};

export function ForumPostEditor({ action, post, topics }: ForumPostEditorProps) {
  return (
    <form action={action} className="forum-post-editor" aria-label={`Edit ${post.title}`}>
      <input name="postId" type="hidden" value={post.id} />
      <label>
        <span>Title</span>
        <input
          defaultValue={post.title}
          maxLength={120}
          minLength={5}
          name="title"
          required
          type="text"
        />
      </label>
      <label>
        <span>Details</span>
        <MentionTextarea
          defaultValue={post.body}
          label="Post details"
          maxLength={2000}
          minLength={10}
          name="body"
          placeholder="What should neighbors know before they answer?"
          required
        />
      </label>
      <div className="forum-post-editor-actions">
        <select aria-label="Post topic" defaultValue={post.topic} name="topic" required>
          {topics.map((topic) => <option key={topic}>{topic}</option>)}
        </select>
        <Link href={`/forum#post-${post.id}`}>Cancel</Link>
        <button type="submit">Save changes</button>
      </div>
    </form>
  );
}
