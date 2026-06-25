-- F-4 — cheapest-printing computation (rule A1)
-- --------------------------------------------------------------------------
-- For each oracle card, the cheapest paper price across ALL its printings,
-- considering BOTH non-foil (price_usd) and foil (price_usd_foil) prices —
-- sometimes the foil is cheaper. Records the winning printing, its price, and
-- whether that price was the foil price. Mirrors Moxfield's "cheapest printing".
--
-- Source rows: public.cards (already paper-only via the F-3 sync).
-- Refresh by calling: select public.refresh_card_cheapest();
-- (the F-3 sync calls this automatically after each run).

create or replace function public.refresh_card_cheapest()
returns void
language sql
as $$
  -- 1) Upsert the current cheapest (printing, finish) per oracle_id.
  with candidates as (
    select oracle_id, scryfall_id, price_usd      as price, false as is_foil
      from public.cards where price_usd is not null
    union all
    select oracle_id, scryfall_id, price_usd_foil as price, true  as is_foil
      from public.cards where price_usd_foil is not null
  ),
  ranked as (
    select oracle_id, scryfall_id, price, is_foil,
           row_number() over (
             partition by oracle_id
             order by price asc, is_foil asc, scryfall_id asc  -- ties: prefer non-foil, then stable id
           ) as rn
      from candidates
  )
  insert into public.card_cheapest
        (oracle_id, cheapest_scryfall_id, cheapest_price_usd, is_foil, updated_at)
  select oracle_id, scryfall_id, price, is_foil, now()
    from ranked
   where rn = 1
  on conflict (oracle_id) do update
     set cheapest_scryfall_id = excluded.cheapest_scryfall_id,
         cheapest_price_usd   = excluded.cheapest_price_usd,
         is_foil              = excluded.is_foil,
         updated_at           = now();

  -- 2) Drop oracle_ids that no longer have any paper price (price unavailable).
  delete from public.card_cheapest cc
   where not exists (
     select 1 from public.cards c
      where c.oracle_id = cc.oracle_id
        and (c.price_usd is not null or c.price_usd_foil is not null)
   );
$$;

-- Populate immediately on apply (cards are already loaded by F-3).
select public.refresh_card_cheapest();
