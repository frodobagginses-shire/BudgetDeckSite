-- Banner focal position (object-position %), so users can reframe the art crop.
alter table public.decks
  add column banner_pos_x smallint not null default 50,
  add column banner_pos_y smallint not null default 50;
