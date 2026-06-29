-- 0036: freeze the decklist behind every Price Lock.
-- Before this, a lock_in stored only a price + date while the deck stayed
-- editable — so "Locked at $15" could be quietly upgraded to a $25 deck after
-- the fact. Each lock now carries a jsonb snapshot of the deck's composition
-- (and, for live locks, the per-line prices) as it stood at lock time. The
-- "Locked at $X" badge and the profile Price Locks list link to that frozen
-- snapshot instead of the mutable live deck.

alter table public.lock_ins
  add column if not exists snapshot jsonb;

-- Build a point-in-time snapshot of a deck for a lock-in.
--   p_priced = true  -> capture lock-time market prices (live creator/visitor
--                       locks: per-line prices sum to the recorded budget).
--   p_priced = false -> composition only (admin retroactive locks assert a
--                       historical price; today's prices wouldn't match it).
-- SECURITY INVOKER on purpose: RLS on deck_cards still applies, so a caller
-- can only snapshot a deck they're already allowed to see.
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
                 'counts_toward_budget', x.counts_toward_budget,
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

grant execute on function public.build_lock_snapshot(uuid, boolean)
  to anon, authenticated;

-- Admin retroactive lock now also freezes the deck's composition.
create or replace function public.admin_lock_in(
  p_deck_id   uuid,
  p_locked_at timestamptz,
  p_budget    numeric,
  p_bling     numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if not exists (
    select 1 from public.users where id = auth.uid() and is_admin
  ) then
    raise exception 'not authorized: admin only';
  end if;

  select owner_id into v_owner from public.decks where id = p_deck_id;
  if v_owner is null then
    raise exception 'deck not found';
  end if;

  delete from public.lock_ins
   where deck_id = p_deck_id and kind = 'creator';

  insert into public.lock_ins
        (deck_id, user_id, locked_at, budget_price, bling_price, currency, kind, snapshot)
  values (p_deck_id, v_owner, p_locked_at, p_budget, p_bling, 'USD', 'creator',
          public.build_lock_snapshot(p_deck_id, false));
end;
$$;
