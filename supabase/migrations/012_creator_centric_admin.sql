-- Creator-centric admin restructure
-- Adds phone number to creators, plus three tables backing the new
-- Crecimiento / Calls sub-tabs: per-month stats, tracked TikTok videos,
-- and admin-only call notes.

alter table creators add column if not exists phone_number text;

create table if not exists creator_monthly_stats (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade,
  month date not null,
  gmv numeric default 0,
  gmv_projection numeric default 0,
  commission_rate numeric default 0,
  videos_posted integer default 0,
  live_hours numeric default 0,
  commissions_earned numeric default 0,
  notes text,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(creator_id, month)
);
alter table creator_monthly_stats enable row level security;
drop policy if exists "creators_read_own_stats" on creator_monthly_stats;
create policy "creators_read_own_stats" on creator_monthly_stats
  for select using (
    creator_id in (select id from creators where lower(email) = lower(auth.email()))
  );

create table if not exists creator_videos (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  tiktok_url text not null,
  converted boolean default false,
  gmv_generated numeric default 0,
  month date default date_trunc('month', current_date),
  notes text,
  created_at timestamp default now()
);
alter table creator_videos enable row level security;
drop policy if exists "creators_read_own_videos" on creator_videos;
create policy "creators_read_own_videos" on creator_videos
  for select using (
    creator_id in (select id from creators where lower(email) = lower(auth.email()))
  );

create table if not exists call_notes (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade,
  note text not null,
  call_date date default current_date,
  created_at timestamp default now()
);
alter table call_notes enable row level security;
drop policy if exists "call_notes_admin_only" on call_notes;
create policy "call_notes_admin_only" on call_notes
  for select using (false);
