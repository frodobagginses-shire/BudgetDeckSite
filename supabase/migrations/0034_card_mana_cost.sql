-- 0034: store each card's mana cost and expose it in deck_cards_priced, so the
-- deck list can optionally show the curve (mana symbols per row). Populates on
-- the next Scryfall sync.

alter table public.cards
  add column if not exists mana_cost text;

drop function if exists public.deck_cards_priced(uuid);

create function public.deck_cards_priced(p_deck_id uuid)
returns table (
  scryfall_id          uuid,
  oracle_id            uuid,
  name                 text,
  type_line            text,
  mana_cost            text,
  cmc                  numeric,
  color_identity       text[],
  rarity               text,
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
  select dc.scryfall_id, c.oracle_id, c.name, c.type_line, c.mana_cost, c.cmc,
         c.color_identity, c.rarity, c.set_code, c.collector_number,
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
