-- Storefront-style stats on products
alter table products add column if not exists star_rating numeric(2,1);
alter table products add column if not exists review_count integer;
alter table products add column if not exists units_sold integer;
