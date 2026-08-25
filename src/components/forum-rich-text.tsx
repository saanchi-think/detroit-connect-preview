import Link from "next/link";
import type { ForumMentionModel } from "@/lib/forum/repository";

type ForumRichTextProps = {
  mentions: ForumMentionModel[];
  text: string;
};

function escapeRegularExpression(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function ForumRichText({ mentions, text }: ForumRichTextProps) {
  if (mentions.length === 0) return text;
  const byName = new Map(mentions.map((mention) => [mention.name.toLowerCase(), mention]));
  const names = mentions
    .map((mention) => mention.name)
    .sort((left, right) => right.length - left.length)
    .map(escapeRegularExpression);
  const parts = text.split(new RegExp(`(@(?:${names.join("|")}))`, "gi"));

  return parts.map((part, index) => {
    if (!part.startsWith("@")) return part;
    const mention = byName.get(part.slice(1).toLowerCase());
    return mention ? (
      <Link className="forum-mention" href={mention.profileHref} key={`${part}-${index}`}>
        {part}
      </Link>
    ) : part;
  });
}
