-- 0023: match tracking + deck W/L records.
-- Flow: a playgroup member creates a match and invites up to 3 others (or shares
-- the join code). Players pick a deck and accept; at 4 accepted the match goes
-- active. Any player submits a result (single winner or draw); the others
-- accept/reject. All accept -> completed. Reject -> back to active. Time-based
-- transitions (24h auto-accept, 72h expiry) are applied lazily by
-- reconcile_matches(), called when the matches page loads (no cron needed).

create table public.matches (
  id           uuid primary key default gen_random_uuid(),
  playgroup_id uuid references public.playgroups (id) on delete set null,
  creator_id   uuid not null references public.users (id) on delete cascade,
  join_code    text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  status       text not null default 'open'
               check (status in ('open', 'active', 'completed', 'expired')),
  created_at   timestamptz not null default now(),
  active_at    timestamptz,
  completed_at timestamptz
);

create table public.match_players (
  match_id   uuid not null references public.matches (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  deck_id    uuid references public.decks (id) on delete set null,
  status     text not null default 'invited'
             check (status in ('invited', 'accepted', 'declined')),
  is_creator boolean not null default false,
  primary key (match_id, user_id)
);
create index match_players_user_idx on public.match_players (user_id);

create table public.match_results (
  id             uuid primary key default gen_random_uuid(),
  match_id       uuid not null references public.matches (id) on delete cascade,
  submitted_by   uuid not null references public.users (id) on delete cascade,
  winner_user_id uuid references public.users (id) on delete set null,
  is_draw        boolean not null default false,
  status         text not null default 'pending'
                 check (status in ('pending', 'accepted', 'rejected')),
  submitted_at   timestamptz not null default now()
);
create index match_results_match_idx on public.match_results (match_id);

create table public.match_result_responses (
  result_id    uuid not null references public.match_results (id) on delete cascade,
  user_id      uuid not null references public.users (id) on delete cascade,
  accepted     boolean not null,
  responded_at timestamptz not null default now(),
  primary key (result_id, user_id)
);

alter table public.decks
  add column if not exists record_public boolean not null default false;

-- ---- visibility helper + RLS ---------------------------------------------
create or replace function public.is_match_player(p_match uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.match_players
     where match_id = p_match and user_id = p_user
  );
$$;

alter table public.matches               enable row level security;
alter table public.match_players         enable row level security;
alter table public.match_results         enable row level security;
alter table public.match_result_responses enable row level security;

create policy matches_select on public.matches
  for select using (
    creator_id = auth.uid() or public.is_match_player(id, auth.uid())
  );
create policy match_players_select on public.match_players
  for select using (public.is_match_player(match_id, auth.uid()));
create policy match_results_select on public.match_results
  for select using (public.is_match_player(match_id, auth.uid()));
create policy match_result_responses_select on public.match_result_responses
  for select using (
    exists (select 1 from public.match_results r
             where r.id = result_id and public.is_match_player(r.match_id, auth.uid()))
  );

-- ---- mutations (all SECURITY DEFINER, rules enforced in SQL) --------------
create or replace function public.create_match(p_playgroup uuid, p_invitees uuid[])
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
  insert into matches (playgroup_id, creator_id) values (p_playgroup, v_caller)
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
  update match_players set deck_id = p_deck
   where match_id = p_match and user_id = p_user;
end $$;

create or replace function public.activate_if_full(p_match uuid)
returns void language sql security definer set search_path = public as $$
  update matches set status = 'active', active_at = now()
   where id = p_match and status = 'open'
     and (select count(*) from match_players
           where match_id = p_match and status = 'accepted') = 4;
$$;

create or replace function public.respond_invite(p_match uuid, p_accept boolean, p_deck uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_caller uuid := auth.uid();
begin
  if p_deck is not null
     and not exists (select 1 from decks where id = p_deck and owner_id = v_caller) then
    raise exception 'that deck is not yours';
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
  insert into match_players (match_id, user_id, deck_id, status)
    values (v_match, v_caller, p_deck, 'accepted');
  perform activate_if_full(v_match);
  return v_match;
end $$;

create or replace function public.submit_result(p_match uuid, p_winner uuid, p_draw boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_caller uuid := auth.uid(); v_res uuid;
begin
  if not exists (select 1 from match_players
                  where match_id = p_match and user_id = v_caller and status = 'accepted') then
    raise exception 'not a player in this match';
  end if;
  if (select status from matches where id = p_match) <> 'active' then
    raise exception 'match is not active';
  end if;
  if not p_draw and not exists (select 1 from match_players
        where match_id = p_match and user_id = p_winner and status = 'accepted') then
    raise exception 'winner must be a player in the match';
  end if;
  update match_results set status = 'rejected'
   where match_id = p_match and status = 'pending';
  insert into match_results (match_id, submitted_by, winner_user_id, is_draw)
    values (p_match, v_caller, case when p_draw then null else p_winner end, p_draw)
    returning id into v_res;
  insert into match_result_responses (result_id, user_id, accepted)
    values (v_res, v_caller, true);
  return v_res;
end $$;

create or replace function public.respond_result(p_result uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_caller uuid := auth.uid(); v_match uuid; v_yes int; v_players int;
begin
  select match_id into v_match from match_results where id = p_result and status = 'pending';
  if v_match is null then raise exception 'no pending result'; end if;
  if not exists (select 1 from match_players
                  where match_id = v_match and user_id = v_caller and status = 'accepted') then
    raise exception 'not a player in this match';
  end if;
  insert into match_result_responses (result_id, user_id, accepted)
    values (p_result, v_caller, p_accept)
    on conflict (result_id, user_id)
      do update set accepted = excluded.accepted, responded_at = now();
  if not p_accept then
    update match_results set status = 'rejected' where id = p_result;
    return;
  end if;
  select count(*) into v_yes from match_result_responses where result_id = p_result and accepted;
  select count(*) into v_players from match_players where match_id = v_match and status = 'accepted';
  if v_yes >= v_players then
    update match_results set status = 'accepted' where id = p_result;
    update matches set status = 'completed', completed_at = now() where id = v_match;
  end if;
end $$;

create or replace function public.reconcile_matches()
returns void language plpgsql security definer set search_path = public as $$
begin
  -- 24h auto-accept of a pending result -> completed
  update match_results r set status = 'accepted'
    from matches m
   where r.match_id = m.id and r.status = 'pending' and m.status = 'active'
     and r.submitted_at < now() - interval '24 hours';
  update matches m set status = 'completed', completed_at = now()
   where m.status = 'active'
     and exists (select 1 from match_results r where r.match_id = m.id and r.status = 'accepted');
  -- 72h expiry: active with no accepted and no live pending result
  update matches m set status = 'expired'
   where m.status = 'active' and m.active_at < now() - interval '72 hours'
     and not exists (select 1 from match_results r where r.match_id = m.id and r.status = 'pending');
  -- expire open matches that never filled
  update matches m set status = 'expired'
   where m.status = 'open' and m.created_at < now() - interval '72 hours';
end $$;

-- ---- deck W/L record (feature 3) -----------------------------------------
-- SECURITY DEFINER so a public record can be read without exposing match rows.
-- Returns nothing if the record is private and the caller is not the owner.
create or replace function public.deck_record(p_deck uuid)
returns table (wins int, losses int, draws int, beat text[], lost_to text[])
language plpgsql stable security definer set search_path = public as $$
declare v_owner uuid; v_public boolean;
begin
  select owner_id, record_public into v_owner, v_public from decks where id = p_deck;
  if v_owner is null then return; end if;
  if not coalesce(v_public, false) and v_owner is distinct from auth.uid() then return; end if;

  return query
  with played as (
    select m.id as match_id, mp.user_id as player, r.winner_user_id, r.is_draw
      from matches m
      join match_results r on r.match_id = m.id and r.status = 'accepted'
      join match_players mp on mp.match_id = m.id and mp.deck_id = p_deck
     where m.status = 'completed'
  )
  select
    count(*) filter (where not p.is_draw and p.winner_user_id = p.player)::int,
    count(*) filter (where not p.is_draw and p.winner_user_id <> p.player)::int,
    count(*) filter (where p.is_draw)::int,
    coalesce((
      select array_agg(distinct a) from (
        select unnest(d2.archetypes) a
          from played pw
          join match_players mp2 on mp2.match_id = pw.match_id and mp2.deck_id <> p_deck
          join decks d2 on d2.id = mp2.deck_id
         where not pw.is_draw and pw.winner_user_id = pw.player
      ) z
    ), '{}'),
    coalesce((
      select array_agg(distinct a) from (
        select unnest(dw.archetypes) a
          from played pl
          join match_players mpw on mpw.match_id = pl.match_id and mpw.user_id = pl.winner_user_id
          join decks dw on dw.id = mpw.deck_id
         where not pl.is_draw and pl.winner_user_id <> pl.player
      ) z
    ), '{}')
  from played p;
end $$;

grant execute on function public.is_match_player(uuid, uuid) to authenticated;
grant execute on function public.create_match(uuid, uuid[]) to authenticated;
grant execute on function public.set_match_deck(uuid, uuid, uuid) to authenticated;
grant execute on function public.activate_if_full(uuid) to authenticated;
grant execute on function public.respond_invite(uuid, boolean, uuid) to authenticated;
grant execute on function public.join_match(text, uuid) to authenticated;
grant execute on function public.submit_result(uuid, uuid, boolean) to authenticated;
grant execute on function public.respond_result(uuid, boolean) to authenticated;
grant execute on function public.reconcile_matches() to authenticated;
grant execute on function public.deck_record(uuid) to anon, authenticated;
