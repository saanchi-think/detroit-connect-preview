-- Structured message forwarding for direct conversations.

alter table public.direct_messages
  add column if not exists is_forwarded boolean not null default false;

create index if not exists direct_messages_forwarded_idx
  on public.direct_messages(conversation_id, created_at desc)
  where is_forwarded = true;
