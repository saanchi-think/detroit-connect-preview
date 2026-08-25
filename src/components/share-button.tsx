"use client";

import { Search } from "lucide-react";
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
  const [friendQuery, setFriendQuery] = useState("");
  const normalizedFriendQuery = friendQuery.trim().toLowerCase();
  const visibleFriends = friends
    .filter((friend) => !normalizedFriendQuery || friend.name.toLowerCase().includes(normalizedFriendQuery))
    .slice(0, normalizedFriendQuery ? 12 : 6);

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
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={variant === "profile" ? "Share profile" : "Share post"}
        data-tooltip="Share"
        title="Share"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
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
            <button aria-label="Close share menu" className="share-close" type="button" onClick={() => { setOpen(false); setFriendQuery(""); }}>×</button>
          </div>
          {friends.length > 0 ? (
            <>
              <label className="share-friend-search">
                <span className="sr-only">Search your network</span>
                <Search aria-hidden="true" size={15} />
                <input
                  autoComplete="off"
                  name="share-friend-search"
                  onChange={(event) => setFriendQuery(event.target.value)}
                  placeholder="Search your network"
                  type="search"
                  value={friendQuery}
                />
              </label>
              {visibleFriends.length > 0 ? (
                <div className="share-friend-list">
                  {visibleFriends.map((friend) => (
                    <button
                      aria-label={`Send this to ${friend.name}`}
                      className="share-friend"
                      key={friend.id}
                      type="button"
                      onClick={() => messageFriend(friend)}
                    >
                      <span>{friend.initials}</span>
                      <strong>{friend.name}</strong>
                    </button>
                  ))}
                </div>
              ) : <p className="share-no-results">No one in your network matches that name.</p>}
            </>
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
