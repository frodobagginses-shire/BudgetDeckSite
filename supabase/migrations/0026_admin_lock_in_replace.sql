-- 0026: make the admin retroactive Lock-In authoritative.
-- The deck shows the most recent creator Lock-In, so a backdated admin stamp was
-- being overridden by any newer creator Lock-In (e.g. a test press). An admin
-- override should be the single source of truth, so it now clears existing
-- creator Lock-Ins for that deck before inserting the backdated one. Visitor
-- stamps (other users') are left untouched.

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

  -- Replace any existing creator Lock-In so the backdated stamp is authoritative.
  delete from public.lock_ins
   where deck_id = p_deck_id and kind = 'creator';

  insert into public.lock_ins
        (deck_id, user_id, locked_at, budget_price, bling_price, currency, kind)
  values (p_deck_id, v_owner, p_locked_at, p_budget, p_bling, 'USD', 'creator');
end;
$$;
