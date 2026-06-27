-- 0020: admin role + retroactive Lock-In.
-- Lets a trusted admin stamp a backdated "creator" Lock-In onto a friend's deck
-- (the format started long before this site existed). The function is SECURITY
-- DEFINER so it can write a lock_in for a deck it doesn't own, but it first
-- verifies the caller is an admin, so it can't be abused by normal users.

alter table public.users
  add column if not exists is_admin boolean not null default false;

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

  -- Attribute the stamp to the deck owner (the friend), backdated to p_locked_at.
  insert into public.lock_ins
        (deck_id, user_id, locked_at, budget_price, bling_price, currency, kind)
  values (p_deck_id, v_owner, p_locked_at, p_budget, p_bling, 'USD', 'creator');
end;
$$;

grant execute on function
  public.admin_lock_in(uuid, timestamptz, numeric, numeric) to authenticated;
