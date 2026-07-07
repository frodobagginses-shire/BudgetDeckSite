-- 0037: per-board price inclusion.
-- --------------------------------------------------------------------------
-- Until now every price function hardcoded board = 'main', so sideboard cards
-- never counted toward a deck's price in any format. That's wrong for 60-card
-- formats (Vintage, Modern, etc.) where the 15-card sideboard is part of the
-- deck you buy.
--
-- Each deck now carries priced_boards: the set of boards whose cards feed the
-- price figures. 'main' is always present. Defaults:
--   * commander            -> {main}            (no sideboard in EDH)
--   * every other format   -> {main, side}
-- Considering / Maybe stay excluded unless the owner opts in from the deck
-- settings. The per-card counts_toward_budget flag still applies on top
-- (basics, proxies, house rules).

alter table public.decks
  add column if not exists priced_boards text[] not null default array['main'];

alter table public.decks
  drop constraint if exists decks_priced_boards_valid;

alter table public.decks
  add constraint decks_priced_boards_valid check (
    priced_boards @> array['main']
    and priced_boards <@ array['main', 'side', 'considering', 'maybe']
  );

-- Backfill: sideboards count everywhere except commander.
update public.decks
   set priced_boards = array['main', 'side']
 where game_format <> 'commander';

-- deck_totals: price over the deck's priced boards instead of main only.
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
           coalesce(cc.cheapest_price_usd, 0)         as unit_cheapest,
           coalesce(c.price_usd, c.price_usd_foil, 0) as unit_bling
      from public.deck_cards dc
      join public.decks d           on d.id = dc.deck_id
      join public.cards c           on c.scryfall_id = dc.scryfall_id
      left join public.card_cheapest cc on cc.oracle_id = c.oracle_id
     where dc.deck_id = p_deck_id
       and dc.board = any(d.priced_boards)
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

-- browse_decks v4: same change for the browse grid's budget figure + card
-- count. Body is otherwise identical to v3 (0035: like_count, view_count).
-- Return type is unchanged from v3, so create or replace works.
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
  like_count       int,
  view_count       int,
  updated_at       timestamptz
)
language sql
stable
as $$
  with deck_budget as (
    select d.id, d.name, d.game_format, d.threshold_amount, d.owner_id, d.updated_at,
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
         db.updated_at
    from deck_budget db
    left join public.users u on u.id = db.owner_id
    left join (
      select deck_id, count(*) as n from public.deck_likes group by deck_id
    ) lk on lk.deck_id = db.id
    left join public.deck_views vw on vw.deck_id = db.id
   where (p_max_budget is null or db.budget_price <= p_max_budget)
   order by
     case when p_sort = 'price_asc'  then db.budget_price end asc nulls last,
     case when p_sort = 'price_desc' then db.budget_price end desc nulls last,
     case when p_sort = 'likes'      then coalesce(lk.n, 0) end desc nulls last,
     case when p_sort = 'views'      then coalesce(vw.count, 0) end desc nulls last,
     case when p_sort = 'name'       then db.name end asc,
     case when p_sort = 'recent' or p_sort is null then db.updated_at end desc
   limit greatest(1, least(coalesce(p_limit, 24), 60))
   offset greatest(0, coalesce(p_offset, 0));
$$;

-- build_lock_snapshot: a snapshot card's counts_toward_budget now reflects the
-- effective rule (its own flag AND its board being priced), so the snapshot's
-- per-line "not counted" markers add up to the recorded budget figure.
create or replace function public.build_lock_snapshot(
  p_deck_id uuid,
  p_priced  boolean default true
)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'name', d.name,
    'game_format', d.game_format,
    'threshold_amount', d.threshold_amount,
    'priced', p_priced,
    'totals', case when p_priced
      then (select to_jsonb(t) from public.deck_totals(p_deck_id) t)
      else null end,
    'cards', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'name', x.name,
                 'qty', x.quantity,
                 'board', x.board,
                 'commander', x.is_commander,
                 'counts_toward_budget',
                   x.counts_toward_budget and x.board = any(d.priced_boards),
                 'line_cheapest', case when p_priced then x.line_cheapest else null end,
                 'line_bling',    case when p_priced then x.line_bling    else null end
               )
               order by x.is_commander desc, x.board, x.name
             )
        from (
          select c.name, dc.quantity, dc.board, dc.is_commander,
                 dc.counts_toward_budget,
                 dc.quantity * cc.cheapest_price_usd                   as line_cheapest,
                 dc.quantity * coalesce(c.price_usd, c.price_usd_foil) as line_bling
            from public.deck_cards dc
            join public.cards c on c.scryfall_id = dc.scryfall_id
            left join public.card_cheapest cc on cc.oracle_id = c.oracle_id
           where dc.deck_id = p_deck_id
        ) x
    ), '[]'::jsonb)
  )
  from public.decks d
  where d.id = p_deck_id;
$$;
