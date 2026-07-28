"use client";

import { useState } from "react";

type ShareFriend = {
  id: string;
  initials: string;
  name: string;
  profileHref: string;
};

type ShareButtonProps = {
  friends: ShareFriend[];
  path: string;
  title: string;
  variant?: "post" | "profile";
};

export function ShareButton({ friends, path, title, variant = "post" }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  async function copyLink() {
    const url = new URL(path, window.location.origin).toString();

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function messageFriend(friend: ShareFriend) {
    const url = new URL(path, window.location.origin).toString();
    const draft = `Thought you might find this helpful: ${title}\n${url}`;
    window.location.assign(`/messages/friend:${encodeURIComponent(friend.id)}?share=${encodeURIComponent(draft)}`);
  }

  return (
    <div className={`share-control${variant === "profile" ? " profile-share-control" : ""}`}>
      <button aria-expanded={open} aria-haspopup="dialog" type="button" onClick={() => setOpen((current) => !current)}>
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
          <path d="M12 16V3" />
          <path d="M7 8l5-5 5 5" />
        </svg>
        <span>Share</span>
      </button>
      {open ? (
        <div className="share-menu" role="dialog" aria-label={variant === "profile" ? "Share this profile" : "Share this post"}>
          <div className="share-menu-head">
            <strong>Send to your network</strong>
            <button aria-label="Close share menu" className="share-close" type="button" onClick={() => setOpen(false)}>×</button>
          </div>
          {friends.length > 0 ? (
            <div className="share-friend-list">
              {friends.slice(0, 6).map((friend) => (
                <div className="share-friend" key={friend.id}>
                  <a aria-label={`View ${friend.name}'s profile`} href={friend.profileHref}>
                    <span>{friend.initials}</span>
                    <strong>{friend.name}</strong>
                  </a>
                  <button type="button" onClick={() => messageFriend(friend)}>
                    Message {friend.name}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <a className="share-empty" href="/network">Add people to share by message</a>
          )}
          <button className="copy-link-button" type="button" onClick={copyLink}>
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1" />
              <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" />
            </svg>
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
