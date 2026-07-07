-- 0038: browse_decks v5 — Newest / Recently locked in sorts.
-- --------------------------------------------------------------------------
-- Browse gains two sort modes:
--   * 'newest' — deck creation date
--   * 'locked' — most recent *creator* lock-in (the owner's official
--     snapshot). Never-locked decks sort last.
-- The function now also returns created_at and last_locked_at so the UI can
-- surface them. Return type changed, so drop + recreate.

drop function if exists public.browse_decks(text, numeric, text, int, int);

create function public.browse_decks(
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
  like_count       int,
  view_count       int,
  updated_at       timestamptz,
  created_at       timestamptz,
  last_locked_at   timestamptz
)
language sql
stable
as $$
  with deck_budget as (
    select d.id, d.name, d.game_format, d.threshold_amount, d.owner_id,
           d.updated_at, d.created_at,
           coalesce(
             sum(dc.quantity * cc.cheapest_price_usd)
               filter (where dc.counts_toward_budget
                         and dc.board = any(d.priced_boards)),
             0
           ) as budget_price,
           coalesce(
             sum(dc.quantity) filter (where dc.board = any(d.priced_boards)),
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
         u.handle as owner_handle, db.budget_price, db.card_count,
         coalesce(lk.n, 0)::int as like_count,
         coalesce(vw.count, 0)::int as view_count,
         db.updated_at, db.created_at,
         li.last_locked_at
    from deck_budget db
    left join public.users u on u.id = db.owner_id
    left join (
      select deck_id, count(*) as n from public.deck_likes group by deck_id
    ) lk on lk.deck_id = db.id
    left join public.deck_views vw on vw.deck_id = db.id
    left join (
      select deck_id, max(locked_at) as last_locked_at
        from public.lock_ins
       where kind = 'creator'
       group by deck_id
    ) li on li.deck_id = db.id
   where (p_max_budget is null or db.budget_price <= p_max_budget)
   order by
     case when p_sort = 'price_asc'  then db.budget_price end asc nulls last,
     case when p_sort = 'price_desc' then db.budget_price end desc nulls last,
     case when p_sort = 'likes'      then coalesce(lk.n, 0) end desc nulls last,
     case when p_sort = 'views'      then coalesce(vw.count, 0) end desc nulls last,
     case when p_sort = 'name'       then db.name end asc,
     case when p_sort = 'newest'     then db.created_at end desc,
     case when p_sort = 'locked'     then li.last_locked_at end desc nulls last,
     case when p_sort = 'recent' or p_sort is null then db.updated_at end desc
   limit greatest(1, least(coalesce(p_limit, 24), 60))
   offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function public.browse_decks(text, numeric, text, int, int) to anon, authenticated;
