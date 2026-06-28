-- 0027: freeze each player's decklist when a match starts.
-- Decklists are dynamic, but a match result must be a permanent record. When a
-- match activates we snapshot every player's current list into match_players.
-- Participants can read these later (RLS already limits match_players to
-- participants); non-participants never see them (they only get the anonymized
-- W/L + archetype counts via deck_record).

alter table public.match_players
  add column if not exists deck_snapshot jsonb;

create or replace function public.activate_if_full(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update matches set status = 'active', active_at = now()
   where id = p_match and status = 'open'
     and (select count(*) from match_players
           where match_id = p_match and status = 'accepted') in (3, 4)
     and not exists (select 1 from match_players
                      where match_id = p_match and status = 'invited');
  if not found then return; end if;

  update match_players mp
     set deck_snapshot = jsonb_build_object(
       'name', d.name,
       'archetypes', d.archetypes,
       'cards', coalesce((
         select jsonb_agg(
                  jsonb_build_object(
                    'name', c.name, 'qty', dc.quantity,
                    'board', dc.board, 'commander', dc.is_commander)
                  order by dc.is_commander desc, c.name)
           from deck_cards dc
           join cards c on c.scryfall_id = dc.scryfall_id
          where dc.deck_id = mp.deck_id
       ), '[]'::jsonb)
     )
    from decks d
   where d.id = mp.deck_id
     and mp.match_id = p_match
     and mp.deck_id is not null
     and mp.deck_snapshot is null;
end $$;
