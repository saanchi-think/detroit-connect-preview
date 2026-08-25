-- Account lifecycle and member-controlled privacy.

alter table public.user_settings
  add column if not exists profile_visibility text not null default 'public'
    check (profile_visibility in ('public', 'members', 'network')),
  add column if not exists contact_visibility text not null default 'network'
    check (contact_visibility in ('members', 'network', 'private')),
  add column if not exists message_permission text not null default 'members'
    check (message_permission in ('members', 'network', 'none'));

alter table public.user_profiles
  drop constraint if exists user_profiles_account_status_check;

alter table public.user_profiles
  add constraint user_profiles_account_status_check
  check (account_status in ('active', 'suspended', 'deactivated'));

create or replace function public.members_are_connected(first_user_id uuid, second_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.friendships friendship
    where friendship.status = 'accepted'
      and (
        (friendship.requester_id = first_user_id and friendship.addressee_id = second_user_id)
        or (friendship.requester_id = second_user_id and friendship.addressee_id = first_user_id)
      )
  );
$$;

create or replace function public.can_view_member_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles profile
    left join public.user_settings settings on settings.user_id = profile.id
    where profile.id = target_user_id
      and profile.account_status = 'active'
      and (
        profile.id = auth.uid()
        or coalesce(settings.profile_visibility, 'public') = 'public'
        or (
          coalesce(settings.profile_visibility, 'public') = 'members'
          and auth.uid() is not null
        )
        or (
          coalesce(settings.profile_visibility, 'public') = 'network'
          and auth.uid() is not null
          and public.members_are_connected(auth.uid(), profile.id)
        )
      )
  );
$$;

create or replace function public.get_member_privacy(target_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with target as (
    select
      profile.id,
      profile.account_status,
      coalesce(settings.profile_visibility, 'public') as profile_visibility,
      coalesce(settings.contact_visibility, 'network') as contact_visibility,
      coalesce(settings.message_permission, 'members') as message_permission
    from public.user_profiles profile
    left join public.user_settings settings on settings.user_id = profile.id
    where profile.id = target_user_id
  ), context as (
    select
      target.*,
      auth.uid() is not null and auth.uid() = target.id as is_self,
      auth.uid() is not null and public.members_are_connected(auth.uid(), target.id) as is_connected,
      auth.uid() is not null and exists (
        select 1
        from public.direct_conversations conversation
        where conversation.member_one_id = least(auth.uid(), target.id)
          and conversation.member_two_id = greatest(auth.uid(), target.id)
      ) as has_conversation
    from target
  )
  select coalesce(
    (
      select jsonb_build_object(
        'profileVisibility', context.profile_visibility,
        'contactVisibility', context.contact_visibility,
        'messagePermission', context.message_permission,
        'canViewProfile', public.can_view_member_profile(context.id),
        'canViewContact',
          context.account_status = 'active'
          and public.can_view_member_profile(context.id)
          and (
            context.is_self
            or (context.contact_visibility = 'members' and auth.uid() is not null)
            or (context.contact_visibility = 'network' and context.is_connected)
          ),
        'canMessage',
          context.account_status = 'active'
          and not context.is_self
          and not public.users_are_blocked(auth.uid(), context.id)
          and (
            context.has_conversation
            or (context.message_permission = 'members' and auth.uid() is not null)
            or (context.message_permission = 'network' and context.is_connected)
          )
      )
      from context
    ),
    jsonb_build_object(
      'profileVisibility', 'public',
      'contactVisibility', 'network',
      'messagePermission', 'members',
      'canViewProfile', false,
      'canViewContact', false,
      'canMessage', false
    )
  );
$$;

create or replace function public.set_own_account_status(next_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in before changing your account.';
  end if;
  if next_status not in ('active', 'deactivated') then
    raise exception 'Invalid account status.';
  end if;
  if exists (
    select 1 from public.user_profiles
    where id = auth.uid() and account_status = 'suspended'
  ) then
    raise exception 'A suspended account cannot change its status.';
  end if;

  update public.user_profiles
  set account_status = next_status, updated_at = timezone('utc', now())
  where id = auth.uid();
end;
$$;

drop policy if exists "Published or owned connector profiles are readable"
  on public.connector_profiles;

create policy "Visible or owned connector profiles are readable"
  on public.connector_profiles for select
  to anon, authenticated
  using (
    owner_id = (select auth.uid())
    or (
      status = 'published'
      and (
        owner_id is null
        or public.can_view_member_profile(owner_id)
      )
    )
  );

drop policy if exists "Public member profiles are readable"
  on public.public_member_profiles;

create policy "Visible public member profiles are readable"
  on public.public_member_profiles for select
  to anon, authenticated
  using (public.can_view_member_profile(id));

create or replace function public.start_direct_conversation(other_member_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_member_id uuid := auth.uid();
  conversation_id uuid;
  message_permission text;
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
  if not exists (
    select 1 from public.user_profiles
    where id = other_member_id and account_status = 'active'
  ) then
    raise exception 'This member is not available.';
  end if;

  select id into conversation_id
  from public.direct_conversations
  where member_one_id = least(current_member_id, other_member_id)
    and member_two_id = greatest(current_member_id, other_member_id);

  if conversation_id is not null then
    return conversation_id;
  end if;

  select coalesce(settings.message_permission, 'members') into message_permission
  from public.user_profiles profile
  left join public.user_settings settings on settings.user_id = profile.id
  where profile.id = other_member_id;

  if message_permission = 'none'
    or (
      message_permission = 'network'
      and not public.members_are_connected(current_member_id, other_member_id)
    )
  then
    raise exception 'This member only accepts messages from their network.';
  end if;

  insert into public.direct_conversations (member_one_id, member_two_id)
  values (least(current_member_id, other_member_id), greatest(current_member_id, other_member_id))
  on conflict (member_one_id, member_two_id) do update
    set updated_at = public.direct_conversations.updated_at
  returning id into conversation_id;

  return conversation_id;
end;
$$;

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
    and public.can_view_member_profile(profile.id)
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

revoke all on function public.members_are_connected(uuid, uuid) from public;
revoke all on function public.can_view_member_profile(uuid) from public;
revoke all on function public.get_member_privacy(uuid) from public;
revoke all on function public.set_own_account_status(text) from public, anon;
revoke all on function public.start_direct_conversation(uuid) from public, anon;
revoke all on function public.find_member(text) from public, anon;

grant execute on function public.members_are_connected(uuid, uuid) to anon, authenticated;
grant execute on function public.can_view_member_profile(uuid) to anon, authenticated;
grant execute on function public.get_member_privacy(uuid) to anon, authenticated;
grant execute on function public.set_own_account_status(text) to authenticated;
grant execute on function public.start_direct_conversation(uuid) to authenticated;
grant execute on function public.find_member(text) to authenticated;

revoke update on public.user_profiles from authenticated;
grant update (display_name, email, avatar_url, updated_at) on public.user_profiles to authenticated;
