import { ArrowLeft, Send, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ConnectorAvatar } from "@/components/connector-avatar";
import { getCurrentUser } from "@/lib/auth/user";
import { sendDirectMessageAction } from "@/lib/messages/actions";
import { getDirectConversation } from "@/lib/messages/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

type MessagePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; share?: string }>;
};

function formatMessageTime(timestamp: string | null) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

export default async function MessagePage({ params, searchParams }: MessagePageProps) {
  const { id } = await params;
  const query = await searchParams;
  const user = await getCurrentUser();
  if (isSupabaseConfigured() && !user) {
    return (
      <main className="page-shell messages-page"><AppHeader /><section className="empty-panel"><span>Sign in required</span><p>Sign in to start a private conversation.</p><Link href={`/login?next=${encodeURIComponent(`/messages/${id}`)}`}>Sign in</Link></section></main>
    );
  }

  let conversation;
  try {
    conversation = await getDirectConversation(id, user);
  } catch (error) {
    return (
      <main className="page-shell messages-page"><AppHeader /><section className="empty-panel"><span>Direct messages</span><p>{error instanceof Error ? error.message : "This conversation is not available."}</p><Link href="/messages">Back to messages</Link></section></main>
    );
  }
  if (!conversation) notFound();

  return (
    <main className="page-shell messages-page message-conversation-page">
      <AppHeader />
      <section className="message-thread" aria-label={`Conversation with ${conversation.profile.name}`}>
        <header className="message-thread-header">
          <Link className="message-back" href="/messages">
            <ArrowLeft aria-hidden="true" size={17} />
            All messages
          </Link>
          <div className="message-profile-summary">
            <span className="message-avatar">
              <ConnectorAvatar
                avatarKey={conversation.profile.avatarKey}
                avatarUrl={conversation.profile.avatarUrl}
                name={conversation.profile.name}
              />
            </span>
            <div>
              <strong>{conversation.profile.name}</strong>
              <span>{conversation.profile.role}</span>
            </div>
          </div>
          <Link
            aria-label={`View ${conversation.profile.name}'s profile`}
            className="message-view-profile"
            href={conversation.profileHref}
            title={`View ${conversation.profile.name}'s profile`}
          >
            <UserRound aria-hidden="true" size={18} />
          </Link>
        </header>
        <section className="message-history" aria-live="polite">
          {conversation.messages.length > 0 ? conversation.messages.map((message) => (
            <article className={`message-bubble${message.isMine ? " is-mine" : ""}`} key={message.id}>
              <p>{message.body}</p>
              {message.isMine ? (
                <time dateTime={message.deliveredAt ?? message.createdAt}>
                  Delivered {formatMessageTime(message.deliveredAt ?? message.createdAt)}
                  {message.readAt ? ` · Read ${formatMessageTime(message.readAt)}` : ""}
                </time>
              ) : (
                <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
              )}
            </article>
          )) : <div className="message-empty"><p>Start a private conversation with {conversation.profile.name.split(" ")[0]}.</p></div>}
        </section>
        <form action={sendDirectMessageAction} className="message-composer">
          <input name="connectorProfileId" type="hidden" value={conversation.profile.id} />
          {query.error ? <p className="form-message is-error">{query.error}</p> : null}
          <label>
            <span className="sr-only">Message</span>
            <textarea
              autoFocus
              defaultValue={query.share ?? ""}
              maxLength={2000}
              name="body"
              placeholder={`Message ${conversation.profile.name.split(" ")[0]}`}
              required
            />
          </label>
          <button aria-label="Send" title="Send message" type="submit">
            <Send aria-hidden="true" size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}
