-- 0021: deck archetype tags (up to 3 EDHREC-style themes per deck).
alter table public.decks
  add column if not exists archetypes text[] not null default '{}';
