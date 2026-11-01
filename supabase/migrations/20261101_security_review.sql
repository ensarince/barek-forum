-- Security review 2026-11-01 (DB side). Run each statement ON ITS OWN in the SQL editor.

-- 1. Blank the text of replies that were deleted before the API started doing it
update public.posts set content = '' where is_deleted = true;

-- 2. Images of deleted replies / hidden topics are not readable
alter policy "images_select" on public.images using ((post_id is null or exists (select 1 from public.posts p where p.id = images.post_id and p.is_deleted = false)) and (topic_id is null or exists (select 1 from public.topics t where t.id = images.topic_id)));

-- 3. Images: only on your OWN post/topic, only our Cloudinary or Giphy URLs, no ".." / %2e tricks
alter policy "images_insert" on public.images with check (uploader_id = auth.uid() and (select status from public.profiles where id = auth.uid()) = 'approved' and (cloudinary_url like 'https://res.cloudinary.com/dckg4ilaz/image/upload/%' or cloudinary_url ~ '^https://media[0-9]?\.giphy\.com/') and cloudinary_url !~* '\.\.|%2e' and ((post_id is not null and topic_id is null and exists (select 1 from public.posts p where p.id = images.post_id and p.author_id = auth.uid())) or (topic_id is not null and post_id is null and exists (select 1 from public.topics t where t.id = images.topic_id and t.author_id = auth.uid()))));

-- 4. Helper: the caller's own status, without re-triggering profiles RLS (avoids policy recursion)
create or replace function public.my_profile_status() returns text language sql stable security definer set search_path = '' as $$ select status::text from public.profiles where id = auth.uid() $$;

-- 5. Profiles: approved members see everyone; pending/rejected accounts only see approved profiles + themselves
alter policy "profiles_select" on public.profiles using (status = 'approved' or id = auth.uid() or public.my_profile_status() = 'approved');

-- 6. Topics: no future/backdated timestamps (fake pinning), can't insert already-deleted rows
alter policy "topics_insert" on public.topics with check (author_id = auth.uid() and (select status from public.profiles where id = auth.uid()) = 'approved' and created_at <= now() and updated_at <= now() and is_deleted = false and deleted_at is null and ((select role from public.profiles where id = auth.uid()) = 'admin' or (status = 'approved' and type = 'discussion' and is_pinned = false and approved_by is null and approved_at is null)));

-- 7. Replies: no fake timestamps, parent reply must be in the same topic
alter policy "posts_insert" on public.posts with check (author_id = auth.uid() and is_deleted = false and created_at <= now() and updated_at <= now() and (select status from public.profiles where id = auth.uid()) = 'approved' and exists (select 1 from public.topics t where t.id = posts.topic_id and t.status = 'approved') and (parent_post_id is null or exists (select 1 from public.posts pp where pp.id = posts.parent_post_id and pp.topic_id = posts.topic_id)));

-- 8. Profile URLs: avatar only from our Cloudinary, links only https (also blocks direct REST writes)
alter table public.profiles add constraint profiles_urls_safe check ((avatar_url is null or avatar_url like 'https://res.cloudinary.com/dckg4ilaz/image/upload/%') and (eight_a_url is null or eight_a_url like 'https://%') and (topo_url is null or topo_url like 'https://%') and (instagram_url is null or instagram_url like 'https://%') and (youtube_url is null or youtube_url like 'https://%'));

-- 9. Only approved members can react
alter policy "Users can insert own reactions" on public.reactions with check (user_id = auth.uid() and (select status from public.profiles where id = auth.uid()) = 'approved');

-- 10. Only approved members can vote
alter policy "auth insert votes" on public.poll_votes with check (auth.uid() = user_id and (select status from public.profiles where id = auth.uid()) = 'approved');
