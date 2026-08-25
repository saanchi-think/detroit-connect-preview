create table if not exists public.direct_message_reactions (
  message_id uuid not null references public.direct_messages(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '😂', '🙌', '🎉')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.direct_message_reactions enable row level security;

drop policy if exists "Participants can read direct message reactions"
  on public.direct_message_reactions;
drop policy if exists "Participants can add direct message reactions"
  on public.direct_message_reactions;
drop policy if exists "Participants can update their direct message reactions"
  on public.direct_message_reactions;
drop policy if exists "Participants can remove their direct message reactions"
  on public.direct_message_reactions;

create policy "Participants can read direct message reactions"
  on public.direct_message_reactions for select
  to authenticated
  using (
    exists (
      select 1
      from public.direct_messages message
      join public.direct_conversations conversation
        on conversation.id = message.conversation_id
      where message.id = direct_message_reactions.message_id
        and (
          conversation.member_one_id = (select auth.uid())
          or conversation.member_two_id = (select auth.uid())
        )
    )
  );

create policy "Participants can add direct message reactions"
  on public.direct_message_reactions for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.direct_messages message
      join public.direct_conversations conversation
        on conversation.id = message.conversation_id
      where message.id = direct_message_reactions.message_id
        and (
          conversation.member_one_id = (select auth.uid())
          or conversation.member_two_id = (select auth.uid())
        )
    )
  );

create policy "Participants can update their direct message reactions"
  on public.direct_message_reactions for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.direct_messages message
      join public.direct_conversations conversation
        on conversation.id = message.conversation_id
      where message.id = direct_message_reactions.message_id
        and (
          conversation.member_one_id = (select auth.uid())
          or conversation.member_two_id = (select auth.uid())
        )
    )
  )
  with check (user_id = (select auth.uid()));

create policy "Participants can remove their direct message reactions"
  on public.direct_message_reactions for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.direct_messages message
      join public.direct_conversations conversation
        on conversation.id = message.conversation_id
      where message.id = direct_message_reactions.message_id
        and (
          conversation.member_one_id = (select auth.uid())
          or conversation.member_two_id = (select auth.uid())
        )
    )
  );

create index if not exists direct_message_reactions_message_id_idx
  on public.direct_message_reactions(message_id);
