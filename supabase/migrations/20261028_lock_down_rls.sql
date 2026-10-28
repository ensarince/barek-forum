-- Lock down RLS so users can't bypass the API routes with the public anon key.
-- Run AFTER 20261028_soft_delete_topics.sql. Safe to re-run.

-- 1. Profiles: users may only edit their own harmless fields (full_name, links, avatar).
--    role / status / username can only be changed by the service role (API routes) or the SQL editor.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') and (
       new.id is distinct from old.id
    or new.role is distinct from old.role
    or new.status is distinct from old.status
    or new.username is distinct from old.username
  ) then
    raise exception 'role, status and username cannot be changed directly';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- Profiles are only readable by logged-in users
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select
  using (auth.uid() is not null);

-- 2. Topics: insert only as yourself; non-admins can only create pending, unpinned discussions
drop policy if exists "topics_insert" on public.topics;
create policy "topics_insert" on public.topics for insert
  with check (
    author_id = auth.uid()
    and (select status from public.profiles where id = auth.uid()) = 'approved'
    and (
      (select role from public.profiles where id = auth.uid()) = 'admin'
      or (status = 'pending' and type = 'discussion' and is_pinned = false and approved_by is null)
    )
  );

-- Topics are only readable by logged-in users (ANDed with topics_select)
drop policy if exists "topics_require_login" on public.topics;
create policy "topics_require_login" on public.topics
  as restrictive
  for select
  using (auth.uid() is not null);

-- 3. Posts: readable only when the topic itself is visible (inherits topics RLS incl. soft delete)
drop policy if exists "posts_select" on public.posts;
create policy "posts_select" on public.posts for select
  using (
    (select status from public.profiles where id = auth.uid()) = 'approved'
    and exists (select 1 from public.topics t where t.id = posts.topic_id)
  );

-- Insert only as yourself, only into an approved, visible topic
drop policy if exists "posts_insert" on public.posts;
create policy "posts_insert" on public.posts for insert
  with check (
    author_id = auth.uid()
    and is_deleted = false
    and (select status from public.profiles where id = auth.uid()) = 'approved'
    and exists (select 1 from public.topics t where t.id = posts.topic_id and t.status = 'approved')
  );

-- Edits/deletes go through the API (service role) only
drop policy if exists "posts_update_own" on public.posts;

-- 4. Images: insert only as yourself
drop policy if exists "images_insert" on public.images;
create policy "images_insert" on public.images for insert
  with check (
    uploader_id = auth.uid()
    and (select status from public.profiles where id = auth.uid()) = 'approved'
  );

-- 5. Polls: only on your own topic or post
drop policy if exists "auth insert polls" on public.polls;
create policy "auth insert polls" on public.polls for insert
  with check (
    (post_id is not null and exists (select 1 from public.posts p where p.id = polls.post_id and p.author_id = auth.uid()))
    or (topic_id is not null and exists (select 1 from public.topics t where t.id = polls.topic_id and t.author_id = auth.uid()))
  );
