-- 0016 — make card autocomplete fast.
--
-- The old search_cards drove off card_cheapest (~one row per oracle) and joined
-- to cards by primary key, applying `name ilike '%q%'` only AFTER the join. That
-- meant the trigram index on cards.name was never used and every keystroke
-- scanned every row. There was also no index that could serve short (1–2 char)
-- prefix queries.
--
-- Fix:
--   * drive the query from `cards` so the name indexes are usable;
--   * add a prefix index on lower(name) (text_pattern_ops) for short queries;
--   * add an index on card_cheapest(cheapest_scryfall_id) for the join;
--   * branch: <3 chars → indexed prefix range; >=3 chars → trigram substring.
-- The join to card_cheapest on cheapest_scryfall_id keeps exactly the cheapest
-- printing per oracle card (so results stay one row per card).

create index if not exists cards_name_lower_pat_idx
  on public.cards (lower(name) text_pattern_ops);

create index if not exists card_cheapest_cheapest_sid_idx
  on public.card_cheapest (cheapest_scryfall_id);

drop function if exists public.search_cards(
  text, text[], text[], numeric, numeric, text[], int);

create function public.search_cards(
  q          text       default null,
  p_types    text[]     default null,
  p_ci       text[]     default null,
  p_mv_min   numeric    default null,
  p_mv_max   numeric    default null,
  p_rarities text[]     default null,
  p_limit    int        default 20
)
returns table (
  oracle_id          uuid,
  name               text,
  set_code           text,
  image_small        text,
  image_normal       text,
  type_line          text,
  cmc                numeric,
  color_identity     text[],
  rarity             text,
  cheapest_price_usd numeric,
  is_foil            boolean
)
language plpgsql
stable
as $$
declare
  v_q     text := nullif(btrim(coalesce(q, '')), '');
  v_limit int  := greatest(1, least(coalesce(p_limit, 20), 100));
begin
  if v_q is not null and char_length(v_q) < 3 then
    -- Short query: indexed prefix range on lower(name) (text_pattern_ops).
    -- The explicit ~>=~ / ~<~ pattern operators use the btree index even though
    -- the prefix is a parameter (a plain LIKE 'x%' with a parameter would not).
    return query
      select c.oracle_id, c.name, c.set_code, c.image_small, c.image_normal,
             c.type_line, c.cmc, c.color_identity, c.rarity,
             cc.cheapest_price_usd, cc.is_foil
        from public.cards c
        join public.card_cheapest cc
          on cc.cheapest_scryfall_id = c.scryfall_id
       where lower(c.name) ~>=~ lower(v_q)
         and lower(c.name) ~<~ (lower(v_q) || chr(1114111))
         and (p_types is null or not exists (
                select 1 from unnest(p_types) t
                 where c.type_line is null or c.type_line not ilike '%' || t || '%'))
         and (p_ci is null or c.color_identity <@ p_ci)
         and (p_mv_min is null or c.cmc >= p_mv_min)
         and (p_mv_max is null or c.cmc <= p_mv_max)
         and (p_rarities is null or c.rarity = any (p_rarities))
       order by c.name asc
       limit v_limit;
  else
    -- 3+ chars (or no query): trigram substring on cards.name (gin_trgm_ops).
    return query
      select c.oracle_id, c.name, c.set_code, c.image_small, c.image_normal,
             c.type_line, c.cmc, c.color_identity, c.rarity,
             cc.cheapest_price_usd, cc.is_foil
        from public.cards c
        join public.card_cheapest cc
          on cc.cheapest_scryfall_id = c.scryfall_id
       where (v_q is null or c.name ilike '%' || v_q || '%')
         and (p_types is null or not exists (
                select 1 from unnest(p_types) t
                 where c.type_line is null or c.type_line not ilike '%' || t || '%'))
         and (p_ci is null or c.color_identity <@ p_ci)
         and (p_mv_min is null or c.cmc >= p_mv_min)
         and (p_mv_max is null or c.cmc <= p_mv_max)
         and (p_rarities is null or c.rarity = any (p_rarities))
       order by
         case when v_q is not null and c.name ilike v_q || '%' then 0 else 1 end,
         c.name asc
       limit v_limit;
  end if;
end;
$$;

grant execute on function public.search_cards(
  text, text[], text[], numeric, numeric, text[], int) to anon, authenticated;
