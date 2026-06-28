-- 0028: store oracle text + keywords so we can validate commander legality,
-- partners, and "any number of cards named" singleton exceptions.
-- These populate on the next Scryfall sync; until then commander checks fall
-- back to the type line (legendary creature) and singleton allows only basics.

alter table public.cards
  add column if not exists oracle_text text,
  add column if not exists keywords    text[] not null default '{}';
