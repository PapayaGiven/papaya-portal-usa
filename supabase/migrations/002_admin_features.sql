-- Add new columns to products
alter table products
  add column if not exists image_url text,
  add column if not exists product_link text,
  add column if not exists tags text[] default '{}';

-- Add new columns to campaigns
alter table campaigns
  add column if not exists brand_logo_url text,
  add column if not exists product_id uuid references products(id) on delete set null,
  add column if not exists budget numeric,
  add column if not exists product_link text,
  add column if not exists sample_available boolean default false;

-- Create campaign_applications table
create table if not exists campaign_applications (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  creator_id uuid references creators(id) on delete cascade,
  posts_offered integer,
  live_hours_offered numeric,
  price_offered numeric,
  created_at timestamp default now()
);

alter table campaign_applications enable row level security;

create policy "creators_apply" on campaign_applications
  for insert to authenticated with check (true);

create policy "creators_read_own_applications" on campaign_applications
  for select using (
    creator_id in (select id from creators where email = auth.email())
  );
