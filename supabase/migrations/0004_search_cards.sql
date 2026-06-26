-- F-6 — card search function
-- --------------------------------------------------------------------------
-- Returns one row per oracle card (its cheapest printing, so results carry the
-- budget price + a real image), filtered by an optional name query and the
-- Scryfall-subset filters parsed in src/lib/search/parse-query.ts.
--
-- All filter params are nullable; null means "don't filter on this".
--   p_ci letters are uppercase WUBRG; match = color_identity ⊆ p_ci
--   (commander-style identity filter).

create or replace function public.search_cards(
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
language sql
stable
as $$
  select c.oracle_id, c.name, c.set_code, c.image_small, c.image_normal,
         c.type_line, c.cmc, c.color_identity, c.rarity,
         cc.cheapest_price_usd, cc.is_foil
    from public.card_cheapest cc
    join public.cards c on c.scryfall_id = cc.cheapest_scryfall_id
   where (q is null or c.name ilike '%' || q || '%')
     and (p_types is null or not exists (
            select 1 from unnest(p_types) t
             where c.type_line is null or c.type_line not ilike '%' || t || '%'))
     and (p_ci is null or c.color_identity <@ p_ci)
     and (p_mv_min is null or c.cmc >= p_mv_min)
     and (p_mv_max is null or c.cmc <= p_mv_max)
     and (p_rarities is null or c.rarity = any (p_rarities))
   order by
     case when q is not null and c.name ilike q || '%' then 0 else 1 end,
     c.name asc
   limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

-- Callable by the app's anon/authenticated roles (reads world-readable tables).
grant execute on function
  public.search_cards(text, text[], text[], numeric, numeric, text[], int)
  to anon, authenticated;
