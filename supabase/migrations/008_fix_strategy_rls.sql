-- Recreate strategy RLS policies with case-insensitive email matching.
-- Auth emails are normalized to lowercase by Supabase, but creator records
-- can be inserted/imported with mixed case. The original policies used
-- `email = auth.email()`, which silently blocked reads for any creator
-- whose email casing didn't exactly match their auth email.

drop policy if exists "creators_read_own_strategy" on strategies;
create policy "creators_read_own_strategy" on strategies
  for select using (
    creator_id in (
      select id from creators where lower(email) = lower(auth.email())
    )
  );

drop policy if exists "creators_read_own_strategy_products" on strategy_products;
create policy "creators_read_own_strategy_products" on strategy_products
  for select using (
    strategy_id in (
      select id from strategies where creator_id in (
        select id from creators where lower(email) = lower(auth.email())
      )
    )
  );

drop policy if exists "creators_read_own_strategy_videos" on strategy_videos;
create policy "creators_read_own_strategy_videos" on strategy_videos
  for select using (
    strategy_product_id in (
      select id from strategy_products where strategy_id in (
        select id from strategies where creator_id in (
          select id from creators where lower(email) = lower(auth.email())
        )
      )
    )
  );
