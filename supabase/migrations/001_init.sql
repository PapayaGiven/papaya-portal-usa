-- ============================================================
-- Papaya Social Club — Database Setup
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Creators
create table if not exists creators (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  level text default 'Initiation',
  gmv numeric default 0,
  gmv_target numeric default 300,
  streak integer default 0,
  cohort_rank integer,
  hero_product_id uuid,
  is_active boolean default true,
  created_at timestamp default now()
);

-- Products
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  commission_rate numeric,
  conversion_rate numeric,
  is_exclusive boolean default false,
  niche text,
  created_at timestamp default now()
);

-- Tasks
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade,
  date date default current_date,
  task_name text,
  product_id uuid references products(id) on delete set null,
  is_hero boolean default false,
  completed boolean default false,
  created_at timestamp default now()
);

-- Campaigns
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null,
  description text,
  commission_rate numeric,
  spots_left integer,
  deadline timestamp,
  min_level text default 'Initiation',
  status text default 'active',
  created_at timestamp default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table creators  enable row level security;
alter table products   enable row level security;
alter table tasks      enable row level security;
alter table campaigns  enable row level security;

-- Creators: each creator sees/updates only their own row
create policy "creators_read_own" on creators
  for select using (email = auth.email());

create policy "creators_update_own" on creators
  for update using (email = auth.email());

-- Products: any authenticated user can read
create policy "products_read_all" on products
  for select to authenticated using (true);

-- Tasks: creators can read and update their own tasks
create policy "tasks_read_own" on tasks
  for select using (
    creator_id in (select id from creators where email = auth.email())
  );

create policy "tasks_update_own" on tasks
  for update using (
    creator_id in (select id from creators where email = auth.email())
  );

-- Campaigns: authenticated users see active campaigns
create policy "campaigns_read_active" on campaigns
  for select to authenticated using (status = 'active');

-- ============================================================
-- Seed Data
-- ============================================================

insert into products (name, commission_rate, conversion_rate, is_exclusive, niche) values
  ('Hydra Face Serum',    22, 4.8, false, 'Beauty'),
  ('Collagen Eye Patches',25, 5.2, true,  'Skincare'),
  ('Keratin Hair Mask',   28, 3.9, true,  'Haircare'),
  ('Vitamin C Glow Drops',18, 4.1, false, 'Beauty'),
  ('Peptid Repair Creme', 20, 4.5, false, 'Skincare')
on conflict do nothing;

insert into campaigns (brand_name, description, commission_rate, spots_left, deadline, min_level, status) values
  ('GlowLab',
   'Beauty-Routine Integration, mind. 10k Follower',
   22, 3, now() + interval '18 hours', 'Rising', 'active'),
  ('NaturePure',
   'Bio-Wellness Content & Morning Routines',
   18, 8, now() + interval '5 days', 'Initiation', 'active'),
  ('FitLife Pro',
   'Fitness Creators, Workout-Integration',
   15, 5, now() + interval '3 days', 'Pro', 'active')
on conflict do nothing;

-- ============================================================
-- NOTE for TikTok Shop API integration (future)
-- ============================================================
-- The `gmv` field on `creators` is intentionally a plain numeric column.
-- A future webhook or cron job can call:
--   UPDATE creators SET gmv = <new_value> WHERE email = <creator_email>
-- using the service role key, bypassing RLS.
-- The updateCreatorGMV() server action in app/admin/actions.ts
-- follows the same pattern and automatically recalculates level.
