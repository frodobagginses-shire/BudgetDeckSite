-- Commander designation. The commander stays a main-board card (so its price
-- still counts toward budget) but is flagged. Deck color identity is derived
-- from the flagged commander(s)' color_identity.

alter table public.deck_cards
  add column is_commander boolean not null default false;
