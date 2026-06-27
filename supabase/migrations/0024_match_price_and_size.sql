-- 0024: match price limit + allow 3-player matches.
-- A match may set a price limit; players may only bring decks that have a
-- creator Lock-In at or below that price. Matches now activate at 3 OR 4
-- players (once everyone invited has responded).

alter table public.matches
  add column if not exists price_limit numeric;

-- Is a deck allowed in this match? (no limit, or it has a creator Lock-In <= limit)
create or replace function public.match_deck_ok(p_match uuid, p_deck uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p_deck is null then true
    when (select price_limit from public.matches where id = p_match) is null then true
    else exists (
      select 1 from public.lock_ins l
       where l.deck_id = p_deck and l.kind = 'creator'
         and l.budget_price <= (select price_limit from public.matches where id = p_match)
    )
  end;
$$;

-- create_match gains a price limit. (Drop + recreate: signature changed.)
drop function if exists public.create_match(uuid, uuid[]);
create function public.create_match(
  p_playgroup uuid, p_invitees uuid[], p_price_limit numeric default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_caller uuid := auth.uid(); v_match uuid;
begin
  if not exists (select 1 from playgroup_members
                  where playgroup_id = p_playgroup and user_id = v_caller) then
    raise exception 'not a member of this playgroup';
  end if;
  if coalesce(array_length(p_invitees, 1), 0) > 3 then
    raise exception 'a match has at most 4 players';
  end if;
  insert into matches (playgroup_id, creator_id, price_limit)
    values (p_playgroup, v_caller, p_price_limit)
    returning id into v_match;
  insert into match_players (match_id, user_id, status, is_creator)
    values (v_match, v_caller, 'accepted', true);
  insert into match_players (match_id, user_id, status)
    select v_match, u, 'invited' from unnest(p_invitees) u
     where u <> v_caller
       and exists (select 1 from playgroup_members
                    where playgroup_id = p_playgroup and user_id = u)
    on conflict do nothing;
  return v_match;
end $$;

-- Activate once 3 or 4 players are accepted and nobody is still 'invited'.
create or replace function public.activate_if_full(p_match uuid)
returns void language sql security definer set search_path = public as $$
  update matches set status = 'active', active_at = now()
   where id = p_match and status = 'open'
     and (select count(*) from match_players
           where match_id = p_match and status = 'accepted') in (3, 4)
     and not exists (select 1 from match_players
                      where match_id = p_match and status = 'invited');
$$;

create or replace function public.set_match_deck(p_match uuid, p_user uuid, p_deck uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_caller uuid := auth.uid();
begin
  if (select status from matches where id = p_match) <> 'open' then
    raise exception 'decks are locked once the match starts';
  end if;
  if v_caller <> p_user
     and not exists (select 1 from matches where id = p_match and creator_id = v_caller) then
    raise exception 'not allowed to set that deck';
  end if;
  if p_deck is not null
     and not exists (select 1 from decks where id = p_deck and owner_id = p_user) then
    raise exception 'deck does not belong to that player';
  end if;
  if not match_deck_ok(p_match, p_deck) then
    raise exception 'deck must be locked in at or below the match price limit';
  end if;
  update match_players set deck_id = p_deck
   where match_id = p_match and user_id = p_user;
end $$;

create or replace function public.respond_invite(p_match uuid, p_accept boolean, p_deck uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_caller uuid := auth.uid();
begin
  if p_deck is not null
     and not exists (select 1 from decks where id = p_deck and owner_id = v_caller) then
    raise exception 'that deck is not yours';
  end if;
  if not match_deck_ok(p_match, p_deck) then
    raise exception 'deck must be locked in at or below the match price limit';
  end if;
  update match_players
     set status = case when p_accept then 'accepted' else 'declined' end,
         deck_id = coalesce(p_deck, deck_id)
   where match_id = p_match and user_id = v_caller and status = 'invited';
  if not found then raise exception 'no pending invite'; end if;
  perform activate_if_full(p_match);
end $$;

create or replace function public.join_match(p_code text, p_deck uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_caller uuid := auth.uid(); v_match uuid;
begin
  select id into v_match from matches
   where join_code = upper(btrim(p_code)) and status = 'open';
  if v_match is null then raise exception 'no open match with that code'; end if;
  if exists (select 1 from match_players where match_id = v_match and user_id = v_caller) then
    return v_match;
  end if;
  if (select count(*) from match_players
       where match_id = v_match and status in ('invited', 'accepted')) >= 4 then
    raise exception 'match is full';
  end if;
  if p_deck is not null
     and not exists (select 1 from decks where id = p_deck and owner_id = v_caller) then
    raise exception 'that deck is not yours';
  end if;
  if not match_deck_ok(v_match, p_deck) then
    raise exception 'deck must be locked in at or below the match price limit';
  end if;
  insert into match_players (match_id, user_id, deck_id, status)
    values (v_match, v_caller, p_deck, 'accepted');
  perform activate_if_full(v_match);
  return v_match;
end $$;

grant execute on function public.match_deck_ok(uuid, uuid) to authenticated;
grant execute on function public.create_match(uuid, uuid[], numeric) to authenticated;
