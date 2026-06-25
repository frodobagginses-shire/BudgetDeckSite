# Supabase — schema & setup (F-2)

This folder holds the database schema for Budget Deck Site.

```
supabase/
  migrations/0001_init.sql   # tables, indexes, RLS, auth trigger
  seed.sql                   # sample data for local dev
```

## What the schema includes

- **users** — public profile, `id` = `auth.users.id`. A trigger
  (`on_auth_user_created`) auto-creates a profile (with a unique handle) on signup.
- **cards** — one row per Scryfall printing (synced nightly by F-3). Trigram
  index on `name` for fast search; GIN index on `color_identity`.
- **card_cheapest** — derived per `oracle_id` by F-4 (rule **A1**: lowest paper
  price across all printings, foil or non-foil, stock ignored; stores `is_foil`).
- **decks** — `game_format` + optional `threshold_amount` (price cap) are
  separate fields, so "$20 Vintage" = `vintage` + `20`. Includes `parent_deck_id`
  + `show_lineage` for forks.
- **deck_cards** — stores the **chosen printing** (drives Bling price). Budget
  price is derived by joining each card's `oracle_id` to `card_cheapest`.
- **lock_ins** — snapshot-on-press (`budget_price`, `bling_price`, `locked_at`,
  `kind` = creator|visitor). No historical price table needed.
- **RLS** on everything: cards/card_cheapest are world-readable (writes only via
  the service-role sync job); decks honor public/unlisted/private; deck_cards and
  lock_ins follow deck ownership/visibility.

## Apply it

### Option A — Supabase CLI (recommended)

```bash
npm i -g supabase            # or: brew install supabase/tap/supabase
supabase init                # once, in the repo root
supabase link --project-ref <your-project-ref>   # from the dashboard URL
supabase db push             # applies migrations/0001_init.sql
supabase db reset            # (local) re-applies migrations + seed.sql
```

### Option B — Dashboard SQL editor

Paste `migrations/0001_init.sql` into the SQL editor and run it. Optionally run
`seed.sql` for sample data (it inserts a local dev auth user — fine for dev,
skip in production).

## Wire the app to Supabase (next step, part of F-5)

Add to `.env.local` (never commit it — it's gitignored):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...     # server-only, for the nightly sync job
```

Generate TypeScript types from the live schema:

```bash
supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
```

## Acceptance criteria (F-2) — status

- [x] All tables with keys, FKs, and indexes
- [x] Migration runs clean on a fresh DB
- [x] Seed script inserts a sample user + deck
- [ ] Run `supabase db push` against your project to apply (account step)
