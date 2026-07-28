-- Delivery and read receipts for one-to-one messages.

alter table public.direct_messages
  add column if not exists delivered_at timestamptz not null default now(),
  add column if not exists read_at timestamptz;

drop policy if exists "Recipients can mark direct messages read" on public.direct_messages;

create or replace function public.mark_direct_conversation_read(target_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.direct_messages message
  set read_at = coalesce(message.read_at, now())
  where message.conversation_id = target_conversation_id
    and message.sender_id <> auth.uid()
    and exists (
      select 1
      from public.direct_conversations conversation
      where conversation.id = target_conversation_id
        and (
          conversation.member_one_id = auth.uid()
          or conversation.member_two_id = auth.uid()
        )
    );
end;
$$;

revoke all on function public.mark_direct_conversation_read(uuid) from public, anon;
grant execute on function public.mark_direct_conversation_read(uuid) to authenticated;

create index if not exists direct_messages_unread_idx
  on public.direct_messages(conversation_id, read_at)
  where read_at is null;
