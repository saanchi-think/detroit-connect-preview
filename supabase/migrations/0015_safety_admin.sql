-- Member safety controls, moderation reports, and protected admin operations.

alter table public.user_profiles
  add column if not exists account_status text not null default 'active'
  check (account_status in ('active', 'suspended'));

delete from public.public_member_profiles public_profile
using public.user_profiles account_profile
where public_profile.id = account_profile.id
  and account_profile.account_status <> 'active';

create or replace function public.sync_public_member_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.account_status = 'active' then
    insert into public.public_member_profiles (id, display_name, avatar_url)
    values (new.id, new.display_name, new.avatar_url)
    on conflict (id) do update set
      display_name = excluded.display_name,
      avatar_url = excluded.avatar_url;
  else
    delete from public.public_member_profiles
    where id = new.id;
  end if;

  return new;
end;
$$;

revoke execute on function public.sync_public_member_profile()
  from public, anon, authenticated;

drop trigger if exists sync_public_member_profile on public.user_profiles;
create trigger sync_public_member_profile
  after insert or update of display_name, avatar_url, account_status
  on public.user_profiles
  for each row execute procedure public.sync_public_member_profile();

create table if not exists public.user_safety_controls (
  actor_id uuid not null references public.user_profiles(id) on delete cascade,
  target_id uuid not null references public.user_profiles(id) on delete cascade,
  blocked_at timestamptz,
  muted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (actor_id, target_id),
  check (actor_id <> target_id),
  check (blocked_at is not null or muted_at is not null)
);

create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.user_profiles(id) on delete cascade,
  reported_user_id uuid references public.user_profiles(id) on delete set null,
  target_type text not null check (target_type in ('profile', 'post', 'comment', 'message')),
  target_id text not null,
  reason text not null check (
    reason in ('spam', 'harassment', 'misinformation', 'unsafe_advice', 'impersonation', 'other')
  ),
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by uuid references public.user_profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists user_safety_controls_target_idx
  on public.user_safety_controls(target_id);
create index if not exists moderation_reports_status_created_idx
  on public.moderation_reports(status, created_at desc);
create index if not exists moderation_reports_reported_user_idx
  on public.moderation_reports(reported_user_id);

alter table public.user_safety_controls enable row level security;
alter table public.moderation_reports enable row level security;

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles profile
    where profile.id = check_user_id
      and profile.role = 'admin'
      and profile.account_status = 'active'
  );
$$;

create or replace function public.users_are_blocked(first_user_id uuid, second_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_safety_controls control
    where control.blocked_at is not null
      and (
        (control.actor_id = first_user_id and control.target_id = second_user_id)
        or (control.actor_id = second_user_id and control.target_id = first_user_id)
      )
  );
$$;

