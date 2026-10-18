-- 0042: Deck validity, Browse hides incomplete decks, automatic snapshots.
-- --------------------------------------------------------------------------
-- 1. deck_problems(deck) lists what keeps a deck from being a legal,
--    complete list (empty array = valid). Single source of truth for the
--    Browse filter, the editor's status line, and auto-snapshots.
--      commander     exactly 100 cards in the main deck (commanders count),
--                    1–2 commanders set, singleton
--      60-card fmts  at least 60 main, at most 15 sideboard,
--                    at most 4 copies (main + side combined)
--      casual/other  at least one card
--    Basic lands and "a deck can have any number of / up to N cards named …"
--    are exempt from copy limits. Being over the price cap is NOT a problem:
--    over-budget decks still show in Browse.
-- 2. browse_decks only returns decks with no problems.
-- 3. Auto-snapshots: lock_ins gains kind = 'auto'. snapshot_deck() is called
--    after every decklist change. It only snapshots a valid deck, skips when
--    nothing in the list changed, and folds a burst of edits (less than an
--    hour apart) into one snapshot instead of one per card. Pressing Lock In
--    still creates a permanent 'creator' lock, and promotes a matching
--    auto-snapshot from the last hour rather than duplicating it.
--    Existing queries filter kind = 'creator', so auto-snapshots never count
--    as Price Locks (badge, profile, matches, "Recently locked in" sort).

-- --------------------------------------------------------------------------
-- 1. Validity
-- --------------------------------------------------------------------------
create or replace function public.deck_problems(p_deck_id uuid)
returns text[]
language sql
stable
as $$
  with d as (
    select id, game_format,
           game_format in ('vintage', 'legacy', 'modern', 'pioneer',
                           'standard', 'pauper') as sixty
      from public.decks
     where id = p_deck_id
  ),
  lines as (
    select dc.board, dc.quantity, dc.is_commander, c.oracle_id, c.name,
           (    lower(coalesce(c.type_line, '')) like '%basic%'
            and lower(coalesce(c.type_line, '')) like '%land%')
           or lower(coalesce(c.oracle_text, ''))
                ~ 'a deck can have (any number of|up to [a-z-]+) cards named'
             as unlimited
      from public.deck_cards dc
      join public.cards c on c.scryfall_id = dc.scryfall_id
     where dc.deck_id = p_deck_id
  ),
  counts as (
    select coalesce(sum(quantity) filter (where board = 'main'), 0)::int as main_n,
           coalesce(sum(quantity) filter (where board = 'side'), 0)::int as side_n,
           count(*) filter (where board = 'main' and is_commander)::int  as cmd_n
      from lines
  ),
  -- Copies per card (all printings together). Commander counts the main
  -- deck; 60-card formats count main + sideboard.
  copies as (
    select min(l.name) as name, sum(l.quantity)::int as n
      from lines l cross join d
     where not l.unlimited
       and (l.board = 'main' or (d.sixty and l.board = 'side'))
     group by l.oracle_id
  )
  select array_remove(array[
    case when d.game_format = 'commander' and k.main_n <> 100
      then format('%s of 100 cards', k.main_n) end,
    case when d.game_format = 'commander' and k.cmd_n = 0
      then 'No commander set' end,
    case when d.game_format = 'commander' and k.cmd_n > 2
      then 'More than two commanders' end,
    case when d.game_format = 'commander' and x.over is not null
      then 'Not singleton: ' || x.over end,
    case when d.sixty and k.main_n < 60
      then format('%s-card main deck (needs at least 60)', k.main_n) end,
    case when d.sixty and k.side_n > 15
      then format('%s-card sideboard (max 15)', k.side_n) end,
    case when d.sixty and x.over is not null
      then 'More than 4 copies: ' || x.over end,
    case when d.game_format <> 'commander' and not d.sixty and k.main_n = 0
      then 'No cards in the main deck' end
  ], null)
    from d
   cross join counts k
   cross join lateral (
     select string_agg(cp.name || ' ×' || cp.n, ', ' order by cp.name) as over
       from copies cp
      where cp.n > case when d.game_format = 'commander' then 1 else 4 end
   ) x;
$$;

grant execute on function public.deck_problems(uuid) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 2. browse_decks v6: same as v5 (0038) plus the validity filter.
-- --------------------------------------------------------------------------
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
     and cardinality(public.deck_problems(db.id)) = 0
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

-- --------------------------------------------------------------------------
-- 3. Auto-snapshots
-- --------------------------------------------------------------------------
-- Replace the kind check (0001 declared it inline, so drop it by lookup
-- rather than trusting the generated name).
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
     where conrelid = 'public.lock_ins'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%kind%'
  loop
    execute format('alter table public.lock_ins drop constraint %I', r.conname);
  end loop;
end $$;
alter table public.lock_ins add constraint lock_ins_kind_check
  check (kind in ('creator', 'visitor', 'auto'));

