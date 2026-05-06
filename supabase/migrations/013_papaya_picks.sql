-- Papaya Picks: curated trending products with auto-computed score.
-- Score formula:
--   (units_sold_this_week / 10) * 0.3
--   + growth_percentage * 0.3
--   + (100 - LEAST(affiliates_count, 100)) * 0.2
--   + (100 - LEAST(videos_count, 100)) * 0.2

create table if not exists papaya_picks (
  id uuid primary key default gen_random_uuid(),
  product_name text not null,
  brand_name text,
  niche text,
  commission_rate numeric,
  product_link text,
  sample_link text,
  product_image_url text,
  units_sold_this_week integer default 0,
  growth_percentage numeric default 0,
  affiliates_count integer default 0,
  videos_count integer default 0,
  papaya_pick_score numeric generated always as (
    (units_sold_this_week::numeric / 10 * 0.3)
    + (growth_percentage * 0.3)
    + ((100 - LEAST(affiliates_count, 100)) * 0.2)
    + ((100 - LEAST(videos_count, 100)) * 0.2)
  ) stored,
  why_its_a_pick text,
  example_video_url text,
  min_level text default 'Foundation',
  is_active boolean default true,
  expires_at timestamp,
  created_at timestamp default now()
);
alter table papaya_picks enable row level security;
drop policy if exists "picks_read_active" on papaya_picks;
create policy "picks_read_active" on papaya_picks
  for select to authenticated using (is_active = true and (expires_at is null or expires_at > now()));
