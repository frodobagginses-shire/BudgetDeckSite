-- 0006 — add set_code + collector_number to deck_cards_priced (for V-2 export)
-- Postgres can't change a function's return type with CREATE OR REPLACE, so we
-- drop and recreate.

drop function if exists public.deck_cards_priced(uuid);

create function public.deck_cards_priced(p_deck_id uuid)
returns table (
  scryfall_id          uuid,
  oracle_id            uuid,
  name                 text,
  type_line            text,
  cmc                  numeric,
  set_code             text,
  collector_number     text,
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
         c.set_code, c.collector_number,
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

grant execute on function public.deck_cards_priced(uuid) to anon, authenticated;
