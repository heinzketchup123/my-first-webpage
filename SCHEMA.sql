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
  add column if not exists created_at   timestamptz not null default now(),
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
  add column if not exists created_at timestamptz not null default now(),
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
  add column if not exists created_at timestamptz not null default now(),
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

-- The table may predate this script, so add every column the app uses.
alter table public.study_groups
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists name       text,
  add column if not exists course     text,
  add column if not exists schedule   text,
  add column if not exists location   text,
  add column if not exists "max"      int not null default 6,
  add column if not exists host       text,
  add column if not exists topics     text[] not null default '{}',
  add column if not exists roster     text[] not null default '{}';

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
-- 6d. TEACHER PAGES
-- ============================================================
-- Each teacher belongs to one school and has a page made of posts:
--   review       — rating, difficulty, would-take-again, tags, text
--   requirement  — course requirements (textbook, grading, workload...)
--   note         — tips / heads-ups / resources about the teacher
-- Everyone can read every school's teachers. Only students at the
-- teacher's school can add posts.

create table if not exists public.teachers (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  name       text not null check (char_length(name) between 2 and 80),
  subject    text check (subject is null or char_length(subject) <= 60),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists teachers_school_name_uniq
  on public.teachers (school_id, lower(name));

alter table public.teachers enable row level security;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='teachers' loop
    execute format('drop policy if exists %I on public.teachers', p.policyname);
  end loop;
end $$;
create policy "teachers: everyone reads"
  on public.teachers for select using (true);
create policy "teachers: students add to own school"
  on public.teachers for insert
  with check (auth.uid() is not null and created_by = auth.uid()
              and school_id = public.my_school_id());
create policy "teachers: creator edits"
  on public.teachers for update
  using (auth.uid() = created_by) with check (auth.uid() = created_by);

create table if not exists public.teacher_posts (
  id               uuid primary key default gen_random_uuid(),
  teacher_id       uuid not null references public.teachers(id) on delete cascade,
  author_id        uuid references auth.users(id) on delete cascade,
  author_name      text check (author_name is null or char_length(author_name) <= 40),
  kind             text not null check (kind in ('review','requirement','note')),
  course           text check (course is null or char_length(course) <= 60),
  rating           smallint check (rating between 1 and 5),
  difficulty       smallint check (difficulty between 1 and 5),
  would_take_again boolean,
  tags             text[] not null default '{}' check (coalesce(array_length(tags, 1), 0) <= 8),
  body             text not null check (char_length(body) between 1 and 2000),
  legacy_review_id uuid unique,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz,
  check (kind <> 'review' or rating is not null)
);
create index if not exists teacher_posts_teacher_idx
  on public.teacher_posts (teacher_id, created_at desc);
-- One review per student per teacher (they can edit it instead).
create unique index if not exists teacher_posts_one_review_per_user
  on public.teacher_posts (teacher_id, author_id) where kind = 'review';

alter table public.teacher_posts enable row level security;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='teacher_posts' loop
    execute format('drop policy if exists %I on public.teacher_posts', p.policyname);
  end loop;
end $$;
create policy "teacher_posts: everyone reads"
  on public.teacher_posts for select using (true);
create policy "teacher_posts: same-school students write"
  on public.teacher_posts for insert
  with check (
    auth.uid() is not null and auth.uid() = author_id
    and exists (select 1 from public.teachers t
                where t.id = teacher_id and t.school_id = public.my_school_id())
  );
create policy "teacher_posts: author edits own"
  on public.teacher_posts for update
  using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "teacher_posts: author deletes own"
  on public.teacher_posts for delete using (auth.uid() = author_id);

-- "Helpful" votes on posts.
create table if not exists public.teacher_post_votes (
  post_id    uuid not null references public.teacher_posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.teacher_post_votes enable row level security;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='teacher_post_votes' loop
    execute format('drop policy if exists %I on public.teacher_post_votes', p.policyname);
  end loop;
end $$;
create policy "votes: everyone reads"
  on public.teacher_post_votes for select using (true);
create policy "votes: user casts own"
  on public.teacher_post_votes for insert with check (auth.uid() = user_id);
create policy "votes: user removes own"
  on public.teacher_post_votes for delete using (auth.uid() = user_id);

-- Aggregated numbers for the directory and the page header.
drop view if exists public.teacher_stats;
create view public.teacher_stats with (security_invoker = true) as
select
  t.id, t.school_id, t.name, t.subject, t.created_at,
  count(p.id) filter (where p.kind = 'review')                        as review_count,
  round(avg(p.rating)     filter (where p.kind = 'review'), 2)        as avg_rating,
  round(avg(p.difficulty) filter (where p.kind = 'review'), 2)        as avg_difficulty,
  round(100.0 * avg(case when p.would_take_again then 1
                         when p.would_take_again = false then 0 end)
        filter (where p.kind = 'review'))                             as take_again_pct,
  count(p.id)                                                         as post_count
from public.teachers t
left join public.teacher_posts p on p.teacher_id = t.id
group by t.id;
grant select on public.teacher_stats to anon, authenticated;

-- Copy old instructor_reviews into teacher pages (safe to re-run).
insert into public.teachers (school_id, name, created_by)
select distinct on (r.school_id, lower(trim(r.teacher)))
       r.school_id, trim(r.teacher), r.author_id
from public.instructor_reviews r
where r.school_id is not null
  and char_length(trim(coalesce(r.teacher, ''))) between 2 and 80
order by r.school_id, lower(trim(r.teacher)), r.created_at
on conflict do nothing;

insert into public.teacher_posts
  (teacher_id, author_id, author_name, kind, rating, body, legacy_review_id, created_at)
select t.id, r.author_id, 'Student', 'review', r.rating::smallint, r.text, r.id, r.created_at
from public.instructor_reviews r
join public.teachers t
  on t.school_id = r.school_id and lower(t.name) = lower(trim(r.teacher))
where r.rating in ('1','2','3','4','5')
  and char_length(coalesce(r.text, '')) between 1 and 2000
on conflict do nothing;

-- ============================================================
-- 6e. EVENT CALENDAR
-- ============================================================
create table if not exists public.campus_events (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  title       text not null check (char_length(title) between 2 and 100),
  description text check (description is null or char_length(description) <= 1000),
  location    text check (location is null or char_length(location) <= 100),
  starts_at   timestamptz not null,
  all_day     boolean not null default false,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists campus_events_school_start_idx
  on public.campus_events (school_id, starts_at);

create table if not exists public.event_rsvps (
  event_id   uuid not null references public.campus_events(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.campus_events enable row level security;
alter table public.event_rsvps  enable row level security;
do $$ declare p record; begin
  for p in select policyname, tablename from pg_policies
           where schemaname='public' and tablename in ('campus_events','event_rsvps') loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

create policy "events: same-school reads"
  on public.campus_events for select using (school_id = public.my_school_id());
create policy "events: students add to own school"
  on public.campus_events for insert
  with check (auth.uid() is not null and created_by = auth.uid()
              and school_id = public.my_school_id());
create policy "events: creator edits"
  on public.campus_events for update
  using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "events: creator deletes"
  on public.campus_events for delete using (auth.uid() = created_by);

create policy "rsvps: same-school reads"
  on public.event_rsvps for select
  using (exists (select 1 from public.campus_events e
                 where e.id = event_id and e.school_id = public.my_school_id()));
create policy "rsvps: user manages own"
  on public.event_rsvps for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 6f. ADMINS
-- ============================================================
-- Admin status lives in its own table (not on profiles, which users can
-- edit). There are no insert/update/delete policies, so admins can only
-- be granted from this SQL editor.
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists "admins: see own row" on public.admins;
create policy "admins: see own row"
  on public.admins for select using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Grant admin to lh3801866 (matched by handle or email name).
insert into public.admins (user_id)
select user_id from public.profiles where lower(handle) = 'lh3801866'
union
select id from auth.users where lower(split_part(email, '@', 1)) = 'lh3801866'
on conflict do nothing;

-- Admins can delete anything moderatable, in addition to authors.
drop policy if exists "admin: delete feed posts" on public.campus_feed;
create policy "admin: delete feed posts" on public.campus_feed for delete using (public.is_admin());
drop policy if exists "admin: delete groups" on public.study_groups;
create policy "admin: delete groups" on public.study_groups for delete using (public.is_admin());
drop policy if exists "admin: delete old reviews" on public.instructor_reviews;
create policy "admin: delete old reviews" on public.instructor_reviews for delete using (public.is_admin());
drop policy if exists "admin: delete teachers" on public.teachers;
create policy "admin: delete teachers" on public.teachers for delete using (public.is_admin());
drop policy if exists "admin: delete teacher posts" on public.teacher_posts;
create policy "admin: delete teacher posts" on public.teacher_posts for delete using (public.is_admin());
drop policy if exists "admin: delete events" on public.campus_events;
create policy "admin: delete events" on public.campus_events for delete using (public.is_admin());

-- Deleting a school removes everything scoped to it in one step (so its
-- feed posts don't become school-less and visible to everyone).
create or replace function public.admin_delete_school(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can delete schools';
  end if;
  delete from public.campus_feed        where school_id = target;
  delete from public.study_groups       where school_id = target;
  delete from public.instructor_reviews where school_id = target;
  delete from public.schools            where id = target;  -- teachers + events cascade
end $$;
revoke all on function public.admin_delete_school(uuid) from public, anon;
grant execute on function public.admin_delete_school(uuid) to authenticated;

-- ============================================================
-- 6g. SCHOOL JOIN SAFEGUARDS
-- ============================================================
-- The school list stays public (anyone, signed in or not, on any device,
-- can read it). Joining is controlled per school:
--   open      anyone can join (default — Demo University stays open)
--   code      needs a join code (stored in a table only admins can read)
--   domain    needs a confirmed email at one of the school's domains
--   approval  sends a request that an admin approves or denies
-- The app can't bypass this: a trigger rejects any change to
-- profiles.school_id that doesn't come through join_school() or an admin.

alter table public.schools
  add column if not exists join_mode text not null default 'open',
  add column if not exists allowed_domains text[] not null default '{}';
do $$ begin
  alter table public.schools add constraint schools_join_mode_chk
    check (join_mode in ('open','code','domain','approval'));
exception when duplicate_object then null; end $$;

-- Make sure the list is readable by everyone, signed in or not.
drop policy if exists "schools: everyone reads" on public.schools;
create policy "schools: everyone reads" on public.schools for select using (true);
grant select on public.schools to anon, authenticated;

create table if not exists public.school_join_codes (
  school_id  uuid primary key references public.schools(id) on delete cascade,
  join_code  text not null check (char_length(join_code) between 4 and 40),
  updated_at timestamptz not null default now()
);
alter table public.school_join_codes enable row level security;
drop policy if exists "join codes: admins only" on public.school_join_codes;
create policy "join codes: admins only" on public.school_join_codes
  for select using (public.is_admin());

create table if not exists public.school_join_requests (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending','approved','denied')),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  unique (school_id, user_id)
);
alter table public.school_join_requests enable row level security;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='school_join_requests' loop
    execute format('drop policy if exists %I on public.school_join_requests', p.policyname);
  end loop;
end $$;
create policy "join requests: see own or admin"
  on public.school_join_requests for select
  using (user_id = auth.uid() or public.is_admin());
create policy "join requests: cancel own"
  on public.school_join_requests for delete using (user_id = auth.uid());

-- Guard: profiles.school_id can only be set to a school through
-- join_school() / admin functions (which set app.allow_school_change),
-- or from the SQL editor (no signed-in user). Leaving (null) is allowed.
create or replace function public.guard_profile_school()
returns trigger
language plpgsql
as $$
begin
  if new.school_id is not null
     and new.school_id is distinct from (case when tg_op = 'UPDATE' then old.school_id end)
     and auth.uid() is not null
     and coalesce(current_setting('app.allow_school_change', true), '') <> 'on' then
    raise exception 'Use the school picker to join a school';
  end if;
  return new;
end $$;
drop trigger if exists guard_profile_school on public.profiles;
create trigger guard_profile_school
  before insert or update of school_id on public.profiles
  for each row execute function public.guard_profile_school();

create or replace function public.join_school(target uuid, code text default null)
returns text   -- 'joined' or 'pending'
language plpgsql
security definer
set search_path = public
as $$
declare
  s        public.schools%rowtype;
  u_email  text;
  u_conf   timestamptz;
  dom      text;
  secret   text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select * into s from public.schools where id = target;
  if not found then raise exception 'That school no longer exists'; end if;

  if not public.is_admin() then
    if s.join_mode = 'code' then
      select join_code into secret from public.school_join_codes where school_id = target;
      if secret is null or code is null or lower(trim(code)) <> lower(trim(secret)) then
        raise exception 'That join code is not right';
      end if;
    elsif s.join_mode = 'domain' then
      select email, email_confirmed_at into u_email, u_conf from auth.users where id = auth.uid();
      dom := lower(split_part(u_email, '@', 2));
      if u_conf is null then
        raise exception 'Confirm your email address first';
      end if;
      if not exists (select 1 from unnest(s.allowed_domains) d
                     where dom = lower(d) or dom like '%.' || lower(d)) then
        raise exception 'This school requires an email ending in @%', array_to_string(s.allowed_domains, ' or @');
      end if;
    elsif s.join_mode = 'approval' then
      insert into public.school_join_requests (school_id, user_id)
      values (target, auth.uid())
      on conflict (school_id, user_id) do update
        set status = 'pending', created_at = now(), reviewed_at = null, reviewed_by = null;
      return 'pending';
    end if;
  end if;

  perform set_config('app.allow_school_change', 'on', true);
  update public.profiles set school_id = target where user_id = auth.uid();
  return 'joined';
end $$;
revoke all on function public.join_school(uuid, text) from public, anon;
grant execute on function public.join_school(uuid, text) to authenticated;

create or replace function public.admin_set_school_join(
  target uuid, mode text, code text default null, domains text[] default '{}')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Only admins can change join rules'; end if;
  if mode not in ('open','code','domain','approval') then raise exception 'Unknown join mode'; end if;
  if mode = 'code' and char_length(coalesce(trim(code), '')) < 4 then
    raise exception 'Join codes need at least 4 characters';
  end if;
  if mode = 'domain' and coalesce(array_length(domains, 1), 0) = 0 then
    raise exception 'Add at least one email domain';
  end if;
  update public.schools
     set join_mode = mode,
         allowed_domains = coalesce((select array_agg(lower(trim(both '@ ' from d)))
                                     from unnest(domains) d where trim(d) <> ''), '{}')
   where id = target;
  if mode = 'code' then
    insert into public.school_join_codes (school_id, join_code) values (target, trim(code))
    on conflict (school_id) do update set join_code = excluded.join_code, updated_at = now();
  end if;
end $$;
revoke all on function public.admin_set_school_join(uuid, text, text, text[]) from public, anon;
grant execute on function public.admin_set_school_join(uuid, text, text, text[]) to authenticated;

create or replace function public.admin_review_join_request(request uuid, approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare r public.school_join_requests%rowtype;
begin
  if not public.is_admin() then raise exception 'Only admins can review requests'; end if;
  select * into r from public.school_join_requests where id = request;
  if not found then raise exception 'Request not found'; end if;
  update public.school_join_requests
     set status = case when approve then 'approved' else 'denied' end,
         reviewed_at = now(), reviewed_by = auth.uid()
   where id = request;
  if approve then
    perform set_config('app.allow_school_change', 'on', true);
    update public.profiles set school_id = r.school_id where user_id = r.user_id;
  end if;
end $$;
revoke all on function public.admin_review_join_request(uuid, boolean) from public, anon;
grant execute on function public.admin_review_join_request(uuid, boolean) to authenticated;

-- ============================================================
-- 6h. FEED REACTIONS, COMMENTS + NOTIFICATIONS
-- ============================================================
-- Likes, emoji reactions and comments used to be counters stored on the
-- post itself. Only a post's author may edit a post, so everyone else's
-- taps were silently dropped, and nothing recorded WHO reacted, so a
-- second tap added another instead of removing yours. Each one is now its
-- own row per user (tap again = delete your row).
--
-- Notifications are written by triggers, never by the app, so nobody can
-- fake one. Each user can only read, mark read and clear their own.

-- campus_feed.id may be uuid or bigint depending on how the project was
-- first created, so the post_id columns copy whatever type it really is.
do $$
declare idtype text;
begin
  select format_type(a.atttypid, a.atttypmod) into idtype
  from pg_attribute a
  where a.attrelid = 'public.campus_feed'::regclass and a.attname = 'id';

  execute format($f$
    create table if not exists public.feed_reactions (
      post_id    %s not null references public.campus_feed(id) on delete cascade,
      user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
      emoji      text not null check (emoji in ('like','thumbs','heart','laugh','party','fire')),
      anonymous  boolean not null default false,
      created_at timestamptz not null default now(),
      primary key (post_id, user_id, emoji)
    )$f$, idtype);

  execute format($f$
    create table if not exists public.feed_comments (
      id         uuid primary key default gen_random_uuid(),
      post_id    %s not null references public.campus_feed(id) on delete cascade,
      author_id  uuid default auth.uid() references auth.users(id) on delete set null,
      author     text,
      anonymous  boolean not null default false,
      legacy     boolean not null default false,
      body       text not null check (char_length(body) between 1 and 500),
      created_at timestamptz not null default now()
    )$f$, idtype);
end $$;
create index if not exists feed_comments_post_idx on public.feed_comments (post_id, created_at);

alter table public.feed_reactions enable row level security;
alter table public.feed_comments  enable row level security;
do $$ declare p record; begin
  for p in select policyname, tablename from pg_policies
           where schemaname='public' and tablename in ('feed_reactions','feed_comments') loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- You can see reactions/comments on any post you can see (same school).
create policy "reactions: visible with post"
  on public.feed_reactions for select
  using (exists (select 1 from public.campus_feed f where f.id = post_id));
create policy "reactions: add own"
  on public.feed_reactions for insert
  with check (user_id = auth.uid()
              and exists (select 1 from public.campus_feed f where f.id = post_id));
create policy "reactions: remove own"
  on public.feed_reactions for delete using (user_id = auth.uid());

create policy "comments: visible with post"
  on public.feed_comments for select
  using (exists (select 1 from public.campus_feed f where f.id = post_id));
create policy "comments: add own"
  on public.feed_comments for insert
  with check (author_id = auth.uid()
              and exists (select 1 from public.campus_feed f where f.id = post_id));
create policy "comments: author, post owner or admin deletes"
  on public.feed_comments for delete
  using (author_id = auth.uid() or public.is_admin()
         or exists (select 1 from public.campus_feed f where f.id = post_id and f.author_id = auth.uid()));

-- The shown name on a comment comes from the profile (or "Anonymous
-- Student"), not from whatever the app sends, so nobody can pose as someone else.
create or replace function public.feed_comment_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.author_id  := auth.uid();
    new.legacy     := false;
    new.created_at := now();
    new.author     := case when new.anonymous then 'Anonymous Student'
                           else coalesce((select handle from public.profiles where user_id = auth.uid()), 'Student') end;
  end if;
  return new;
end $$;
drop trigger if exists feed_comment_defaults on public.feed_comments;
create trigger feed_comment_defaults before insert on public.feed_comments
  for each row execute function public.feed_comment_defaults();

-- Copy comments stored the old way (inside the post) into the new table, once.
do $$
begin
  insert into public.feed_comments (post_id, author, body, legacy, created_at)
  select f.id,
         left(coalesce(nullif(trim(c->>'author'), ''), 'Student'), 40),
         left(trim(c->>'text'), 500),
         true,
         f.created_at
  from public.campus_feed f
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(to_jsonb(f.comments)) = 'array' then to_jsonb(f.comments) else '[]'::jsonb end) c
  where jsonb_typeof(c) = 'object'
    and char_length(trim(coalesce(c->>'text', ''))) > 0
    and not exists (select 1 from public.feed_comments fc where fc.post_id = f.id and fc.legacy);
exception when others then
  raise notice 'Skipped copying old comments: %', sqlerrm;
end $$;

-- ---- Notifications ----
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,  -- who receives it
  actor_id   uuid references auth.users(id) on delete set null,          -- null when anonymous
  actor_name text,
  kind       text not null,     -- dm, like, reaction, comment, friend_request, friend_accept,
                                -- join_request, join_decision, group_join, helpful, event_rsvp
  ref_id     text,              -- post / friend / request / group / event id
  body       text,
  meta       text,
  times      int not null default 1,   -- repeats are folded into one (e.g. "3 messages")
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='notifications' loop
    execute format('drop policy if exists %I on public.notifications', p.policyname);
  end loop;
end $$;
create policy "notifications: read own"   on public.notifications for select using (user_id = auth.uid());
create policy "notifications: update own" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications: clear own"  on public.notifications for delete using (user_id = auth.uid());
-- The app may only flip read_at; it can never create or rewrite one.
revoke insert, update on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function public.notif_name(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(display_name), ''), handle) from public.profiles where user_id = uid;
$$;

-- Add a notification, or fold it into an unread one for the same thing.
create or replace function public.push_notification(
  recipient uuid, actor uuid, actor_label text, nkind text, ref text, nbody text, nmeta text default null)
returns void language plpgsql security definer set search_path = public as $$
declare existing uuid;
begin
  if recipient is null or recipient = actor then return; end if;
  select id into existing from public.notifications
   where user_id = recipient and kind = nkind and ref_id is not distinct from ref
     and actor_id is not distinct from actor and read_at is null
   order by created_at desc limit 1;
  if existing is not null then
    update public.notifications
       set times = times + 1, body = nbody, meta = coalesce(nmeta, meta),
           actor_name = actor_label, created_at = now()
     where id = existing;
  else
    insert into public.notifications (user_id, actor_id, actor_name, kind, ref_id, body, meta)
    values (recipient, actor, actor_label, nkind, ref, nbody, nmeta);
  end if;
  delete from public.notifications where user_id = recipient and created_at < now() - interval '60 days';
end $$;

-- Undo one unread notification (e.g. someone took their reaction back).
create or replace function public.retract_notification(recipient uuid, actor uuid, nkind text, ref text)
returns void language plpgsql security definer set search_path = public as $$
declare nid uuid; n int;
begin
  select id, times into nid, n from public.notifications
   where user_id = recipient and kind = nkind and ref_id is not distinct from ref
     and actor_id is not distinct from actor and read_at is null
   order by created_at desc limit 1;
  if nid is null then return; end if;
  if n > 1 then update public.notifications set times = times - 1 where id = nid;
  else delete from public.notifications where id = nid; end if;
end $$;

revoke all on function public.push_notification(uuid, uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.retract_notification(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.notif_name(uuid) from public, anon, authenticated;

-- Direct messages
create or replace function public.notify_chat()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.push_notification(new.recipient_id, new.sender_id,
    coalesce(public.notif_name(new.sender_id), 'A friend'), 'dm', new.sender_id::text, left(coalesce(new.text, ''), 90));
  return null;
end $$;
drop trigger if exists notify_chat on public.campus_chat;
create trigger notify_chat after insert on public.campus_chat
  for each row execute function public.notify_chat();

-- Likes + emoji reactions
create or replace function public.notify_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record; owner uuid; ptitle text; actor uuid; nkind text;
begin
  if tg_op = 'INSERT' then r := new; else r := old; end if;
  select author_id, title into owner, ptitle from public.campus_feed where id = r.post_id;
  if owner is null or owner = r.user_id then return null; end if;
  actor := case when r.anonymous then null else r.user_id end;
  nkind := case when r.emoji = 'like' then 'like' else 'reaction' end;
  if tg_op = 'INSERT' then
    perform public.push_notification(owner, actor,
      case when r.anonymous then 'Someone' else coalesce(public.notif_name(r.user_id), 'Someone') end,
      nkind, r.post_id::text, left(coalesce(ptitle, ''), 90), r.emoji);
  else
    perform public.retract_notification(owner, actor, nkind, r.post_id::text);
  end if;
  return null;
end $$;
drop trigger if exists notify_reaction on public.feed_reactions;
create trigger notify_reaction after insert or delete on public.feed_reactions
  for each row execute function public.notify_reaction();

-- Comments
create or replace function public.notify_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid; ptitle text;
begin
  if new.legacy then return null; end if;
  select author_id, title into owner, ptitle from public.campus_feed where id = new.post_id;
  if owner is null or owner = new.author_id then return null; end if;
  perform public.push_notification(owner,
    case when new.anonymous then null else new.author_id end,
    case when new.anonymous then 'Someone' else coalesce(public.notif_name(new.author_id), new.author, 'Someone') end,
    'comment', new.post_id::text, left(new.body, 90), left(coalesce(ptitle, ''), 90));
  return null;
end $$;
drop trigger if exists notify_comment on public.feed_comments;
create trigger notify_comment after insert on public.feed_comments
  for each row execute function public.notify_comment();

-- A deleted post takes its notifications with it.
create or replace function public.cleanup_post_notifications()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.notifications where kind in ('like','reaction','comment') and ref_id = old.id::text;
  return null;
end $$;
drop trigger if exists cleanup_post_notifications on public.campus_feed;
create trigger cleanup_post_notifications after delete on public.campus_feed
  for each row execute function public.cleanup_post_notifications();

-- Friend requests
create or replace function public.notify_friendship()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform public.push_notification(new.addressee_id, new.requester_id,
      coalesce(public.notif_name(new.requester_id), 'Someone'), 'friend_request', new.requester_id::text, null);
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status is distinct from 'accepted' then
    perform public.push_notification(new.requester_id, new.addressee_id,
      coalesce(public.notif_name(new.addressee_id), 'Someone'), 'friend_accept', new.addressee_id::text, null);
    update public.notifications set read_at = now()
     where user_id = new.addressee_id and kind = 'friend_request'
       and ref_id = new.requester_id::text and read_at is null;
  elsif tg_op = 'UPDATE' and new.status <> 'pending' then
    update public.notifications set read_at = now()
     where user_id = new.addressee_id and kind = 'friend_request'
       and ref_id = new.requester_id::text and read_at is null;
  elsif tg_op = 'DELETE' and old.status = 'pending' then
    delete from public.notifications
     where user_id = old.addressee_id and kind = 'friend_request'
       and ref_id = old.requester_id::text and read_at is null;
  end if;
  return null;
end $$;
drop trigger if exists notify_friendship on public.friendships;
create trigger notify_friendship after insert or update or delete on public.friendships
  for each row execute function public.notify_friendship();

-- School join requests (admins get the request, the student gets the answer)
create or replace function public.notify_join_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare a record; sname text;
begin
  if tg_op = 'DELETE' then
    delete from public.notifications where kind = 'join_request' and ref_id = old.id::text and read_at is null;
    return null;
  end if;
  select name into sname from public.schools where id = new.school_id;
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from 'pending') then
    for a in select user_id from public.admins loop
      perform public.push_notification(a.user_id, new.user_id,
        coalesce(public.notif_name(new.user_id), 'A student'), 'join_request', new.id::text, sname);
    end loop;
  elsif tg_op = 'UPDATE' and new.status in ('approved','denied') and old.status = 'pending' then
    perform public.push_notification(new.user_id, null, 'School admin', 'join_decision',
      new.id::text, sname, new.status);
    update public.notifications set read_at = now()
     where kind = 'join_request' and ref_id = new.id::text and read_at is null;
  end if;
  return null;
end $$;
drop trigger if exists notify_join_request on public.school_join_requests;
create trigger notify_join_request after insert or update or delete on public.school_join_requests
  for each row execute function public.notify_join_request();

-- Someone joined (or left) your study group
create or replace function public.notify_group_join()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record; owner uuid; gname text;
begin
  if tg_op = 'INSERT' then r := new; else r := old; end if;
  select creator_id, name into owner, gname from public.study_groups where id = r.group_id;
  if owner is null or owner = r.user_id then return null; end if;
  if tg_op = 'INSERT' then
    perform public.push_notification(owner, r.user_id,
      coalesce(public.notif_name(r.user_id), 'Someone'), 'group_join', r.group_id::text, gname);
  else
    perform public.retract_notification(owner, r.user_id, 'group_join', r.group_id::text);
  end if;
  return null;
end $$;
drop trigger if exists notify_group_join on public.study_group_members;
create trigger notify_group_join after insert or delete on public.study_group_members
  for each row execute function public.notify_group_join();

-- Your teacher review / note was marked helpful (voters stay unnamed)
create or replace function public.notify_helpful()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record; owner uuid; teacher uuid; pbody text;
begin
  if tg_op = 'INSERT' then r := new; else r := old; end if;
  select author_id, teacher_id, body into owner, teacher, pbody from public.teacher_posts where id = r.post_id;
  if owner is null or owner = r.user_id then return null; end if;
  if tg_op = 'INSERT' then
    perform public.push_notification(owner, null, 'Someone', 'helpful', r.post_id::text,
      left(coalesce(pbody, ''), 90), teacher::text);
  else
    perform public.retract_notification(owner, null, 'helpful', r.post_id::text);
  end if;
  return null;
end $$;
drop trigger if exists notify_helpful on public.teacher_post_votes;
create trigger notify_helpful after insert or delete on public.teacher_post_votes
  for each row execute function public.notify_helpful();

-- People RSVP'd to an event you created
create or replace function public.notify_rsvp()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record; owner uuid; etitle text;
begin
  if tg_op = 'INSERT' then r := new; else r := old; end if;
  select created_by, title into owner, etitle from public.campus_events where id = r.event_id;
  if owner is null or owner = r.user_id then return null; end if;
  if tg_op = 'INSERT' then
    perform public.push_notification(owner, null, 'Someone', 'event_rsvp', r.event_id::text, etitle);
  else
    perform public.retract_notification(owner, null, 'event_rsvp', r.event_id::text);
  end if;
  return null;
end $$;
drop trigger if exists notify_rsvp on public.event_rsvps;
create trigger notify_rsvp after insert or delete on public.event_rsvps
  for each row execute function public.notify_rsvp();

-- Friend requests and join requests that were already waiting get a
-- notification now, so nothing pending is missed.
insert into public.notifications (user_id, actor_id, actor_name, kind, ref_id, created_at)
select f.addressee_id, f.requester_id, coalesce(public.notif_name(f.requester_id), 'Someone'),
       'friend_request', f.requester_id::text, f.created_at
from public.friendships f
where f.status = 'pending'
  and not exists (select 1 from public.notifications n
                  where n.user_id = f.addressee_id and n.kind = 'friend_request'
                    and n.ref_id = f.requester_id::text);

insert into public.notifications (user_id, actor_id, actor_name, kind, ref_id, body, created_at)
select a.user_id, r.user_id, coalesce(public.notif_name(r.user_id), 'A student'),
       'join_request', r.id::text, s.name, r.created_at
from public.school_join_requests r
join public.schools s on s.id = r.school_id
cross join public.admins a
where r.status = 'pending'
  and not exists (select 1 from public.notifications n
                  where n.user_id = a.user_id and n.kind = 'join_request' and n.ref_id = r.id::text);

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
  foreach t in array array['campus_chat','campus_feed','friendships','study_groups','study_group_members',
                           'teachers','teacher_posts','teacher_post_votes',
                           'campus_events','event_rsvps','school_join_requests','schools',
                           'feed_reactions','feed_comments','notifications'] loop
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
