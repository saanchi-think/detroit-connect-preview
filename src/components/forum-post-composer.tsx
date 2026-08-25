"use client";

import { Eye, ImagePlus, Send, ShieldCheck, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  FORUM_IMAGE_ACCEPT,
  MAX_FORUM_IMAGE_BYTES,
  MAX_FORUM_IMAGE_COUNT,
} from "@/lib/forum/image-constants";
import { MentionTextarea } from "@/components/mention-textarea";

type ForumPostComposerProps = {
  action: (formData: FormData) => Promise<void>;
  error?: string;
  posted?: boolean;
  topics: string[];
};

type PostPreview = {
  body: string;
  title: string;
  topic: string;
};

export function ForumPostComposer({ action, error, posted = false, topics }: ForumPostComposerProps) {
  const [files, setFiles] = useState<File[]>([]);
  const isReady = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [message, setMessage] = useState("");
  const [postPreview, setPostPreview] = useState<PostPreview | null>(null);
  const allowSubmitRef = useRef(false);
  const dialogRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(() => {
    if (!postPreview) return;
    dialogRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setPostPreview(null);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [postPreview]);

  useEffect(
    () => () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    },
    [previews],
  );

  function handleFiles(fileList: FileList | null) {
    const nextFiles = Array.from(fileList ?? []);
    if (nextFiles.length > MAX_FORUM_IMAGE_COUNT) {
      setMessage("Choose up to 3 images.");
      return;
    }
    if (nextFiles.some((file) => file.size > MAX_FORUM_IMAGE_BYTES)) {
      setMessage("Each image must be smaller than 5 MB.");
      return;
    }
    if (nextFiles.some((file) => !FORUM_IMAGE_ACCEPT.split(",").includes(file.type))) {
      setMessage("Use JPG, PNG, or WebP images.");
      return;
    }
    setMessage("");
    setFiles(nextFiles);
  }

  function removeImage(index: number) {
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    if (inputRef.current) inputRef.current.value = "";
  }

  function openPreview() {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;

    const formData = new FormData(form);
    setPostPreview({
      body: String(formData.get("body") ?? "").trim(),
      title: String(formData.get("title") ?? "").trim(),
      topic: String(formData.get("topic") ?? "").trim(),
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (allowSubmitRef.current) return;
    event.preventDefault();
    openPreview();
  }

  return (
    <form
      className="composer"
      action={action}
      aria-label="Create a forum post"
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <div className="composer-avatar">DC</div>
      <div className="composer-title">
        <strong>Start a conversation</strong>
        <Link href="/community-guidelines">
          <ShieldCheck aria-hidden="true" size={14} />
          Community guidelines
        </Link>
      </div>
      {error ? <div className="form-message is-error">{error}</div> : null}
      {posted ? <div className="form-message">Posted.</div> : null}
      <label className="composer-topic">
        <span>Topic</span>
        <select aria-label="Post topic" defaultValue="" name="topic" required>
          <option disabled value="">Choose topic</option>
          {topics.map((topic) => <option key={topic}>{topic}</option>)}
        </select>
      </label>
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
        <MentionTextarea
          label="Post details"
          maxLength={2000}
          minLength={10}
          name="body"
          placeholder="What should neighbors know before they answer?"
          required
        />
      </label>

      {previews.length > 0 ? (
        <div className={`forum-image-preview-grid is-${previews.length}`} aria-label={`${previews.length} selected images`}>
          {previews.map(({ file, url }, index) => (
            <div className="forum-image-preview" key={`${file.name}-${file.lastModified}`}>
              <Image alt={`Selected image ${index + 1}`} fill sizes="240px" src={url} unoptimized />
              <button aria-label={`Remove image ${index + 1}`} onClick={() => removeImage(index)} type="button">
                <X aria-hidden="true" size={15} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {message ? <div className="form-message is-error" role="alert">{message}</div> : null}
      <div className="composer-actions">
        <label className="forum-image-picker">
          <ImagePlus aria-hidden="true" size={17} />
          <span>Add images</span>
          <span className="forum-image-limit" aria-live="polite">{files.length}/3</span>
          <input
            accept={FORUM_IMAGE_ACCEPT}
            disabled={!isReady}
            multiple
            name="images"
            onChange={(event) => handleFiles(event.target.files)}
            ref={inputRef}
            type="file"
          />
        </label>
        <button className="composer-preview-trigger" onClick={openPreview} type="button">
          <Eye aria-hidden="true" size={16} />
          Preview post
        </button>
      </div>

      {postPreview ? (
        <div
          className="composer-preview-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPostPreview(null);
          }}
        >
          <section
            aria-labelledby="post-preview-title"
            aria-modal="true"
            className="composer-preview-dialog"
            ref={dialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <header className="composer-preview-heading">
              <div>
                <span>Review before posting</span>
                <h2 id="post-preview-title">Preview your post</h2>
              </div>
              <button
                aria-label="Close post preview"
                className="composer-preview-close"
                onClick={() => setPostPreview(null)}
                type="button"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </header>

            <article className="composer-post-preview">
              <header>
                <span className="avatar composer-preview-avatar">You</span>
                <div>
                  <strong>Your post</strong>
                  <small>Not posted yet</small>
                </div>
                <span className="topic-badge">{postPreview.topic}</span>
              </header>
              <h3>{postPreview.title}</h3>
              <p>{postPreview.body}</p>

              {previews.length > 0 ? (
                <div className={`forum-post-images is-${previews.length}`}>
                  {previews.map(({ file, url }, index) => (
                    <div className="forum-post-image" key={`${file.name}-${file.lastModified}-preview`}>
                      <Image
                        alt={`Post preview image ${index + 1}`}
                        fill
                        sizes={previews.length === 1 ? "(max-width: 680px) 100vw, 560px" : "(max-width: 680px) 50vw, 280px"}
                        src={url}
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </article>

            <footer className="composer-preview-actions">
              <button
                className="composer-preview-edit"
                onClick={() => setPostPreview(null)}
                type="button"
              >
                Back to edit
              </button>
              <button
                className="composer-preview-publish"
                onClick={() => {
                  allowSubmitRef.current = true;
                }}
                type="submit"
              >
                <Send aria-hidden="true" size={16} />
                Publish post
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </form>
  );
}
