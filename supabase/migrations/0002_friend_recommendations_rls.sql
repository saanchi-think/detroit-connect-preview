drop policy if exists "Users can read accepted friend profiles"
  on public.user_profiles;

create policy "Users can read accepted friend profiles"
  on public.user_profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
      and (
        (f.requester_id = auth.uid() and f.addressee_id = id)
        or (f.addressee_id = auth.uid() and f.requester_id = id)
      )
    )
  );

drop policy if exists "Published recommendations are readable through public profiles"
  on public.profile_recommendations;

drop policy if exists "Users can read friend recommendations"
  on public.profile_recommendations;

create policy "Users can read friend recommendations"
  on public.profile_recommendations for select
  using (
    auth.uid() = recommender_id
    or exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
      and (
        (f.requester_id = auth.uid() and f.addressee_id = recommender_id)
        or (f.addressee_id = auth.uid() and f.requester_id = recommender_id)
      )
    )
  );
