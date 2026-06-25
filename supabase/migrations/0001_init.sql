-- F-2 — Budget Deck Site initial schema
-- Data model: users, cards, card_cheapest, decks, deck_cards, lock_ins
-- Target: Supabase (Postgres). Safe to run on a fresh database.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;      -- gen_random_uuid()
create extension if not exists pg_trgm;       -- fast ILIKE / trigram name search

-- ---------------------------------------------------------------------------
-- Helper: keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===========================================================================
-- users  (public profile mirror of auth.users)
-- ===========================================================================
create table public.users (
  id            uuid primary key references auth.users (id) on delete cascade,
  handle        text not null unique,
  display_name  text,
  avatar_url    text,
  created_at    timestamptz not null default now()
);

comment on table public.users is 'Public profile; id matches auth.users.id.';

-- Auto-provision a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_handle text;
  final_handle text;
  suffix int := 0;
begin
  base_handle := lower(regexp_replace(split_part(coalesce(new.email, 'user'), '@', 1), '[^a-z0-9_]', '', 'g'));
  if base_handle = '' then base_handle := 'user'; end if;
  final_handle := base_handle;
  -- ensure uniqueness
  while exists (select 1 from public.users where handle = final_handle) loop
    suffix := suffix + 1;
    final_handle := base_handle || suffix::text;
  end loop;

  insert into public.users (id, handle, display_name, avatar_url)
  values (
    new.id,
    final_handle,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- cards  (one row per Scryfall printing; synced nightly by F-3)
-- ===========================================================================
create table public.cards (
  scryfall_id      uuid primary key,
  oracle_id        uuid not null,
  name             text not null,
  set_code         text,
  collector_number text,
  type_line        text,
  cmc              numeric,
  color_identity   text[] not null default '{}',
  rarity           text,
  layout           text,
  image_normal     text,
  image_small      text,
  price_usd        numeric,          -- paper, non-foil
  price_usd_foil   numeric,          -- paper, foil
  games            text[] not null default '{}',  -- e.g. {paper,mtgo,arena}
  legalities       jsonb not null default '{}'::jsonb,
  released_at      date,
  updated_at       timestamptz not null default now()
);

create index cards_oracle_id_idx   on public.cards (oracle_id);
create index cards_name_trgm_idx   on public.cards using gin (name gin_trgm_ops);
create index cards_color_identity_idx on public.cards using gin (color_identity);

create trigger cards_set_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- card_cheapest  (derived per oracle_id by F-4; rule A1)
-- Lowest paper price across all printings, foil OR non-foil, stock ignored.
-- ===========================================================================
create table public.card_cheapest (
  oracle_id            uuid primary key,
  cheapest_scryfall_id uuid not null references public.cards (scryfall_id),
  cheapest_price_usd   numeric not null,
  is_foil              boolean not null default false,
  updated_at           timestamptz not null default now()
);

-- ===========================================================================
-- decks
-- ===========================================================================
create table public.decks (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references public.users (id) on delete cascade,
  name               text not null,
  game_format        text not null default 'commander',
  threshold_amount   numeric,                       -- null = no price cap
  threshold_currency text not null default 'USD',
  visibility         text not null default 'private'
                       check (visibility in ('public','unlisted','private')),
  description_md      text,
  parent_deck_id     uuid references public.decks (id) on delete set null,
  show_lineage       boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index decks_owner_id_idx    on public.decks (owner_id);
create index decks_visibility_idx  on public.decks (visibility);
create index decks_parent_idx      on public.decks (parent_deck_id);

create trigger decks_set_updated_at
  before update on public.decks
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- deck_cards  (chosen printing per card = drives Bling price)
-- ===========================================================================
create table public.deck_cards (
  id          uuid primary key default gen_random_uuid(),
  deck_id     uuid not null references public.decks (id) on delete cascade,
  scryfall_id uuid not null references public.cards (scryfall_id),
  quantity    int  not null default 1 check (quantity > 0),
  board       text not null default 'main'
                check (board in ('main','side','considering','maybe')),
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  unique (deck_id, scryfall_id, board)
);

create index deck_cards_deck_id_idx on public.deck_cards (deck_id);

-- ===========================================================================
-- lock_ins  (snapshot-on-press; no historical price DB needed)
-- ===========================================================================
create table public.lock_ins (
  id           uuid primary key default gen_random_uuid(),
  deck_id      uuid not null references public.decks (id) on delete cascade,
  user_id      uuid not null references public.users (id) on delete cascade,
  locked_at    timestamptz not null default now(),
  budget_price numeric not null,
  bling_price  numeric,
  currency     text not null default 'USD',
  kind         text not null check (kind in ('creator','visitor'))
);

create index lock_ins_deck_id_idx on public.lock_ins (deck_id);
create index lock_ins_user_id_idx on public.lock_ins (user_id);

-- ===========================================================================
-- Row Level Security
-- cards & card_cheapest: world-readable; writes only via service role (sync).
-- user data: owner-scoped, with visibility rules for decks.
-- ===========================================================================
alter table public.users         enable row level security;
alter table public.cards         enable row level security;
alter table public.card_cheapest enable row level security;
alter table public.decks         enable row level security;
alter table public.deck_cards    enable row level security;
alter table public.lock_ins      enable row level security;

-- users: profiles are public to read; you may update only your own.
create policy users_select_all on public.users
  for select using (true);
create policy users_update_self on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- cards / card_cheapest: read-only to everyone (anon + authenticated).
create policy cards_select_all on public.cards
  for select using (true);
create policy card_cheapest_select_all on public.card_cheapest
  for select using (true);

-- decks: visible if public/unlisted or you own it; mutate only your own.
create policy decks_select_visible on public.decks
  for select using (visibility in ('public','unlisted') or owner_id = auth.uid());
create policy decks_insert_own on public.decks
  for insert with check (owner_id = auth.uid());
create policy decks_update_own on public.decks
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy decks_delete_own on public.decks
  for delete using (owner_id = auth.uid());

-- deck_cards: follow the parent deck's visibility / ownership.
create policy deck_cards_select_visible on public.deck_cards
  for select using (
    exists (
      select 1 from public.decks d
      where d.id = deck_cards.deck_id
        and (d.visibility in ('public','unlisted') or d.owner_id = auth.uid())
    )
  );
create policy deck_cards_mutate_own on public.deck_cards
  for all using (
    exists (select 1 from public.decks d where d.id = deck_cards.deck_id and d.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.decks d where d.id = deck_cards.deck_id and d.owner_id = auth.uid())
  );

-- lock_ins: readable if you can see the deck OR it is your own stamp;
-- you may only create/delete your own stamps.
create policy lock_ins_select_visible on public.lock_ins
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.decks d
      where d.id = lock_ins.deck_id
        and (d.visibility in ('public','unlisted') or d.owner_id = auth.uid())
    )
  );
create policy lock_ins_insert_self on public.lock_ins
  for insert with check (user_id = auth.uid());
create policy lock_ins_delete_self on public.lock_ins
  for delete using (user_id = auth.uid());
