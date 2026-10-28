-- Count in the database instead of fetching every row (PostgREST caps responses at 1000 rows,
-- so counting in JS silently undercounts once the forum grows).
-- security invoker = RLS still applies, so hidden/deleted rows are never counted.

create or replace function public.topic_reply_counts(topic_ids uuid[])
returns table (topic_id uuid, reply_count bigint)
language sql
stable
security invoker
as $$
  select p.topic_id, count(*)::bigint
  from public.posts p
  where p.topic_id = any(topic_ids) and p.is_deleted = false
  group by p.topic_id
$$;

create or replace function public.sector_topic_counts()
returns table (sector_id uuid, topic_count bigint)
language sql
stable
security invoker
as $$
  select t.sector_id, count(*)::bigint
  from public.topics t
  where t.status = 'approved' and t.sector_id is not null
  group by t.sector_id
$$;

grant execute on function public.topic_reply_counts(uuid[]) to authenticated;
grant execute on function public.sector_topic_counts() to authenticated;