-- Snapshots now also record each line's printing (set + collector number) so
-- a snapshot can be exported with printings. Otherwise identical to 0037.
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
                 'line_bling',    case when p_priced then x.line_bling    else null end,
                 'set', x.set_code,
                 'cn',  x.collector_number
               )
               order by x.is_commander desc, x.board, x.name
             )
        from (
          select c.name, dc.quantity, dc.board, dc.is_commander,
                 dc.counts_toward_budget, c.set_code, c.collector_number,
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

grant execute on function public.build_lock_snapshot(uuid, boolean)
  to anon, authenticated;

-- What a snapshot's decklist *is*, for "did anything change?" checks: the
-- cards in the deck (main + sideboard, plus any other board that counts
-- toward the price) with quantities and flags. Prices and printings are
-- ignored, so market moves or a printing swap never trigger a snapshot.
create or replace function public.snapshot_composition(p_snapshot jsonb)
returns jsonb
language sql
immutable
as $$
  select case when p_snapshot is null or p_snapshot->'cards' is null then null
  else coalesce((
    select jsonb_agg(e order by e::text)
      from (
        select jsonb_build_object(
                 'name', c->>'name',
                 'qty', (c->>'qty')::int,
                 'board', c->>'board',
                 'commander', coalesce((c->>'commander')::boolean, false),
                 'counted', coalesce((c->>'counts_toward_budget')::boolean, false)
               ) as e
          from jsonb_array_elements(p_snapshot->'cards') c
         where c->>'board' in ('main', 'side')
            or coalesce((c->>'counts_toward_budget')::boolean, false)
      ) s
  ), '[]'::jsonb) end;
$$;

-- Take a snapshot of the caller's own deck.
--   p_manual = true   Lock In button: always records a permanent 'creator'
--                     lock. If an auto-snapshot from the last hour already
--                     holds this exact list, it's promoted instead of
--                     duplicated.                         -> 'locked' | 'promoted'
--   p_manual = false  after a decklist change:
--     deck invalid                                         -> 'invalid'
--     latest snapshot is an auto one touched < 1h ago:
--       list now matches the snapshot before it → drop it -> 'reverted'
--       list unchanged                                     -> 'unchanged'
--       otherwise overwrite it in place (time = now)       -> 'updated'
--     otherwise: unchanged vs latest → skip, else insert   -> 'unchanged' | 'created'
-- Because each overwrite moves the auto-snapshot's time to now, a run of edits
-- with less than an hour between them ends up as one snapshot.
create or replace function public.snapshot_deck(
  p_deck_id uuid,
  p_manual  boolean default false
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner      uuid;
  v_snap       jsonb;
  v_comp       jsonb;
  v_budget     numeric;
  v_bling      numeric;
  v_latest     public.lock_ins%rowtype;
  v_has_latest boolean;
  v_prev       public.lock_ins%rowtype;
  v_has_prev   boolean;
  v_window     constant interval := interval '1 hour';
begin
  select owner_id into v_owner from public.decks where id = p_deck_id;
  if v_owner is null or auth.uid() is null or v_owner <> auth.uid() then
    return 'not_owner';
  end if;

  -- One snapshot decision per deck at a time (rapid clicks, parallel tabs).
  perform pg_advisory_xact_lock(hashtext('snapshot_deck:' || p_deck_id::text));

  if not p_manual and cardinality(public.deck_problems(p_deck_id)) > 0 then
    return 'invalid';
  end if;

  v_snap   := public.build_lock_snapshot(p_deck_id, true);
  v_comp   := public.snapshot_composition(v_snap);
  v_budget := coalesce((v_snap->'totals'->>'budget_price')::numeric, 0);
  v_bling  := (v_snap->'totals'->>'bling_price')::numeric;

  select * into v_latest
    from public.lock_ins
   where deck_id = p_deck_id and kind in ('creator', 'auto')
   order by locked_at desc
   limit 1;
  v_has_latest := found;

  if p_manual then
    if v_has_latest
       and v_latest.kind = 'auto'
       and v_latest.locked_at > now() - v_window
       and public.snapshot_composition(v_latest.snapshot) = v_comp then
      update public.lock_ins
         set kind = 'creator', locked_at = now(), snapshot = v_snap,
             budget_price = v_budget, bling_price = v_bling
       where id = v_latest.id;
      return 'promoted';
    end if;
    insert into public.lock_ins
          (deck_id, user_id, budget_price, bling_price, currency, kind, snapshot)
    values (p_deck_id, v_owner, v_budget, v_bling, 'USD', 'creator', v_snap);
    return 'locked';
  end if;

  if v_has_latest
     and v_latest.kind = 'auto'
     and v_latest.locked_at > now() - v_window then
    select * into v_prev
      from public.lock_ins
     where deck_id = p_deck_id and kind in ('creator', 'auto')
       and id <> v_latest.id
     order by locked_at desc
     limit 1;
    v_has_prev := found;

    if v_has_prev and public.snapshot_composition(v_prev.snapshot) = v_comp then
      delete from public.lock_ins where id = v_latest.id;
      return 'reverted';
    end if;
    if public.snapshot_composition(v_latest.snapshot) = v_comp then
      return 'unchanged';
    end if;
    update public.lock_ins
       set locked_at = now(), snapshot = v_snap,
           budget_price = v_budget, bling_price = v_bling
     where id = v_latest.id;
    return 'updated';
  end if;

  if v_has_latest and public.snapshot_composition(v_latest.snapshot) = v_comp then
    return 'unchanged';
  end if;

  insert into public.lock_ins
        (deck_id, user_id, budget_price, bling_price, currency, kind, snapshot)
  values (p_deck_id, v_owner, v_budget, v_bling, 'USD', 'auto', v_snap);
  return 'created';
end;
$$;

revoke execute on function public.snapshot_deck(uuid, boolean) from public, anon;
grant execute on function public.snapshot_deck(uuid, boolean) to authenticated;
