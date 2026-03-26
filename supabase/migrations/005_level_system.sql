-- Level system: new creator fields
alter table creators add column if not exists whatsapp_number text;
alter table creators add column if not exists mastermind_date timestamp;
alter table creators add column if not exists account_manager_name text;
alter table creators add column if not exists account_manager_whatsapp text;

-- Products: mark which are available to Initiation creators
alter table products add column if not exists approved_for_initiation boolean default false;

-- Initiation product selections
create table if not exists creator_initiation_products (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  selected_at timestamp default now(),
  unique(creator_id, product_id)
);

-- RLS for creator_initiation_products
alter table creator_initiation_products enable row level security;

create policy "Creators can see own initiation products"
  on creator_initiation_products for select
  using (
    creator_id in (
      select id from creators where email = auth.email()
    )
  );

create policy "Creators can insert own initiation products"
  on creator_initiation_products for insert
  with check (
    creator_id in (
      select id from creators where email = auth.email()
    )
  );

create policy "Creators can delete own initiation products"
  on creator_initiation_products for delete
  using (
    creator_id in (
      select id from creators where email = auth.email()
    )
  );
