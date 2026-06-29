-- 0033: resolve double-faced / split card names on import.
-- Sources write these names inconsistently: "Flotsam // Jetsam", "Flotsam/Jetsam",
-- or just the front "Flotsam". 0018 dropped front-face matching to avoid a
-- timeout (an OR + LIKE made the join unsargable). Re-add it indexably: derive
-- the front (text before the first slash) and match it with the text_pattern_ops
-- range operators (which use the index even with a parameter prefix), then the
-- `// %` LIKE just rechecks the small range.

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
    cross join lateral (
      select btrim(split_part(n.name, '/', 1)) as front
    ) f
    join public.cards c
      on lower(c.name) = lower(n.name)
      or lower(c.name) = lower(f.front)
      or (lower(c.name) ~>=~ lower(f.front)
          and lower(c.name) ~<~ (lower(f.front) || chr(1114111))
          and lower(c.name) like lower(f.front) || ' //%')
    left join public.card_cheapest cc on cc.oracle_id = c.oracle_id
   order by lower(n.name),
            case
              when lower(c.name) = lower(n.name) then 0   -- exact full name
              when lower(c.name) = lower(f.front) then 1   -- exact front (single-faced)
              else 2                                        -- "Front // Back" match
            end,
            c.released_at desc nulls last;
$$;

grant execute on function public.resolve_card_names(text[]) to anon, authenticated;