create or replace function public.get_hidden_member_ids()
returns table(member_id uuid, is_blocked boolean, is_muted boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when control.actor_id = auth.uid() then control.target_id
      else control.actor_id
    end as member_id,
    control.blocked_at is not null as is_blocked,
    control.actor_id = auth.uid() and control.muted_at is not null as is_muted
  from public.user_safety_controls control
  where auth.uid() is not null
    and (
      control.actor_id = auth.uid()
      or (control.target_id = auth.uid() and control.blocked_at is not null)
    );
$$;

revoke all on function public.is_admin(uuid) from public, anon;
revoke all on function public.users_are_blocked(uuid, uuid) from public, anon;
revoke all on function public.get_hidden_member_ids() from public, anon;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.users_are_blocked(uuid, uuid) to authenticated;
grant execute on function public.get_hidden_member_ids() to authenticated;

drop policy if exists "Members can read their safety controls" on public.user_safety_controls;
drop policy if exists "Members can create their safety controls" on public.user_safety_controls;
drop policy if exists "Members can update their safety controls" on public.user_safety_controls;
drop policy if exists "Members can delete their safety controls" on public.user_safety_controls;
drop policy if exists "Admins can read safety controls" on public.user_safety_controls;

create policy "Members can read their safety controls"
  on public.user_safety_controls for select to authenticated
  using (actor_id = (select auth.uid()));
create policy "Members can create their safety controls"
  on public.user_safety_controls for insert to authenticated
  with check (actor_id = (select auth.uid()));
create policy "Members can update their safety controls"
  on public.user_safety_controls for update to authenticated
  using (actor_id = (select auth.uid()))
  with check (actor_id = (select auth.uid()));
create policy "Members can delete their safety controls"
  on public.user_safety_controls for delete to authenticated
  using (actor_id = (select auth.uid()));
create policy "Admins can read safety controls"
  on public.user_safety_controls for select to authenticated
  using (public.is_admin());

drop policy if exists "Members can create reports" on public.moderation_reports;
drop policy if exists "Members can read their reports" on public.moderation_reports;
drop policy if exists "Admins can read reports" on public.moderation_reports;
drop policy if exists "Admins can update reports" on public.moderation_reports;

create policy "Members can create reports"
  on public.moderation_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
create policy "Members can read their reports"
  on public.moderation_reports for select to authenticated
  using (reporter_id = (select auth.uid()));
create policy "Admins can read reports"
  on public.moderation_reports for select to authenticated
  using (public.is_admin());
create policy "Admins can update reports"
  on public.moderation_reports for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can read account profiles" on public.user_profiles;
drop policy if exists "Admins can update account profiles" on public.user_profiles;
create policy "Admins can read account profiles"
  on public.user_profiles for select to authenticated
  using (public.is_admin());
create policy "Admins can update account profiles"
  on public.user_profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.set_member_block(target_user_id uuid, should_block boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Sign in before changing safety controls.';
  end if;
  if current_user_id = target_user_id then
    raise exception 'You cannot block yourself.';
  end if;

  if should_block then
    insert into public.user_safety_controls (
      actor_id,
      target_id,
      blocked_at,
      updated_at
    )
    values (
      current_user_id,
      target_user_id,
      timezone('utc', now()),
      timezone('utc', now())
    )
    on conflict (actor_id, target_id) do update set
      blocked_at = excluded.blocked_at,
      updated_at = excluded.updated_at;

    delete from public.friendships
    where (requester_id = current_user_id and addressee_id = target_user_id)
       or (requester_id = target_user_id and addressee_id = current_user_id);
  else
    update public.user_safety_controls
    set blocked_at = null, updated_at = timezone('utc', now())
    where actor_id = current_user_id and target_id = target_user_id;

    delete from public.user_safety_controls
    where actor_id = current_user_id
      and target_id = target_user_id
      and blocked_at is null
      and muted_at is null;
  end if;
end;
$$;

create or replace function public.set_member_mute(target_user_id uuid, should_mute boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Sign in before changing safety controls.';
  end if;
  if current_user_id = target_user_id then
    raise exception 'You cannot mute yourself.';
  end if;

  if should_mute then
    insert into public.user_safety_controls (
      actor_id,
      target_id,
      muted_at,
      updated_at
    )
    values (
      current_user_id,
      target_user_id,
      timezone('utc', now()),
      timezone('utc', now())
    )
    on conflict (actor_id, target_id) do update set
      muted_at = excluded.muted_at,
      updated_at = excluded.updated_at;
  else
    update public.user_safety_controls
    set muted_at = null, updated_at = timezone('utc', now())
    where actor_id = current_user_id and target_id = target_user_id;

    delete from public.user_safety_controls
    where actor_id = current_user_id
      and target_id = target_user_id
      and blocked_at is null
      and muted_at is null;
  end if;
end;
$$;

revoke all on function public.set_member_block(uuid, boolean) from public, anon;
revoke all on function public.set_member_mute(uuid, boolean) from public, anon;
grant execute on function public.set_member_block(uuid, boolean) to authenticated;
grant execute on function public.set_member_mute(uuid, boolean) to authenticated;

drop policy if exists "Users can request friendships" on public.friendships;
create policy "Users can request friendships"
  on public.friendships for insert to authenticated
  with check (
    (select auth.uid()) = requester_id
    and not public.users_are_blocked(requester_id, addressee_id)
  );

create or replace function public.start_direct_conversation(other_member_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_member_id uuid := auth.uid();
  conversation_id uuid;
begin
  if current_member_id is null then
    raise exception 'Sign in before starting a conversation.';
  end if;
  if current_member_id = other_member_id then
    raise exception 'You cannot start a conversation with yourself.';
  end if;
  if public.users_are_blocked(current_member_id, other_member_id) then
    raise exception 'This conversation is not available.';
  end if;

  insert into public.direct_conversations (member_one_id, member_two_id)
  values (least(current_member_id, other_member_id), greatest(current_member_id, other_member_id))
  on conflict (member_one_id, member_two_id) do update
    set updated_at = public.direct_conversations.updated_at
  returning id into conversation_id;

  return conversation_id;
end;
$$;

drop policy if exists "Members can send messages in their conversations" on public.direct_messages;
drop policy if exists "Members can read their direct conversations" on public.direct_conversations;
drop policy if exists "Members can read messages in their conversations" on public.direct_messages;

create policy "Members can read their direct conversations"
  on public.direct_conversations for select to authenticated
  using (
    (
      member_one_id = (select auth.uid())
      or member_two_id = (select auth.uid())
    )
    and not public.users_are_blocked(member_one_id, member_two_id)
  );

create policy "Members can read messages in their conversations"
  on public.direct_messages for select to authenticated
  using (
    exists (
      select 1
      from public.direct_conversations conversation
      where conversation.id = conversation_id
        and (
          conversation.member_one_id = (select auth.uid())
          or conversation.member_two_id = (select auth.uid())
        )
        and not public.users_are_blocked(
          conversation.member_one_id,
          conversation.member_two_id
        )
    )
  );

create policy "Members can send messages in their conversations"
  on public.direct_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1
      from public.direct_conversations conversation
      where conversation.id = conversation_id
        and (
          conversation.member_one_id = (select auth.uid())
          or conversation.member_two_id = (select auth.uid())
        )
        and not public.users_are_blocked(
          conversation.member_one_id,
          conversation.member_two_id
        )
    )
  );

create or replace function public.find_member(search_term text)
returns table(member_id uuid, display_name text)
language sql
stable
security definer
set search_path = public
as $$
  select profile.id, profile.display_name
  from public.user_profiles profile
  where auth.uid() is not null
    and profile.id <> auth.uid()
    and profile.account_status = 'active'
    and not public.users_are_blocked(auth.uid(), profile.id)
    and length(trim(search_term)) >= 2
    and (
      lower(profile.email) = lower(trim(search_term))
      or profile.display_name ilike '%' || trim(search_term) || '%'
    )
  order by
    case when lower(profile.email) = lower(trim(search_term)) then 0 else 1 end,
    profile.display_name
  limit 8;
$$;

create or replace function public.admin_set_account_status(
  target_user_id uuid,
  next_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required.';
  end if;
  if next_status not in ('active', 'suspended') then
    raise exception 'Invalid account status.';
  end if;
  if target_user_id = auth.uid() and next_status = 'suspended' then
    raise exception 'You cannot suspend your own account.';
  end if;

  update public.user_profiles
  set account_status = next_status, updated_at = timezone('utc', now())
  where id = target_user_id;
end;
$$;

create or replace function public.admin_export_data(export_kind text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required.';
  end if;

  if export_kind = 'members' then
    return coalesce((
      select jsonb_agg(to_jsonb(member))
      from (
        select id, display_name, email, role, account_status, created_at, updated_at
        from public.user_profiles
        order by created_at desc
      ) member
    ), '[]'::jsonb);
  elsif export_kind = 'profiles' then
    return coalesce((
      select jsonb_agg(to_jsonb(profile))
      from (
        select id, owner_id, kind, status, name, headline, neighborhood, languages,
          topics, skills, created_at, updated_at
        from public.connector_profiles
        order by created_at desc
      ) profile
    ), '[]'::jsonb);
  elsif export_kind = 'forum' then
    return jsonb_build_object(
      'posts',
      coalesce((select jsonb_agg(to_jsonb(post)) from public.forum_posts post), '[]'::jsonb),
      'comments',
      coalesce((select jsonb_agg(to_jsonb(comment)) from public.forum_comments comment), '[]'::jsonb)
    );
  elsif export_kind = 'reports' then
    return coalesce((
      select jsonb_agg(to_jsonb(report))
      from public.moderation_reports report
      order by report.created_at desc
    ), '[]'::jsonb);
  end if;

  raise exception 'Unsupported export.';
end;
$$;

revoke all on function public.admin_set_account_status(uuid, text) from public, anon;
revoke all on function public.admin_export_data(text) from public, anon;
grant execute on function public.admin_set_account_status(uuid, text) to authenticated;
grant execute on function public.admin_export_data(text) to authenticated;
