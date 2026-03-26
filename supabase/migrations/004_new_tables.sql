-- Personal GMV goal on creators
alter table creators add column if not exists personal_gmv_goal numeric default 0;

-- Daily checklist (resets per day via date column)
create table if not exists daily_checklist (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade,
  strategy_product_id uuid references strategy_products(id) on delete cascade,
  date date default current_date,
  video_posted boolean default false,
  live_done boolean default false,
  created_at timestamp default now(),
  unique (creator_id, strategy_product_id, date)
);
alter table daily_checklist enable row level security;
create policy "creators_own_checklist" on daily_checklist
  for all using (
    creator_id in (select id from creators where email = auth.email())
  );

-- Product requests
create table if not exists product_requests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade,
  product_name text not null,
  brand_name text not null,
  reason text,
  status text default 'pending',
  created_at timestamp default now()
);
alter table product_requests enable row level security;
create policy "creators_insert_requests" on product_requests
  for insert to authenticated with check (true);
create policy "creators_read_own_requests" on product_requests
  for select using (
    creator_id in (select id from creators where email = auth.email())
  );
