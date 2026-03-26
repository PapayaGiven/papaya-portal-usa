create table strategies (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade,
  month date not null,
  created_at timestamp default now(),
  unique(creator_id, month)
);

create table strategy_products (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid references strategies(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  priority text default 'Secondary',
  videos_per_day numeric,
  live_hours_per_week numeric,
  gmv_target numeric,
  strategy_note text,
  hashtags text[],
  is_retainer boolean default false,
  campaign_id uuid references campaigns(id) on delete set null,
  created_at timestamp default now()
);

create table strategy_videos (
  id uuid primary key default gen_random_uuid(),
  strategy_product_id uuid references strategy_products(id) on delete cascade,
  video_url text not null,
  thumbnail_url text,
  created_at timestamp default now()
);

alter table strategies enable row level security;
alter table strategy_products enable row level security;
alter table strategy_videos enable row level security;

create policy "creators_read_own_strategy" on strategies
  for select using (
    creator_id in (select id from creators where email = auth.email())
  );

create policy "creators_read_own_strategy_products" on strategy_products
  for select using (
    strategy_id in (
      select id from strategies where creator_id in (
        select id from creators where email = auth.email()
      )
    )
  );

create policy "creators_read_own_strategy_videos" on strategy_videos
  for select using (
    strategy_product_id in (
      select id from strategy_products where strategy_id in (
        select id from strategies where creator_id in (
          select id from creators where email = auth.email()
        )
      )
    )
  );
