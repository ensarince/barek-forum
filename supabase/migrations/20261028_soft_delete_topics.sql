-- Soft delete for topics: deleting a topic only marks it, nothing is removed.
-- Restore a topic by hand with:
--   update topics set is_deleted = false, deleted_at = null where id = '<topic id>';

alter table topics add column if not exists is_deleted boolean not null default false;
alter table topics add column if not exists deleted_at timestamptz;

-- Restrictive policy is ANDed with every existing select policy,
-- so deleted topics are hidden from everyone (admins included) without touching the other policies.
-- The service role bypasses RLS, so server routes can still mark/restore topics.
drop policy if exists "topics_hide_deleted" on topics;
create policy "topics_hide_deleted" on topics
  as restrictive
  for select
  using (is_deleted = false);
