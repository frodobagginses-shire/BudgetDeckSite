-- 0018 — make resolve_card_names fast (0017 timed out on the full table).
--
-- 0017's join used `lower(c.name) = lower(n.name) OR lower(c.name) LIKE …`.
-- The OR + LIKE makes the join unsargable, so on the real ~100k-row cards table
-- it sequentially scanned for every name and hit the role's statement timeout —
-- the RPC then errored and the importer matched nothing (even basic lands).
--
-- Fix: index lower(name) and match by indexed equality only. (Moxfield exports
-- canonical full names, including "Front // Back" for double-faced cards, so
-- exact case-insensitive equality is what we need.)

create index if not exists cards_lower_name_idx on public.cards (lower(name));

create or replace function public.resolve_card_names(p_names text[])
returns table (
  input_name  text,
  scryfall_id uuid,
  oracle_id   uuid,
  type_line   text
)
language sql
stable
as $$
  select distinct on (lower(n.name))
         n.name as input_name,
         coalesce(cc.cheapest_scryfall_id, c.scryfall_id) as scryfall_id,
         c.oracle_id,
         c.type_line
    from unnest(p_names) as n(name)
    join public.cards c on lower(c.name) = lower(n.name)
    left join public.card_cheapest cc on cc.oracle_id = c.oracle_id
   order by lower(n.name), c.released_at desc nulls last;
$$;

grant execute on function public.resolve_card_names(text[]) to anon, authenticated;

-- Refresh PostgREST's schema cache so the RPC is callable immediately.
notify pgrst, 'reload schema';
