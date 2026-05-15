-- Admin panel restructure + Phase 1 plumbing
--
-- Run this in the USA Supabase project before deploying the matching
-- code. Idempotent — safe to re-run.

-- 1. creator_videos: capture Spark Ads code + free-form notes per video
alter table creator_videos add column if not exists spark_code text;
alter table creator_videos add column if not exists video_notes text;

-- 2. strategy_products: frequency_type lets admin say "X videos por día" vs
--    "X videos por semana" without inventing a separate column for each cadence.
alter table strategy_products add column if not exists frequency_type text default 'day';

-- 3. strategy_videos: example-video notes explaining why it works
alter table strategy_videos add column if not exists notes text;

-- 4. campaigns: goal fields used by the new Campaigns & Applications tab
alter table campaigns add column if not exists gmv_target numeric;
alter table campaigns add column if not exists videos_required integer;
alter table campaigns add column if not exists live_hours_required numeric;

-- 5. settings: agency-wide GMV goal that the admin Dashboard renders
alter table settings add column if not exists agency_gmv_goal numeric default 0;
alter table settings add column if not exists agency_gmv_goal_month date;

-- 6. creator_notifications: in-app inbox surfaced as a banner on /dashboard
create table if not exists creator_notifications (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade,
  title text not null,
  message text,
  type text default 'info',
  is_read boolean default false,
  created_at timestamp default now()
);
alter table creator_notifications enable row level security;
drop policy if exists "creators_own_notifications" on creator_notifications;
create policy "creators_own_notifications" on creator_notifications
  for all using (
    creator_id in (select id from creators where lower(email) = lower(auth.email()))
  );

-- 7. initiation_template: global template the admin can copy onto any
--    Initiation creator's monthly strategy.
create table if not exists initiation_template (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete set null,
  external_product_name text,
  priority text default 'Hero',
  videos_per_day numeric,
  frequency_type text default 'day',
  live_hours_per_week numeric,
  gmv_target numeric,
  strategy_note text,
  hashtags text[],
  video_focus text,
  quick_checklist text[],
  order_index integer default 0,
  updated_at timestamp default now()
);

-- 8. deliverables: creators need to read/mark-done their own deliverables
--    so the "Tus pendientes" card on /dashboard works.
drop policy if exists "creators_own_deliverables" on deliverables;
drop policy if exists "creators_read_own_deliverables" on deliverables;
drop policy if exists "creators_update_own_deliverables" on deliverables;
create policy "creators_read_own_deliverables" on deliverables
  for select using (
    creator_id in (select id from creators where lower(email) = lower(auth.email()))
  );
create policy "creators_update_own_deliverables" on deliverables
  for update using (
    creator_id in (select id from creators where lower(email) = lower(auth.email()))
  );
