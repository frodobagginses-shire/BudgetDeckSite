-- 0025: let a match creator pre-assign decks to players.
-- The host needs to see each player's eligible locked-in decks (which row-level
-- security would otherwise hide if a deck is private). This SECURITY DEFINER
-- function returns those decks only to the match creator while the match is
-- still open. set_match_deck already lets the creator assign them.

create or replace function public.match_assignable_decks(p_match uuid)
returns table (user_id uuid, deck_id uuid, name text, locked_price numeric)
language plpgsql stable security definer set search_path = public as $$
declare v_ok boolean; v_limit numeric;
begin
  select (creator_id = auth.uid() and status = 'open'), price_limit
    into v_ok, v_limit
    from public.matches where id = p_match;
  if not coalesce(v_ok, false) then return; end if;

  return query
    select mp.user_id, d.id, d.name, min(l.budget_price)::numeric
      from public.match_players mp
      join public.decks d on d.owner_id = mp.user_id
      join public.lock_ins l on l.deck_id = d.id and l.kind = 'creator'
     where mp.match_id = p_match
     group by mp.user_id, d.id, d.name
    having v_limit is null or min(l.budget_price) <= v_limit;
end $$;

grant execute on function public.match_assignable_decks(uuid) to authenticated;
