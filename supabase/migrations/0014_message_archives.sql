create table if not exists public.direct_conversation_preferences (
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  archived_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (conversation_id, user_id)
);

create index if not exists direct_conversation_preferences_user_archived_idx
  on public.direct_conversation_preferences (user_id, archived_at desc);

alter table public.direct_conversation_preferences enable row level security;

drop policy if exists "Members can manage their conversation preferences"
  on public.direct_conversation_preferences;

create policy "Members can manage their conversation preferences"
  on public.direct_conversation_preferences
  for all
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.direct_conversations conversation
      where conversation.id = conversation_id
      and (
        conversation.member_one_id = (select auth.uid())
        or conversation.member_two_id = (select auth.uid())
      )
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.direct_conversations conversation
      where conversation.id = conversation_id
      and (
        conversation.member_one_id = (select auth.uid())
        or conversation.member_two_id = (select auth.uid())
      )
    )
  );

create or replace function public.restore_direct_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.direct_conversation_preferences
  where conversation_id = new.conversation_id;

  return new;
end;
$$;

revoke all on function public.restore_direct_conversation_on_message()
  from public, anon, authenticated;

drop trigger if exists direct_messages_restore_conversation
  on public.direct_messages;

create trigger direct_messages_restore_conversation
  after insert on public.direct_messages
  for each row execute procedure public.restore_direct_conversation_on_message();
