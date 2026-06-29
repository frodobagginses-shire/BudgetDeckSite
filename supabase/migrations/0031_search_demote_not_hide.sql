-- 0031: don't hide format-illegal / out-of-identity cards in deck search; show
-- them at the bottom (with the over-budget cards) so the UI can gray them out.
-- Returns legal + in_identity flags and orders into three groups:
--   0 = addable & in budget, 1 = addable but over budget, 2 = not addable.
-- Within each group: prefix matches, then EDHREC rank, then name.

drop function if exists public.search_cards(
  text, text[], text[], numeric, numeric, text[], int, numeric, text, text[]);

create function public.search_cards(
  q          text       default null,
  p_types    text[]     default null,
  p_ci       text[]     default null,
  p_mv_min   numeric    default null,
  p_mv_max   numeric    default null,
  p_rarities text[]     default null,
  p_limit    int        default 20,
  p_budget   numeric    default null,
  p_format   text       default null,
  p_identity text[]     default null
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
  edhrec_rank        integer,
  legal              boolean,
  in_identity        boolean
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
             cc.cheapest_price_usd, cc.is_foil, c.edhrec_rank,
             (p_format is null
              or coalesce(c.legalities ->> p_format, '') in ('legal', 'restricted')) as legal,
             (p_identity is null or c.color_identity <@ p_identity) as in_identity
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
         case
           when not ((p_format is null
                      or coalesce(c.legalities ->> p_format, '') in ('legal', 'restricted'))
                     and (p_identity is null or c.color_identity <@ p_identity)) then 2
           when p_budget is not null
                and (cc.cheapest_price_usd is null or cc.cheapest_price_usd > p_budget) then 1
           else 0
         end,
         c.edhrec_rank asc nulls last,
         c.name asc
       limit v_limit;
  else
    return query
      select c.oracle_id, c.name, c.set_code, c.image_small, c.image_normal,
             c.type_line, c.cmc, c.color_identity, c.rarity,
             cc.cheapest_price_usd, cc.is_foil, c.edhrec_rank,
             (p_format is null
              or coalesce(c.legalities ->> p_format, '') in ('legal', 'restricted')) as legal,
             (p_identity is null or c.color_identity <@ p_identity) as in_identity
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
         case
           when not ((p_format is null
                      or coalesce(c.legalities ->> p_format, '') in ('legal', 'restricted'))
                     and (p_identity is null or c.color_identity <@ p_identity)) then 2
           when p_budget is not null
                and (cc.cheapest_price_usd is null or cc.cheapest_price_usd > p_budget) then 1
           else 0
         end,
         case when v_q is not null and c.name ilike v_q || '%' then 0 else 1 end,
         c.edhrec_rank asc nulls last,
         c.name asc
       limit v_limit;
  end if;
end;
$$;

grant execute on function public.search_cards(
  text, text[], text[], numeric, numeric, text[], int, numeric, text, text[])
  to anon, authenticated;
