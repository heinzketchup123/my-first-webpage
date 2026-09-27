-- Campus Pulse — full schema + Row Level Security
--
-- Run this ONCE in your Supabase project:
--   Dashboard → SQL Editor → New query → paste this file → Run.
-- It is idempotent (safe to run again) so re-running to add later
-- changes will not error on existing objects.
--
-- What it does:
--   1. profiles      — one row per auth user, auto-created on signup
--   2. friendships   — pending / accepted requests between two users
--   3. campus_chat   — becomes a friends-only direct-message table
--   4. campus_feed / instructor_reviews / study_groups — locked so
--      only signed-in users write, only authors edit their own rows

-- ============================================================
-- 1. PROFILES
-- ============================================================
create table if not exists public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  handle       text unique not null check (char_length(handle) between 3 and 24),
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: viewable by anyone" on public.profiles;
create policy "profiles: viewable by anyone"
  on public.profiles for select using (true);

drop policy if exists "profiles: user manages own" on public.profiles;
create policy "profiles: user manages own"
  on public.profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-provision a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_handle text;
  final_handle text;
  n int := 0;
begin
  base_handle := lower(regexp_replace(split_part(new.email, '@', 1),
                                      '[^a-z0-9_]', '', 'g'));
  if char_length(base_handle) < 3 then
    base_handle := 'user' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  final_handle := base_handle;
  while exists (select 1 from public.profiles where handle = final_handle) loop
    n := n + 1;
    final_handle := base_handle || n;
  end loop;

  insert into public.profiles (user_id, handle, display_name)
  values (new.id, final_handle,
          coalesce(new.raw_user_meta_data->>'display_name', final_handle));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: any auth.users that already exist without a profile row (e.g.
-- signed up before the trigger was installed) get one created now so they
-- can be found by handle in the Add Friend flow.
do $$
declare
  u record;
  base_handle text;
  final_handle text;
  n int;
begin
  for u in
    select id, email, raw_user_meta_data
    from auth.users
    where id not in (select user_id from public.profiles)
  loop
    base_handle := lower(regexp_replace(split_part(u.email, '@', 1), '[^a-z0-9_]', '', 'g'));
    if char_length(base_handle) < 3 then
      base_handle := 'user' || substr(replace(u.id::text, '-', ''), 1, 6);
    end if;
    n := 0;
    final_handle := base_handle;
    while exists (select 1 from public.profiles where handle = final_handle) loop
      n := n + 1;
      final_handle := base_handle || n;
    end loop;
    insert into public.profiles (user_id, handle, display_name)
    values (u.id, final_handle, coalesce(u.raw_user_meta_data->>'display_name', final_handle));
  end loop;
end $$;

-- ============================================================
-- 2. FRIENDSHIPS  (symmetric relation, stored once per pair)
-- ============================================================
create table if not exists public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references auth.users(id) on delete cascade,
  addressee_id  uuid not null references auth.users(id) on delete cascade,
  status        text not null check (status in ('pending','accepted','blocked')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  unique(requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

alter table public.friendships enable row level security;

drop policy if exists "friendships: view own" on public.friendships;
create policy "friendships: view own"
  on public.friendships for select
  using (auth.uid() in (requester_id, addressee_id));

drop policy if exists "friendships: send request" on public.friendships;
create policy "friendships: send request"
  on public.friendships for insert
  with check (auth.uid() = requester_id and status = 'pending');

drop policy if exists "friendships: addressee responds" on public.friendships;
create policy "friendships: addressee responds"
  on public.friendships for update
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id);

drop policy if exists "friendships: either side deletes" on public.friendships;
create policy "friendships: either side deletes"
  on public.friendships for delete
  using (auth.uid() in (requester_id, addressee_id));

-- Helper: does an accepted friendship exist between two users?
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a))
  );
$$;

