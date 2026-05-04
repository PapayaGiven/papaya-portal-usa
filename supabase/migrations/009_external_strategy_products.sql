-- Allow strategy products that aren't in the catalog (external products)
alter table strategy_products add column if not exists is_external boolean default false;
alter table strategy_products add column if not exists external_product_name text;
alter table strategy_products add column if not exists external_brand text;
alter table strategy_products add column if not exists external_commission numeric;
alter table strategy_products add column if not exists external_link text;

-- Clean up broken rows: no catalog product AND no external product info.
-- These records render as blank cards on the creator's strategy page.
delete from strategy_products
where product_id is null
  and (external_product_name is null or external_product_name = '');
