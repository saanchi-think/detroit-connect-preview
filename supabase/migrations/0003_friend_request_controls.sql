drop policy if exists "Users can read accepted friend profiles"
  on public.user_profiles;

create policy "Users can read related account profiles"
  on public.user_profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1
      from public.friendships f
      where
        (f.requester_id = auth.uid() and f.addressee_id = id)
        or (f.addressee_id = auth.uid() and f.requester_id = id)
    )
  );

drop policy if exists "Users can update friendships they are part of"
  on public.friendships;

create policy "Addressees can accept friendship requests"
  on public.friendships for update
  using (auth.uid() = addressee_id and status = 'pending')
  with check (auth.uid() = addressee_id);

create policy "Users can remove their friendship requests"
  on public.friendships for delete
  using (
    auth.uid() = requester_id
    or (auth.uid() = addressee_id and status = 'pending')
  );
