-- Strategy products: persistent ordering.
--
-- The admin editor can now reorder products with ↑/↓ buttons. Without
-- a persisted order column, getStrategyForAdmin ordered by created_at
-- which froze the original entry sequence even after the admin moved
-- rows around. We persist the explicit order_index instead and fall
-- back to created_at for legacy rows that haven't been resaved yet.
--
-- Idempotent — safe to re-run anywhere.

alter table strategy_products
  add column if not exists order_index integer not null default 0;

-- Backfill order_index for rows that don't have one yet, using
-- created_at within each (strategy_id, week) bucket so the legacy
-- order is preserved exactly until the admin next saves the week.
update strategy_products sp
set order_index = sub.rn - 1
from (
  select
    id,
    row_number() over (
      partition by strategy_id, week
      order by created_at asc, id asc
    ) as rn
  from strategy_products
) sub
where sp.id = sub.id
  and sp.order_index = 0;
