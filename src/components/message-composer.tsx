"use client";

import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { sendDirectMessageAction } from "@/lib/messages/actions";
import { createClient } from "@/lib/supabase/client";

type MessageComposerProps = {
  conversationId: string;
  currentUserId: string;
  defaultValue?: string;
  error?: string;
  firstName: string;
  profileId: string;
  realtimeEnabled: boolean;
};

export function MessageComposer({
  conversationId,
  currentUserId,
  defaultValue = "",
  error,
  firstName,
  profileId,
  realtimeEnabled,
}: MessageComposerProps) {
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const broadcastRef = useRef<(isTyping: boolean) => void>(() => undefined);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recipientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function receiveTyping(payload: { userId?: string; isTyping?: boolean }) {
      if (payload.userId === currentUserId) return;
      setIsRecipientTyping(Boolean(payload.isTyping));
      if (recipientTimerRef.current) clearTimeout(recipientTimerRef.current);
      if (payload.isTyping) {
        recipientTimerRef.current = setTimeout(() => setIsRecipientTyping(false), 2200);
      }
    }

    if (!realtimeEnabled && typeof BroadcastChannel !== "undefined") {
      const localChannel = new BroadcastChannel(`direct-typing:${conversationId}`);
      localChannel.onmessage = (event: MessageEvent<{ userId?: string; isTyping?: boolean }>) => {
        receiveTyping(event.data);
      };
      broadcastRef.current = (isTyping) => {
        localChannel.postMessage({ userId: currentUserId, isTyping });
      };

      return () => {
        if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
        if (recipientTimerRef.current) clearTimeout(recipientTimerRef.current);
        broadcastRef.current = () => undefined;
        localChannel.close();
      };
    }

    if (!realtimeEnabled) return;

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    const channel = supabase
      .channel(`direct-typing:${conversationId}`, {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        receiveTyping(payload);
      })
      .subscribe();

    broadcastRef.current = (isTyping) => {
      void channel.send({
        type: "broadcast",
        event: "typing",
        payload: { userId: currentUserId, isTyping },
      });
    };

    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      if (recipientTimerRef.current) clearTimeout(recipientTimerRef.current);
      void supabase.removeChannel(channel);
      broadcastRef.current = () => undefined;
    };
  }, [conversationId, currentUserId, realtimeEnabled]);

  function broadcastTyping(isTyping: boolean) {
    broadcastRef.current(isTyping);
  }

  function handleInput() {
    broadcastTyping(true);
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => broadcastTyping(false), 1200);
  }

  return (
    <div className="message-composer-wrap" data-conversation-id={conversationId}>
      <div
        aria-live="polite"
        className={`message-typing-indicator${isRecipientTyping ? " is-visible" : ""}`}
      >
        <span aria-hidden="true"><i /><i /><i /></span>
        {firstName} is typing
      </div>
      <form
        action={sendDirectMessageAction}
        className="message-composer"
        onSubmit={() => broadcastTyping(false)}
      >
        <input name="connectorProfileId" type="hidden" value={profileId} />
        {error ? <p className="form-message is-error">{error}</p> : null}
        <label>
          <span className="sr-only">Message</span>
          <textarea
            autoFocus
            defaultValue={defaultValue}
            maxLength={2000}
            name="body"
            onInput={handleInput}
            placeholder={`Message ${firstName}`}
            required
          />
        </label>
        <button aria-label="Send" title="Send message" type="submit">
          <Send aria-hidden="true" size={18} />
        </button>
      </form>
    </div>
  );
}
