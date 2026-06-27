-- 0017 — reliable bulk name resolution for deck imports.
--
-- The importer used `cards.name IN (…)`, which returns EVERY printing of every
-- name. A 100-card deck of well-reprinted cards can exceed the API row cap, so
-- whichever names land beyond the cap appear "not found" — an arbitrary-looking
-- list of perfectly real cards. This RPC resolves each name to a single row
-- (the cheapest printing), so the result is at most one row per input name and
-- can never be truncated. It also matches case-insensitively and resolves the
-- front-face name of double-faced / split cards ("Front" → "Front // Back").

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
    join public.cards c
      on lower(c.name) = lower(n.name)
      or lower(c.name) like lower(n.name) || ' //%'
    left join public.card_cheapest cc on cc.oracle_id = c.oracle_id
   order by lower(n.name),
            case when lower(c.name) = lower(n.name) then 0 else 1 end,
            c.released_at desc nulls last;
$$;

grant execute on function public.resolve_card_names(text[]) to anon, authenticated;
