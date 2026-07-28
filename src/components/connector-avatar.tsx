/* eslint-disable @next/next/no-img-element */

import { ProfileAvatar } from "@/components/profile-avatar";
import type { AvatarKey } from "@/lib/connectors/types";

type ConnectorAvatarProps = {
  avatarKey?: AvatarKey | null;
  avatarUrl?: string | null;
  name: string;
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ConnectorAvatar({ avatarKey, avatarUrl, name }: ConnectorAvatarProps) {
  if (avatarUrl) {
    return (
      <img
        alt=""
        className="connector-profile-photo"
        decoding="async"
        loading="lazy"
        src={avatarUrl}
      />
    );
  }

  if (avatarKey) {
    return <ProfileAvatar avatar={avatarKey} />;
  }

  return <span>{getInitials(name)}</span>;
}
