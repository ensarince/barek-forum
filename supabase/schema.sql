-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Enums
create type user_status as enum ('pending', 'approved', 'rejected');
create type user_role as enum ('user', 'admin');
create type topic_status as enum ('pending', 'approved', 'rejected');
create type topic_type as enum ('discussion', 'announcement');
create type notification_type as enum (
  'topic_approved',
  'topic_rejected',
  'user_approved',
  'reply_received',
  'announcement_posted'
);

-- Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  avatar_url text,
  status user_status not null default 'pending',
  role user_role not null default 'user',
  eight_a_url text,
  topo_url text,
  instagram_url text,
  youtube_url text,
  created_at timestamptz not null default now()
);

-- Sectors
create table sectors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  order_index integer not null default 0
);

-- Static pages (rules, etc.)
create table pages (
  slug text primary key,
  title text not null,
  content text not null default '',
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

-- Insert default rules page
insert into pages (slug, title, content) values (
  'rules',
  'Barek Bouldering Kuralları',
  '## Barek Kaya Tırmanış Alanı Kuralları

Buraya kurallar eklenecek.'
);

-- Topics (discussions + announcements)
create table topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  author_id uuid not null references profiles(id) on delete cascade,
  sector_id uuid references sectors(id) on delete set null,
  type topic_type not null default 'discussion',
  status topic_status not null default 'pending',
  is_pinned boolean not null default false,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Posts (replies)
create table posts (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Images
create table images (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid not null references profiles(id) on delete cascade,
  cloudinary_url text not null,
  cloudinary_id text not null,
  topic_id uuid references topics(id) on delete set null,
  post_id uuid references posts(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  reference_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Topic reads (for unread tracking)
create table topic_reads (
  user_id uuid not null references profiles(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

-- Update topics.updated_at when a reply is posted
create or replace function update_topic_timestamp()
returns trigger as $$
begin
  update topics set updated_at = now() where id = new.topic_id;
  return new;
end;
$$ language plpgsql;

create trigger on_post_inserted
  after insert on posts
  for each row execute function update_topic_timestamp();

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS Policies
alter table profiles enable row level security;
alter table sectors enable row level security;
alter table pages enable row level security;
alter table topics enable row level security;
alter table posts enable row level security;
alter table images enable row level security;
alter table notifications enable row level security;
alter table topic_reads enable row level security;

-- Profiles: anyone approved can read, users edit own
create policy "profiles_select" on profiles for select
  using (true);

create policy "profiles_update_own" on profiles for update
  using (auth.uid() = id);

-- Sectors: anyone can read, admins manage
create policy "sectors_select" on sectors for select using (true);
create policy "sectors_admin" on sectors for all
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- Pages: anyone can read, admins manage
create policy "pages_select" on pages for select using (true);
create policy "pages_admin" on pages for all
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- Topics: approved users see approved topics, admins see all
create policy "topics_select_approved" on topics for select
  using (
    status = 'approved'
    or author_id = auth.uid()
    or (select role from profiles where id = auth.uid()) = 'admin'
  );

create policy "topics_insert" on topics for insert
  with check ((select status from profiles where id = auth.uid()) = 'approved');

create policy "topics_update_admin" on topics for update
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- Posts: approved users can read and write
create policy "posts_select" on posts for select
  using ((select status from profiles where id = auth.uid()) = 'approved');

create policy "posts_insert" on posts for insert
  with check ((select status from profiles where id = auth.uid()) = 'approved');

create policy "posts_update_own" on posts for update
  using (author_id = auth.uid());

-- Notifications: users see own
create policy "notifications_own" on notifications for all
  using (user_id = auth.uid());

-- Topic reads: users manage own
create policy "topic_reads_own" on topic_reads for all
  using (user_id = auth.uid());

-- Images: approved users can insert, anyone can view
create policy "images_select" on images for select using (true);
create policy "images_insert" on images for insert
  with check ((select status from profiles where id = auth.uid()) = 'approved');
