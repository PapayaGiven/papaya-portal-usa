-- Strategy products: per-week categorization.
--
-- The existing `strategies` table is still keyed by (creator_id, month).
-- Within a month admin now splits products across four weeks (1–4),
-- using strategy_products.week as the bucket. Existing rows default to
-- week 1 so we don't break what's already there.
--
-- Index speeds up the per-week load queries (StrategyManager fetches one
-- week at a time).

alter table strategy_products
  add column if not exists week int not null default 1;

create index if not exists idx_strategy_products_week
  on strategy_products(strategy_id, week);
