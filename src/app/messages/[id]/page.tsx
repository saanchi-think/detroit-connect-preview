import { Archive, ArchiveRestore, ArrowLeft, Forward, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ConnectorAvatar } from "@/components/connector-avatar";
import { MessageComposer } from "@/components/message-composer";
import { MessageForwardButton } from "@/components/message-forward-button";
import { MessageReactionControl } from "@/components/message-reaction-control";
import { ReportContentMenu } from "@/components/report-content-menu";
import { getCurrentUser } from "@/lib/auth/user";
import { setDirectConversationArchivedAction } from "@/lib/messages/actions";
import {
  getDirectConversation,
  getMessageForwardRecipients,
} from "@/lib/messages/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

type MessagePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    forwardError?: string;
    forwardFailed?: string;
    forwarded?: string;
    reported?: string;
    reactionError?: string;
    safetyError?: string;
    share?: string;
  }>;
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
  const forwardRecipients = await getMessageForwardRecipients(conversation.profile.id, user);

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
          <div className="message-thread-actions">
            <form action={setDirectConversationArchivedAction}>
              <input name="conversationId" type="hidden" value={conversation.conversationId} />
              <input name="archived" type="hidden" value={String(!conversation.isArchived)} />
              <input
                name="returnTo"
                type="hidden"
                value={conversation.isArchived
                  ? `/messages/${encodeURIComponent(id)}`
                  : "/messages"}
              />
              <button
                aria-label={`${conversation.isArchived ? "Unarchive" : "Archive"} conversation with ${conversation.profile.name}`}
                className="message-archive-button"
                title={conversation.isArchived ? "Unarchive conversation" : "Archive conversation"}
                type="submit"
              >
                {conversation.isArchived
                  ? <ArchiveRestore aria-hidden="true" size={18} />
                  : <Archive aria-hidden="true" size={18} />}
              </button>
            </form>
            <Link
              aria-label={`View ${conversation.profile.name}'s profile`}
              className="message-view-profile"
              href={conversation.profileHref}
              title={`View ${conversation.profile.name}'s profile`}
            >
              <UserRound aria-hidden="true" size={18} />
            </Link>
            <ReportContentMenu
              reportedUserId={conversation.profile.ownerId}
              returnTo={`/messages/${encodeURIComponent(id)}`}
              targetId={conversation.conversationId}
              targetType="message"
            />
          </div>
        </header>
        {query.reported === "1" ? (
          <div className="message-thread-notice" role="status">Report submitted for review.</div>
        ) : null}
        {query.safetyError ? (
          <div className="message-thread-notice is-error" role="alert">{query.safetyError}</div>
        ) : null}
        {query.forwarded ? (
          <div className="message-thread-notice" role="status">
            Message shared with {query.forwarded} {query.forwarded === "1" ? "profile" : "profiles"}.
            {query.forwardFailed ? ` ${query.forwardFailed} could not be sent.` : ""}
          </div>
        ) : null}
        {query.forwardError ? (
          <div className="message-thread-notice is-error" role="alert">{query.forwardError}</div>
        ) : null}
        {query.reactionError ? (
          <div className="message-thread-notice is-error" role="alert">{query.reactionError}</div>
        ) : null}
        <section className="message-history" aria-live="polite">
          {conversation.messages.length > 0 ? conversation.messages.map((message) => (
            <article className={`message-bubble${message.isMine ? " is-mine" : ""}`} key={message.id}>
              {message.isForwarded ? (
                <span className="message-forwarded-label">
                  <Forward aria-hidden="true" size={11} />
                  Forwarded
                </span>
              ) : null}
              <p>{message.body}</p>
              {message.isMine ? (
                <time dateTime={message.deliveredAt ?? message.createdAt}>
                  Delivered {formatMessageTime(message.deliveredAt ?? message.createdAt)}
                  {message.readAt ? ` · Read ${formatMessageTime(message.readAt)}` : ""}
                </time>
              ) : (
                <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
              )}
              <MessageReactionControl
                messageId={message.id}
                reactions={message.reactions}
                returnTo={`/messages/${encodeURIComponent(conversation.profile.id)}`}
              />
              <MessageForwardButton
                currentRecipientId={conversation.profile.id}
                initialRecipients={forwardRecipients}
                messageId={message.id}
                messagePreview={message.body}
              />
            </article>
          )) : <div className="message-empty"><p>Start a private conversation with {conversation.profile.name.split(" ")[0]}.</p></div>}
        </section>
        <MessageComposer
          conversationId={conversation.conversationId}
          currentUserId={user?.id ?? "local-dev-user"}
          defaultValue={query.share}
          error={query.error}
          firstName={conversation.profile.name.split(" ")[0]}
          profileId={conversation.profile.id}
          realtimeEnabled={isSupabaseConfigured()}
        />
      </section>
    </main>
  );
}
