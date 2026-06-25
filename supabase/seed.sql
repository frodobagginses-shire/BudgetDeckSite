-- F-2 seed — sample data for local development only.
-- Run automatically by `supabase db reset`. Idempotent.

-- --- sample cards (3 printings) -------------------------------------------
insert into public.cards
  (scryfall_id, oracle_id, name, set_code, collector_number, type_line, cmc,
   color_identity, rarity, image_normal, price_usd, price_usd_foil, games, legalities)
values
  ('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Omnath, Locus of Rage','BFZ','211','Legendary Creature — Elemental',6,
   '{R,G}','mythic','https://example.com/omnath.jpg',0.32,4.10,'{paper,mtgo}','{"commander":"legal"}'),
  ('22222222-2222-2222-2222-222222222222','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'Lightning Bolt','2X2','117','Instant',1,
   '{R}','uncommon','https://example.com/bolt.jpg',0.86,2.50,'{paper,mtgo}','{"commander":"legal","modern":"legal"}'),
  ('33333333-3333-3333-3333-333333333333','cccccccc-cccc-cccc-cccc-cccccccccccc',
   'Rampant Growth','M20','190','Sorcery',2,
   '{G}','common','https://example.com/rampant.jpg',0.18,0.40,'{paper,mtgo}','{"commander":"legal"}')
on conflict (scryfall_id) do nothing;

-- --- derived cheapest printings (rule A1: min paper price, foil or not) ----
insert into public.card_cheapest (oracle_id, cheapest_scryfall_id, cheapest_price_usd, is_foil)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111',0.32,false),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','22222222-2222-2222-2222-222222222222',0.86,false),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc','33333333-3333-3333-3333-333333333333',0.18,false)
on conflict (oracle_id) do nothing;

-- --- sample auth user (local dev) -> trigger creates public.users profile --
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password,
   email_confirmed_at, created_at, updated_at,
   raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000',
   '99999999-9999-9999-9999-999999999999',
   'authenticated','authenticated','dev@example.com',
   crypt('password123', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Dev Tester","name":"Dev Tester"}')
on conflict (id) do nothing;

-- --- sample $15 Commander deck owned by the dev user -----------------------
insert into public.decks
  (id, owner_id, name, game_format, threshold_amount, threshold_currency,
   visibility, description_md)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   '99999999-9999-9999-9999-999999999999',
   '$15 Omnath Landfall','commander',15,'USD','public',
   '# Sample budget deck\nValidated on cheapest printings.')
on conflict (id) do nothing;

insert into public.deck_cards (deck_id, scryfall_id, quantity, board)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd','11111111-1111-1111-1111-111111111111',1,'main'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd','22222222-2222-2222-2222-222222222222',1,'main'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd','33333333-3333-3333-3333-333333333333',1,'main')
on conflict (deck_id, scryfall_id, board) do nothing;

-- --- sample creator Lock In stamp -----------------------------------------
insert into public.lock_ins (deck_id, user_id, budget_price, bling_price, currency, kind)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   '99999999-9999-9999-9999-999999999999',
   1.36, 7.00, 'USD', 'creator')
on conflict do nothing;
