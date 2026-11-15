-- 0043: Tokens.
-- --------------------------------------------------------------------------
-- Scryfall links each card to the tokens, emblems and helper cards it makes
-- ("all_parts"): Omnath -> 5/5 Elemental, Koth -> Koth Emblem, disguise
-- cards -> "A Mysterious Creature", Adventures -> "On an Adventure", etc.
--
-- 1. tokens: one row per token / emblem / helper printing. Kept out of
--    `cards` so search, pricing, deck building and Browse never see them.
-- 2. cards.token_ids: the printings each card's all_parts points at (token and
--    combo_piece links). Some of those ids are other real cards rather than
--    tokens; deck_tokens() only keeps the ones found in `tokens`.
-- 3. deck_tokens(deck): the distinct tokens a deck's main deck + sideboard
--    make, one printing each, with the names of the cards that make them.
--
-- Both are filled by the nightly Scryfall sync.

create table if not exists public.tokens (
  scryfall_id      uuid primary key,
  oracle_id        uuid,
  name             text not null,
  type_line        text,
  layout           text,
  set_code         text,
  collector_number text,
  image_normal     text,
  image_small      text,
  price_usd        numeric,
  games            text[] not null default '{}',
  digital          boolean not null default false,
  released_at      date,
  updated_at       timestamptz not null default now()
);

create index if not exists tokens_oracle_id_idx on public.tokens (oracle_id);

drop trigger if exists tokens_set_updated_at on public.tokens;
create trigger tokens_set_updated_at
  before update on public.tokens
  for each row execute function public.set_updated_at();

alter table public.tokens enable row level security;
drop policy if exists tokens_select_all on public.tokens;
create policy tokens_select_all on public.tokens
  for select using (true);

-- Constant default, so this is a metadata-only change (no table rewrite).
alter table public.cards
  add column if not exists token_ids uuid[] not null default '{}';

create or replace function public.deck_tokens(p_deck_id uuid)
returns table (
  scryfall_id      uuid,
  name             text,
  type_line        text,
  set_code         text,
  collector_number text,
  image_normal     text,
  made_by          text[]
)
language sql
stable
as $$
  with deck as (
    -- Cards that get played: main deck (commanders included) + sideboard.
    select distinct c.oracle_id, c.name, dc.scryfall_id
      from public.deck_cards dc
      join public.cards c on c.scryfall_id = dc.scryfall_id
     where dc.deck_id = p_deck_id
       and dc.board in ('main', 'side')
  ),
  links as (
    -- Look across every printing of each card: older printings often have
    -- no links, and the chosen printing may point at a digital-only token.
    select d.name                               as made_by,
           t.scryfall_id                        as token_id,
           coalesce(t.oracle_id, t.scryfall_id) as token_key,
           p.scryfall_id = d.scryfall_id        as from_deck_printing
      from deck d
      join public.cards p on p.oracle_id = d.oracle_id
      cross join lateral unnest(p.token_ids) as l(id)
      join public.tokens t on t.scryfall_id = l.id
  ),
  makers as (
    select token_key, array_agg(distinct made_by order by made_by) as made_by
      from links
     group by token_key
  ),
  linked as (
    select token_id, bool_or(from_deck_printing) as from_deck_printing
      from links
     group by token_id
  ),
  picks as (
    -- One printing per token: paper with an image first, then the one the
    -- deck's own printing links to, then any linked one, then the newest.
    select distinct on (m.token_key)
           t.scryfall_id, t.name, t.type_line, t.set_code,
           t.collector_number, t.image_normal, m.made_by
      from makers m
      join public.tokens t
        on t.oracle_id = m.token_key or t.scryfall_id = m.token_key
      left join linked l on l.token_id = t.scryfall_id
     order by m.token_key,
              ('paper' = any(t.games) and not t.digital) desc,
              (t.image_normal is not null) desc,
              coalesce(l.from_deck_printing, false) desc,
              (l.token_id is not null) desc,
              t.released_at desc nulls last,
              t.scryfall_id
  )
  select * from picks order by name, type_line, scryfall_id;
$$;

grant execute on function public.deck_tokens(uuid) to anon, authenticated;
