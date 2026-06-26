-- Deck banners. Needs each card's landscape art crop and EDHREC rank (for the
-- non-EDH auto-pick = most popular card). The nightly sync (updated) populates
-- image_art_crop + edhrec_rank; re-run it once after applying this.

alter table public.cards add column image_art_crop text;
alter table public.cards add column edhrec_rank int;
create index cards_edhrec_rank_idx on public.cards (edhrec_rank);

-- Optional manual override of the deck banner (a card in the deck).
alter table public.decks add column banner_scryfall_id uuid;
