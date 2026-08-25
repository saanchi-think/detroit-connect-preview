import { SmilePlus, ThumbsUp } from "lucide-react";
import { toggleDirectMessageReactionAction } from "@/lib/messages/actions";
import type { DirectMessageReactionModel } from "@/lib/messages/repository";

const REACTION_CHOICES = ["👍", "❤️", "😂", "🙌", "🎉"] as const;

type MessageReactionControlProps = {
  messageId: string;
  reactions: DirectMessageReactionModel[];
  returnTo: string;
};

export function MessageReactionControl({
  messageId,
  reactions,
  returnTo,
}: MessageReactionControlProps) {
  const thumbsUpReaction = reactions.find((reaction) => reaction.emoji === "👍");

  return (
    <div className="message-reaction-control" aria-label="Message reactions">
      {reactions.map((reaction) => (
        <form action={toggleDirectMessageReactionAction} key={reaction.emoji}>
          <input name="messageId" type="hidden" value={messageId} />
          <input name="emoji" type="hidden" value={reaction.emoji} />
          <input name="returnTo" type="hidden" value={returnTo} />
          <button
            aria-label={`${reaction.reactedByCurrentUser ? "Remove" : "Add"} ${reaction.emoji} reaction`}
            aria-pressed={reaction.reactedByCurrentUser}
            className={`message-reaction-pill${reaction.reactedByCurrentUser ? " is-selected" : ""}`}
            title={`${reaction.reactedByCurrentUser ? "Remove" : "Add"} reaction`}
            type="submit"
          >
            <span aria-hidden="true">{reaction.emoji}</span>
            <span>{reaction.count}</span>
          </button>
        </form>
      ))}
      {!thumbsUpReaction ? (
        <form action={toggleDirectMessageReactionAction}>
          <input name="messageId" type="hidden" value={messageId} />
          <input name="emoji" type="hidden" value="👍" />
          <input name="returnTo" type="hidden" value={returnTo} />
          <button aria-label="Like message" className="message-reaction-add" title="Like" type="submit">
            <ThumbsUp aria-hidden="true" size={13} />
          </button>
        </form>
      ) : null}
      <details className="message-reaction-picker">
        <summary aria-label="Add reaction" title="Add reaction">
          <SmilePlus aria-hidden="true" size={14} />
        </summary>
        <div className="message-reaction-picker-menu">
          {REACTION_CHOICES.filter((emoji) => emoji !== "👍").map((emoji) => (
            <form action={toggleDirectMessageReactionAction} key={emoji}>
              <input name="messageId" type="hidden" value={messageId} />
              <input name="emoji" type="hidden" value={emoji} />
              <input name="returnTo" type="hidden" value={returnTo} />
              <button aria-label={`React with ${emoji}`} title={`React with ${emoji}`} type="submit">
                {emoji}
              </button>
            </form>
          ))}
        </div>
      </details>
    </div>
  );
}
