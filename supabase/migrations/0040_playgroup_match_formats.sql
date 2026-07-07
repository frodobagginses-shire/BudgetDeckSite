-- 0040: formats for playgroups + matches, with player-count rules.
-- --------------------------------------------------------------------------
-- Playgroups now carry a game format chosen at creation (editable by the
-- owner while the member count fits). Matches copy the format from their
-- playgroup at creation, so grouping/sorting survives playgroup deletion.
--
-- Player counts by format:
--   * multiplayer (commander, casual) — 2..5 players; pods of 2 or 5 are
--     legal but the UI warns (pods play best at 3–4)
--   * everything else (1v1)           — exactly 2 players
--
-- Match activation:
--   * invite-driven: auto-activates once everyone invited has responded and
--     the accepted count is in range (min 3 for multiplayer so code-join pods
--     aren't started out from under the host; exactly 2 for 1v1)
--   * host can always explicitly start an open match with 2..max accepted
--     via start_match (covers 2-player pods and code-join lobbies)

-- ---------- columns ---------------------------------------------------------

alter table public.playgroups
  add column if not exists game_format text not null default 'commander';
alter table public.playgroups
  drop constraint if exists playgroups_format_valid;
alter table public.playgroups
  add constraint playgroups_format_valid check (
    game_format in ('commander','vintage','legacy','modern','pioneer','standard','pauper','casual')
  );

alter table public.matches
  add column if not exists game_format text not null default 'commander';
alter table public.matches
  drop constraint if exists matches_format_valid;
alter table public.matches
  add constraint matches_format_valid check (
    game_format in ('commander','vintage','legacy','modern','pioneer','standard','pauper','casual')
  );

-- Backfill existing matches from their playgroup where the link survives.
update public.matches m
   set game_format = g.game_format
  from public.playgroups g
 where g.id = m.playgroup_id;

-- ---------- capacity helpers ------------------------------------------------

create or replace function public.format_max_players(p_format text)
returns int
language sql
immutable
as $$
  select case when p_format in ('commander', 'casual') then 5 else 2 end;
$$;

-- Hard cap on playgroup membership (covers direct inserts, owner adds, and
-- join_playgroup — all paths hit this trigger).
create or replace function public.enforce_playgroup_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fmt text;
  v_max int;
  v_count int;
begin
  select game_format into v_fmt from playgroups where id = new.playgroup_id;
  v_max := format_max_players(v_fmt);
  select count(*) into v_count
    from playgroup_members where playgroup_id = new.playgroup_id;
  if v_count >= v_max then
    raise exception 'This % playgroup is full (max % players).', v_fmt, v_max;
  end if;
  return new;
end $$;

drop trigger if exists playgroup_members_capacity on public.playgroup_members;
create trigger playgroup_members_capacity
  before insert on public.playgroup_members
  for each row execute function public.enforce_playgroup_capacity();

-- Owners may change a group's format only while the member count fits.
create or replace function public.enforce_playgroup_format_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max int;
  v_count int;
begin
  if new.game_format is distinct from old.game_format then
    v_max := format_max_players(new.game_format);
    select count(*) into v_count
      from playgroup_members where playgroup_id = new.id;
    if v_count > v_max then
      raise exception '% playgroups allow at most % players — remove members first.',
        new.game_format, v_max;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists playgroups_format_change on public.playgroups;
create trigger playgroups_format_change
  before update on public.playgroups
  for each row execute function public.enforce_playgroup_format_change();

-- ---------- match RPCs ------------------------------------------------------

-- create_match v3: match inherits the playgroup's format; invitee cap follows it.
create or replace function public.create_match(
  p_playgroup uuid, p_invitees uuid[], p_price_limit numeric default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_match uuid;
  v_fmt text;
  v_max int;
begin
  if not exists (select 1 from playgroup_members
                  where playgroup_id = p_playgroup and user_id = v_caller) then
    raise exception 'not a member of this playgroup';
  end if;
  select game_format into v_fmt from playgroups where id = p_playgroup;
  v_max := format_max_players(v_fmt);
  if coalesce(array_length(p_invitees, 1), 0) > v_max - 1 then
    raise exception 'a % match has at most % players', v_fmt, v_max;
  end if;
  insert into matches (playgroup_id, creator_id, price_limit, game_format)
    values (p_playgroup, v_caller, p_price_limit, v_fmt)
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

-- activate_if_full v2: format-aware auto-activation (see header comment).
create or replace function public.activate_if_full(p_match uuid)
returns void language sql security definer set search_path = public as $$
  update matches m set status = 'active', active_at = now()
   where m.id = p_match and m.status = 'open'
     and not exists (select 1 from match_players
                      where match_id = p_match and status = 'invited')
     and (select count(*) from match_players
           where match_id = p_match and status = 'accepted')
         between case when m.game_format in ('commander', 'casual') then 3 else 2 end
             and public.format_max_players(m.game_format);
$$;

-- join_match v2: the "full" check follows the match format.
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
       where match_id = v_match and status in ('invited', 'accepted'))
     >= (select format_max_players(game_format) from matches where id = v_match) then
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

-- Explicit host start: any open match with 2..max accepted and no pending
-- invites. This is how 2-player pods and code-join lobbies begin.
create or replace function public.start_match(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_fmt text;
  v_max int;
  v_n int;
begin
  if not exists (select 1 from matches
                  where id = p_match and creator_id = v_caller and status = 'open') then
    raise exception 'only the host can start an open match';
  end if;
  if exists (select 1 from match_players
              where match_id = p_match and status = 'invited') then
    raise exception 'players are still deciding — wait for responses';
  end if;
  select game_format into v_fmt from matches where id = p_match;
  v_max := format_max_players(v_fmt);
  select count(*) into v_n from match_players
   where match_id = p_match and status = 'accepted';
  if v_n < 2 or v_n > v_max then
    raise exception 'a % match needs 2 to % players (currently %)', v_fmt, v_max, v_n;
  end if;
  update matches set status = 'active', active_at = now() where id = p_match;
end $$;

grant execute on function public.format_max_players(text) to anon, authenticated;
grant execute on function public.start_match(uuid) to authenticated;
