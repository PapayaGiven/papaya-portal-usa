-- Strategy products safety net.
--
-- The 015/017 migrations introduced columns the saveStrategy server
-- action writes to (frequency_type, week, hooks, scripts, trends, …).
-- The USA project ended up out of sync with the action: the
-- frequency_type column was missing in this env, which made every
-- per-row INSERT in saveStrategy fail with PGRST204. Because
-- saveStrategy deletes the week's rows FIRST and then loops inserts,
-- the failure pattern was "products disappear after save".
--
-- Idempotent ALTER TABLE statements — safe to re-run anywhere.

alter table strategy_products add column if not exists week integer not null default 1;
alter table strategy_products add column if not exists frequency_type text default 'day';
alter table strategy_products add column if not exists is_external boolean default false;
alter table strategy_products add column if not exists external_product_name text;
alter table strategy_products add column if not exists external_brand text;
alter table strategy_products add column if not exists external_commission numeric;
alter table strategy_products add column if not exists external_link text;
alter table strategy_products add column if not exists video_focus text;
alter table strategy_products add column if not exists quick_checklist text[];
alter table strategy_products add column if not exists hooks text[];
alter table strategy_products add column if not exists scripts text;
alter table strategy_products add column if not exists trends text;
alter table strategy_products add column if not exists brief_url text;

-- Helpful constraint check: frequency_type only accepts 'day' or 'week'
-- (matches the TS type in actions.ts). Wrapped in DO so re-running on
-- an env that already has the constraint doesn't error.
do $$
begin
  if not exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'strategy_products_frequency_type_chk'
  ) then
    alter table strategy_products
      add constraint strategy_products_frequency_type_chk
      check (frequency_type in ('day', 'week'));
  end if;
end $$;
