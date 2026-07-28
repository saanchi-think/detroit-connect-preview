"use client";

import { ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  FORUM_IMAGE_ACCEPT,
  MAX_FORUM_IMAGE_BYTES,
  MAX_FORUM_IMAGE_COUNT,
} from "@/lib/forum/image-constants";

type ForumPostComposerProps = {
  action: (formData: FormData) => Promise<void>;
  error?: string;
  posted?: boolean;
  topics: string[];
};

export function ForumPostComposer({ action, error, posted = false, topics }: ForumPostComposerProps) {
  const [files, setFiles] = useState<File[]>([]);
  const isReady = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

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

  return (
    <form className="composer" action={action} aria-label="Create a forum post">
      <div className="composer-avatar">DC</div>
      <div className="composer-title"><strong>Start a conversation</strong></div>
      {error ? <div className="form-message is-error">{error}</div> : null}
      {posted ? <div className="form-message">Posted.</div> : null}
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
        <textarea
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
        <select aria-label="Post topic" defaultValue="" name="topic" required>
          <option disabled value="">Choose topic</option>
          {topics.map((topic) => <option key={topic}>{topic}</option>)}
        </select>
        <label className="forum-image-picker">
          <ImagePlus aria-hidden="true" size={17} />
          <span>Add images</span>
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
        <span className="forum-image-limit">{files.length}/3</span>
        <button type="submit">Post request</button>
      </div>
    </form>
  );
}
