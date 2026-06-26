-- D-3 — dual-price computation
-- --------------------------------------------------------------------------
-- Two read functions over a deck's main board:
--   deck_cards_priced(deck) -> per-card rows (for the editor list + per-type subtotals)
--   deck_totals(deck)       -> headline figures:
--       budget_price  = counted cards, cheapest printings  (threshold number)
--       total_price   = ALL cards,     cheapest printings  ("Total Price")
--       bling_price   = ALL cards,     chosen printings     ("your printings")
--       excluded_value= total_price - budget_price          ("…excluding XYZ")
--
-- Budget uses card_cheapest (rule A1). Bling uses the chosen printing's price
-- (coalescing to foil price if the printing has no non-foil price). Cards with
-- no cheapest price contribute 0 to budget/total (they're "price unavailable").
-- Functions run as the caller, so RLS on decks/deck_cards is respected.

create or replace function public.deck_cards_priced(p_deck_id uuid)
returns table (
  scryfall_id          uuid,
  oracle_id            uuid,
  name                 text,
  type_line            text,
  cmc                  numeric,
  board                text,
  quantity             int,
  counts_toward_budget boolean,
  unit_cheapest        numeric,
  unit_bling           numeric,
  line_cheapest        numeric,
  line_bling           numeric
)
language sql
stable
as $$
  select dc.scryfall_id, c.oracle_id, c.name, c.type_line, c.cmc,
         dc.board, dc.quantity, dc.counts_toward_budget,
         cc.cheapest_price_usd                                   as unit_cheapest,
         coalesce(c.price_usd, c.price_usd_foil)                 as unit_bling,
         dc.quantity * cc.cheapest_price_usd                     as line_cheapest,
         dc.quantity * coalesce(c.price_usd, c.price_usd_foil)   as line_bling
    from public.deck_cards dc
    join public.cards c          on c.scryfall_id = dc.scryfall_id
    left join public.card_cheapest cc on cc.oracle_id = c.oracle_id
   where dc.deck_id = p_deck_id;
$$;

create or replace function public.deck_totals(p_deck_id uuid)
returns table (
  budget_price   numeric,
  total_price    numeric,
  bling_price    numeric,
  excluded_value numeric,
  card_count     int
)
language sql
stable
as $$
  with r as (
    select dc.quantity,
           dc.counts_toward_budget,
           coalesce(cc.cheapest_price_usd, 0)        as unit_cheapest,
           coalesce(c.price_usd, c.price_usd_foil, 0) as unit_bling
      from public.deck_cards dc
      join public.cards c           on c.scryfall_id = dc.scryfall_id
      left join public.card_cheapest cc on cc.oracle_id = c.oracle_id
     where dc.deck_id = p_deck_id
       and dc.board = 'main'
  )
  select
    coalesce(sum(quantity * unit_cheapest) filter (where counts_toward_budget), 0) as budget_price,
    coalesce(sum(quantity * unit_cheapest), 0)                                     as total_price,
    coalesce(sum(quantity * unit_bling), 0)                                        as bling_price,
    coalesce(sum(quantity * unit_cheapest), 0)
      - coalesce(sum(quantity * unit_cheapest) filter (where counts_toward_budget), 0) as excluded_value,
    coalesce(sum(quantity), 0)::int                                                as card_count
  from r;
$$;

grant execute on function public.deck_cards_priced(uuid) to anon, authenticated;
grant execute on function public.deck_totals(uuid)       to anon, authenticated;
