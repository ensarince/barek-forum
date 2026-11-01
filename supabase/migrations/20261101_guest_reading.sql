-- Guests (not logged in) may READ the forum. Run each statement on its own in the SQL editor.
-- Writing still needs an approved account; profile pages stay members-only (enforced in the app),
-- and guests only get id/username/avatar_url/status of approved profiles — never the personal links.

drop policy if exists "topics_require_login" on public.topics;

alter policy "posts_select" on public.posts using (exists (select 1 from public.topics t where t.id = posts.topic_id));

alter policy "profiles_select" on public.profiles using (auth.uid() is not null or status = 'approved');

revoke select on public.profiles from anon;

grant select (id, username, avatar_url, status) on public.profiles to anon;

create policy "guests_read_reactions" on public.reactions for select to anon using (true);

create policy "guests_read_polls" on public.polls for select to anon using (true);

create policy "guests_read_poll_votes" on public.poll_votes for select to anon using (true);
