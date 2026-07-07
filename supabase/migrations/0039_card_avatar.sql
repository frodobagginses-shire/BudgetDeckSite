-- 0039: card-art profile pictures.
-- --------------------------------------------------------------------------
-- Users pick a card, then drag/zoom its art inside a circle. We store the
-- card reference + transform and render with CSS (same pattern as the deck
-- banner's drag-to-reposition) — no image processing or storage bucket.
--   avatar_card_id — scryfall_id of the chosen printing (plain text, no FK:
--                    card resyncs must not be blocked by avatars)
--   avatar_x/y     — art focal point, percent (object-position)
--   avatar_zoom    — scale factor, 1–4
-- The legacy avatar_url column stays untouched.

alter table public.users
  add column if not exists avatar_card_id text,
  add column if not exists avatar_x    numeric not null default 50,
  add column if not exists avatar_y    numeric not null default 50,
  add column if not exists avatar_zoom numeric not null default 1;

alter table public.users
  drop constraint if exists users_avatar_transform_valid;

alter table public.users
  add constraint users_avatar_transform_valid check (
    avatar_x between 0 and 100
    and avatar_y between 0 and 100
    and avatar_zoom between 1 and 4
  );
