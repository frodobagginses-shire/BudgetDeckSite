-- 0029: rank autocomplete results to help users reach their card fast.
-- 1) Cards whose cheapest printing is at or below p_budget come first
--    (the per-card budget = price cap / (deck size * 0.3), computed by the API).
-- 2) Within each tier, prefix matches first, then by EDHREC rank (most-played),
--    then name. This narrows to likely-in-budget + widely-played cards first.
-- Cheap on top of the existing name filter (small candidate set; edhrec indexed).

drop function if exists public.search_cards(
  text, text[], text[], numeric, numeric, text[], int);

create function public.search_cards(
  q          text       default null,
  p_types    text[]     default null,
  p_ci       text[]     default null,
  p_mv_min   numeric    default null,
  p_mv_max   numeric    default null,
  p_rarities text[]     default null,
  p_limit    int        default 20,
  p_budget   numeric    default null
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
  is_foil            boolean,
  edhrec_rank        integer
)
language plpgsql
stable
as $$
declare
  v_q     text := nullif(btrim(coalesce(q, '')), '');
  v_limit int  := greatest(1, least(coalesce(p_limit, 20), 100));
begin
  if v_q is not null and char_length(v_q) < 3 then
    return query
      select c.oracle_id, c.name, c.set_code, c.image_small, c.image_normal,
             c.type_line, c.cmc, c.color_identity, c.rarity,
             cc.cheapest_price_usd, cc.is_foil, c.edhrec_rank
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
       order by
         case when p_budget is not null and cc.cheapest_price_usd is not null
                   and cc.cheapest_price_usd <= p_budget then 0 else 1 end,
         c.edhrec_rank asc nulls last,
         c.name asc
       limit v_limit;
  else
    return query
      select c.oracle_id, c.name, c.set_code, c.image_small, c.image_normal,
             c.type_line, c.cmc, c.color_identity, c.rarity,
             cc.cheapest_price_usd, cc.is_foil, c.edhrec_rank
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
         case when p_budget is not null and cc.cheapest_price_usd is not null
                   and cc.cheapest_price_usd <= p_budget then 0 else 1 end,
         case when v_q is not null and c.name ilike v_q || '%' then 0 else 1 end,
         c.edhrec_rank asc nulls last,
         c.name asc
       limit v_limit;
  end if;
end;
$$;

grant execute on function public.search_cards(
  text, text[], text[], numeric, numeric, text[], int, numeric)
  to anon, authenticated;
