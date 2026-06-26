-- B-1 — browse public decks with the signature price-threshold filter + price sort.
-- Computes each public deck's Budget price (counted main cards, cheapest printing)
-- in SQL so we can filter by max budget and sort by price — neither of which
-- Moxfield/Archidekt offer.
--
-- p_sort: 'recent' (default) | 'price_asc' | 'price_desc' | 'name'

create or replace function public.browse_decks(
  p_format     text    default null,
  p_max_budget numeric default null,
  p_sort       text    default 'recent',
  p_limit      int     default 24,
  p_offset     int     default 0
)
returns table (
  id               uuid,
  name             text,
  game_format      text,
  threshold_amount numeric,
  owner_handle     text,
  budget_price     numeric,
  card_count       int,
  updated_at       timestamptz
)
language sql
stable
as $$
  with deck_budget as (
    select d.id, d.name, d.game_format, d.threshold_amount, d.owner_id, d.updated_at,
           coalesce(
             sum(dc.quantity * cc.cheapest_price_usd)
               filter (where dc.counts_toward_budget and dc.board = 'main'),
             0
           ) as budget_price,
           coalesce(
             sum(dc.quantity) filter (where dc.board = 'main'),
             0
           )::int as card_count
      from public.decks d
      left join public.deck_cards dc on dc.deck_id = d.id
      left join public.cards c       on c.scryfall_id = dc.scryfall_id
      left join public.card_cheapest cc on cc.oracle_id = c.oracle_id
     where d.visibility = 'public'
       and (p_format is null or d.game_format = p_format)
     group by d.id
  )
  select db.id, db.name, db.game_format, db.threshold_amount,
         u.handle as owner_handle, db.budget_price, db.card_count, db.updated_at
    from deck_budget db
    left join public.users u on u.id = db.owner_id
   where (p_max_budget is null or db.budget_price <= p_max_budget)
   order by
     case when p_sort = 'price_asc'  then db.budget_price end asc nulls last,
     case when p_sort = 'price_desc' then db.budget_price end desc nulls last,
     case when p_sort = 'name'       then db.name end asc,
     case when p_sort = 'recent' or p_sort is null then db.updated_at end desc
   limit greatest(1, least(coalesce(p_limit, 24), 60))
   offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function
  public.browse_decks(text, numeric, text, int, int)
  to anon, authenticated;
