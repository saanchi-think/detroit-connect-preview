create or replace function public.get_profile_social_context(
  target_connector_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_owner_id uuid;
  viewer_id uuid := auth.uid();
  relationship_status text := 'none';
  relationship_member_id text;
  friend_rows jsonb := '[]'::jsonb;
  recommender_rows jsonb := '[]'::jsonb;
  recommendation_rows jsonb := '[]'::jsonb;
begin
  select connector.owner_id
    into target_owner_id
  from public.connector_profiles connector
  where connector.id = target_connector_profile_id
    and connector.status = 'published'
    and connector.kind = 'person';

  if target_owner_id is null then
    return jsonb_build_object(
      'relationship', 'unavailable',
      'relationship_id', null,
      'friends', friend_rows,
      'recommended_by', recommender_rows,
      'recommendations', recommendation_rows
    );
  end if;

  if viewer_id = target_owner_id then
    relationship_status := 'self';
    relationship_member_id := target_owner_id::text;
  else
    select
      case
        when friendship.status = 'accepted' then 'friends'
        when friendship.requester_id = viewer_id then 'outgoing'
        when friendship.addressee_id = viewer_id then 'incoming'
        else 'none'
      end,
      case
        when friendship.requester_id = viewer_id then friendship.addressee_id::text
        else friendship.requester_id::text
      end
      into relationship_status, relationship_member_id
    from public.friendships friendship
    where (
      friendship.requester_id = viewer_id
      and friendship.addressee_id = target_owner_id
    ) or (
      friendship.requester_id = target_owner_id
      and friendship.addressee_id = viewer_id
    )
    order by friendship.updated_at desc
    limit 1;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'member_id', network.member_id,
        'connector_profile_id', network.connector_profile_id,
        'name', network.display_name,
        'role', network.headline,
        'neighborhood', network.neighborhood,
        'avatar_key', network.avatar_key,
        'avatar_url', network.avatar_url,
        'is_mutual_friend', network.is_mutual_friend
      )
      order by network.display_name
    ),
    '[]'::jsonb
  )
  into friend_rows
  from (
    select
      friend_profile.id as member_id,
      friend_connector.id as connector_profile_id,
      friend_profile.display_name,
      coalesce(friend_connector.headline, 'Detroit Connect member') as headline,
      coalesce(friend_connector.neighborhood, 'Detroit') as neighborhood,
      friend_connector.avatar_key,
      friend_connector.avatar_url,
      exists (
        select 1
        from public.friendships viewer_friendship
        where viewer_friendship.status = 'accepted'
          and (
            (
              viewer_friendship.requester_id = viewer_id
              and viewer_friendship.addressee_id = friend_profile.id
            ) or (
              viewer_friendship.addressee_id = viewer_id
              and viewer_friendship.requester_id = friend_profile.id
            )
          )
      ) as is_mutual_friend
    from public.friendships target_friendship
    join public.user_profiles friend_profile
      on friend_profile.id = case
        when target_friendship.requester_id = target_owner_id
          then target_friendship.addressee_id
        else target_friendship.requester_id
      end
    left join lateral (
      select connector.id, connector.headline, connector.neighborhood, connector.avatar_key, connector.avatar_url
      from public.connector_profiles connector
      where connector.owner_id = friend_profile.id
        and connector.status = 'published'
      order by connector.updated_at desc
      limit 1
    ) friend_connector on true
    where target_friendship.status = 'accepted'
      and (
        target_friendship.requester_id = target_owner_id
        or target_friendship.addressee_id = target_owner_id
      )
  ) network;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'member_id', recommender.member_id,
        'connector_profile_id', recommender.connector_profile_id,
        'name', recommender.display_name,
        'role', recommender.headline,
        'neighborhood', recommender.neighborhood,
        'avatar_key', recommender.avatar_key,
        'avatar_url', recommender.avatar_url,
        'note', recommender.note,
        'is_mutual_friend', recommender.is_mutual_friend
      )
      order by recommender.created_at desc
    ),
    '[]'::jsonb
  )
  into recommender_rows
  from (
    select
      recommendation.recommender_id as member_id,
      recommender_connector.id as connector_profile_id,
      recommender_profile.display_name,
      coalesce(recommender_connector.headline, 'Detroit Connect member') as headline,
      coalesce(recommender_connector.neighborhood, 'Detroit') as neighborhood,
      recommender_connector.avatar_key,
      recommender_connector.avatar_url,
      recommendation.note,
      recommendation.created_at,
      exists (
        select 1
        from public.friendships viewer_friendship
        where viewer_friendship.status = 'accepted'
          and (
            (
              viewer_friendship.requester_id = viewer_id
              and viewer_friendship.addressee_id = recommendation.recommender_id
            ) or (
              viewer_friendship.addressee_id = viewer_id
              and viewer_friendship.requester_id = recommendation.recommender_id
            )
          )
      ) as is_mutual_friend
    from public.profile_recommendations recommendation
    join public.user_profiles recommender_profile
      on recommender_profile.id = recommendation.recommender_id
    left join lateral (
      select connector.id, connector.headline, connector.neighborhood, connector.avatar_key, connector.avatar_url
      from public.connector_profiles connector
      where connector.owner_id = recommendation.recommender_id
        and connector.status = 'published'
      order by connector.updated_at desc
      limit 1
    ) recommender_connector on true
    where recommendation.connector_profile_id = target_connector_profile_id
  ) recommender;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'connector_profile_id', recommended.id,
        'name', recommended.name,
        'role', recommended.headline,
        'neighborhood', recommended.neighborhood,
        'avatar_key', recommended.avatar_key,
        'avatar_url', recommended.avatar_url,
        'note', recommended.note
      )
      order by recommended.created_at desc
    ),
    '[]'::jsonb
  )
  into recommendation_rows
  from (
    select
      connector.id,
      connector.name,
      coalesce(connector.headline, connector.organization_name, 'Detroit connector') as headline,
      coalesce(connector.neighborhood, 'Detroit') as neighborhood,
      connector.avatar_key,
      connector.avatar_url,
      recommendation.note,
      recommendation.created_at
    from public.profile_recommendations recommendation
    join public.connector_profiles connector
      on connector.id = recommendation.connector_profile_id
    where recommendation.recommender_id = target_owner_id
      and connector.status = 'published'
  ) recommended;

  return jsonb_build_object(
    'relationship', coalesce(relationship_status, 'none'),
    'relationship_id', relationship_member_id,
    'friends', friend_rows,
    'recommended_by', recommender_rows,
    'recommendations', recommendation_rows
  );
end;
$$;

revoke all on function public.get_profile_social_context(uuid) from public;
revoke all on function public.get_profile_social_context(uuid) from anon;
grant execute on function public.get_profile_social_context(uuid) to authenticated;