-- ============================================================
-- 3. CAMPUS_CHAT  →  friends-only direct messages
-- ============================================================
-- Table already exists in your project; add the columns it now needs
-- and drop legacy anon-writable policies.
create table if not exists public.campus_chat (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.campus_chat
  add column if not exists sender_id    uuid references auth.users(id) on delete cascade,
  add column if not exists recipient_id uuid references auth.users(id) on delete cascade,
  add column if not exists text         text,
  add column if not exists "user"       text,
  add column if not exists "time"       text;

create index if not exists campus_chat_pair_idx
  on public.campus_chat (sender_id, recipient_id, created_at desc);

alter table public.campus_chat enable row level security;

-- Nuke any legacy world-writable policies.
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='campus_chat' loop
    execute format('drop policy if exists %I on public.campus_chat', p.policyname);
  end loop;
end $$;

create policy "chat: view own DMs"
  on public.campus_chat for select
  using (auth.uid() in (sender_id, recipient_id));

create policy "chat: send to friend"
  on public.campus_chat for insert
  with check (
    auth.uid() = sender_id
    and sender_id is distinct from recipient_id
    and char_length(text) between 1 and 280
    and public.are_friends(sender_id, recipient_id)
  );

create policy "chat: sender deletes own"
  on public.campus_chat for delete
  using (auth.uid() = sender_id);

-- ============================================================
-- 4. CAMPUS_FEED  (public read, signed-in write, author-only edit)
-- ============================================================
create table if not exists public.campus_feed (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.campus_feed
  add column if not exists author_id uuid references auth.users(id) on delete set null,
  add column if not exists title     text,
  add column if not exists text      text,
  add column if not exists author    text,
  add column if not exists likes     int  default 0,
  add column if not exists comments  jsonb default '[]'::jsonb,
  add column if not exists reactions jsonb default '{}'::jsonb,
  add column if not exists "time"    text;

alter table public.campus_feed enable row level security;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='campus_feed' loop
    execute format('drop policy if exists %I on public.campus_feed', p.policyname);
  end loop;
end $$;

create policy "feed: everyone reads"
  on public.campus_feed for select using (true);

create policy "feed: signed-in creates own"
  on public.campus_feed for insert
  with check (
    auth.uid() is not null
    and auth.uid() = author_id
    and char_length(title) between 1 and 120
    and char_length(text)  between 1 and 2000
  );

create policy "feed: author edits own"
  on public.campus_feed for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "feed: author deletes own"
  on public.campus_feed for delete
  using (auth.uid() = author_id);

-- ============================================================
-- 5. INSTRUCTOR_REVIEWS
-- ============================================================
create table if not exists public.instructor_reviews (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.instructor_reviews
  add column if not exists author_id uuid references auth.users(id) on delete set null,
  add column if not exists teacher   text,
  add column if not exists rating    text,
  add column if not exists text      text;

alter table public.instructor_reviews enable row level security;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='instructor_reviews' loop
    execute format('drop policy if exists %I on public.instructor_reviews', p.policyname);
  end loop;
end $$;

create policy "reviews: everyone reads"
  on public.instructor_reviews for select using (true);

create policy "reviews: signed-in creates own"
  on public.instructor_reviews for insert
  with check (
    auth.uid() is not null
    and auth.uid() = author_id
    and char_length(text) between 1 and 2000
    and rating in ('1','2','3','4','5')
  );

create policy "reviews: author deletes own"
  on public.instructor_reviews for delete
  using (auth.uid() = author_id);

-- ============================================================
-- 6. STUDY_GROUPS (public read; membership managed by the app)
-- ============================================================
create table if not exists public.study_groups (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.study_groups enable row level security;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='study_groups' loop
    execute format('drop policy if exists %I on public.study_groups', p.policyname);
  end loop;
end $$;

create policy "groups: everyone reads"
  on public.study_groups for select using (true);
-- (Group creation / joining semantics can be layered on later.)

-- ============================================================
-- 6b. SCHOOLS (per-school scoping)
-- ============================================================
-- Every signed-in user picks a school. Feed / groups / friends / chat
-- are all restricted to the same school. Instructor reviews are readable
-- by anyone (you can look up any school), but the writer's school is
-- attached to each row so the UI can filter by school.

create table if not exists public.schools (
  id         uuid primary key default gen_random_uuid(),
  name       text unique not null check (char_length(name) between 2 and 80),
  slug       text unique not null check (char_length(slug) between 2 and 40 and slug ~ '^[a-z0-9-]+$'),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
alter table public.schools enable row level security;

do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='schools' loop
    execute format('drop policy if exists %I on public.schools', p.policyname);
  end loop;
end $$;

create policy "schools: everyone reads"
  on public.schools for select using (true);

create policy "schools: signed-in creates"
  on public.schools for insert
  with check (auth.uid() is not null and created_by = auth.uid());

-- Seed a demo school so the app works out of the box.
insert into public.schools (name, slug)
values ('Demo University', 'demo-university')
on conflict do nothing;

-- School_id columns on scoped tables
alter table public.profiles          add column if not exists school_id uuid references public.schools(id) on delete set null;
alter table public.campus_feed       add column if not exists school_id uuid references public.schools(id) on delete set null;
alter table public.study_groups      add column if not exists school_id uuid references public.schools(id) on delete set null;
alter table public.instructor_reviews add column if not exists school_id uuid references public.schools(id) on delete set null;

-- Helper: return the caller's school_id (used inside policies).
create or replace function public.my_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id from public.profiles where user_id = auth.uid();
$$;

-- Rewrite feed / groups / reviews / friendships policies to enforce school.
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='campus_feed' loop
    execute format('drop policy if exists %I on public.campus_feed', p.policyname);
  end loop;
end $$;

create policy "feed: same-school reads"
  on public.campus_feed for select
  using (school_id is null or school_id = public.my_school_id());
create policy "feed: signed-in creates own"
  on public.campus_feed for insert
  with check (
    auth.uid() is not null
    and auth.uid() = author_id
    and school_id  = public.my_school_id()
    and char_length(title) between 1 and 120
    and char_length(text)  between 1 and 2000
  );
create policy "feed: author edits own"
  on public.campus_feed for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);
create policy "feed: author deletes own"
  on public.campus_feed for delete
  using (auth.uid() = author_id);

do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='study_groups' loop
    execute format('drop policy if exists %I on public.study_groups', p.policyname);
  end loop;
end $$;
create policy "groups: same-school reads"
  on public.study_groups for select
  using (school_id is null or school_id = public.my_school_id());

-- Reviews are globally readable (that's the point of "look up any school").
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='instructor_reviews' loop
    execute format('drop policy if exists %I on public.instructor_reviews', p.policyname);
  end loop;
end $$;
create policy "reviews: everyone reads"
  on public.instructor_reviews for select using (true);
create policy "reviews: signed-in creates own"
  on public.instructor_reviews for insert
  with check (
    auth.uid() is not null
    and auth.uid() = author_id
    and school_id  = public.my_school_id()
    and char_length(text) between 1 and 2000
    and rating in ('1','2','3','4','5')
  );
create policy "reviews: author deletes own"
  on public.instructor_reviews for delete
  using (auth.uid() = author_id);

-- Friendships: only same-school users can friend each other.
drop policy if exists "friendships: send request" on public.friendships;
create policy "friendships: send request"
  on public.friendships for insert
  with check (
    auth.uid() = requester_id
    and status = 'pending'
    and public.my_school_id() is not null
    and public.my_school_id() = (
      select school_id from public.profiles where user_id = addressee_id
    )
  );

-- ============================================================
-- 6c. HOUSEKEEPING + STUDY GROUP MEMBERSHIPS
-- ============================================================

-- Remove the accidental "HMHS" school row (any profile that pointed at it
-- gets school_id = null via the ON DELETE SET NULL relation, and will be
-- prompted to pick a school again on next sign-in).
delete from public.schools where lower(name) = 'hmhs' or lower(slug) = 'hmhs';

-- Study group members: track who joined which group per user, so member
-- counts and "am I in this group?" become real facts instead of a shared
-- boolean everyone toggled.
alter table public.study_groups add column if not exists creator_id uuid
  references auth.users(id) on delete set null;

create table if not exists public.study_group_members (
  group_id  uuid not null references public.study_groups(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table public.study_group_members enable row level security;

do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='study_group_members' loop
    execute format('drop policy if exists %I on public.study_group_members', p.policyname);
  end loop;
end $$;

-- Anyone in the same school can see who's in a group (so member counts
-- render); each user can only insert/delete their own row.
create policy "group_members: same-school reads"
  on public.study_group_members for select
  using (
    exists (
      select 1 from public.study_groups g
      where g.id = group_id
        and (g.school_id is null or g.school_id = public.my_school_id())
    )
  );
create policy "group_members: user manages own membership"
  on public.study_group_members for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Now that groups have a creator_id, extend the groups policies with
-- INSERT / UPDATE / DELETE for the creator inside their school.
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='study_groups' loop
    execute format('drop policy if exists %I on public.study_groups', p.policyname);
  end loop;
end $$;

create policy "groups: same-school reads"
  on public.study_groups for select
  using (school_id is null or school_id = public.my_school_id());

create policy "groups: signed-in creates own"
  on public.study_groups for insert
  with check (
    auth.uid() is not null
    and auth.uid() = creator_id
    and school_id  = public.my_school_id()
    and char_length(name) between 1 and 80
  );

create policy "groups: creator updates"
  on public.study_groups for update
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

create policy "groups: creator deletes"
  on public.study_groups for delete
  using (auth.uid() = creator_id);

-- ============================================================
-- 7. REALTIME
-- ============================================================
-- Make sure the tables the UI subscribes to broadcast changes.
-- Postgres has no "IF NOT EXISTS" for ALTER PUBLICATION, so we check the
-- pg_publication_tables catalog first and only add tables that are missing.
-- This makes the script safe to run repeatedly.
do $$
declare
  t text;
begin
  foreach t in array array['campus_chat','campus_feed','friendships','study_groups','study_group_members'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
