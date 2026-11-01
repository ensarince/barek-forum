-- Topics no longer need admin approval: any approved member's topic goes live right away.
-- Non-admins still can't post announcements, pin, or set approved_by. Single statement on purpose.
alter policy "topics_insert" on public.topics with check (author_id = auth.uid() and (select status from public.profiles where id = auth.uid()) = 'approved' and ((select role from public.profiles where id = auth.uid()) = 'admin' or (status = 'approved' and type = 'discussion' and is_pinned = false and approved_by is null)));
