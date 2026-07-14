-- 0041: Snapshot History — creator lock-ins are an append-only record.
-- --------------------------------------------------------------------------
-- Every creator Lock-In already inserts a new row with its own frozen
-- snapshot, so the deck's build history accumulates naturally. The one thing
-- that destroyed history was admin_lock_in: it deleted ALL previous creator
-- locks before inserting the backdated one. Now it only replaces a creator
-- lock at the exact same timestamp (so re-running a backdate corrects that
-- entry) and otherwise inserts alongside the existing history.

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

  -- Correct a previous backdate at this exact moment; keep everything else.
  delete from public.lock_ins
   where deck_id = p_deck_id and kind = 'creator' and locked_at = p_locked_at;

  insert into public.lock_ins
        (deck_id, user_id, locked_at, budget_price, bling_price, currency, kind, snapshot)
  values (p_deck_id, v_owner, p_locked_at, p_budget, p_bling, 'USD', 'creator',
          public.build_lock_snapshot(p_deck_id, false));
end;
$$;

-- History listings sort creator locks per deck by date.
create index if not exists lock_ins_deck_kind_locked_idx
  on public.lock_ins (deck_id, kind, locked_at desc);
