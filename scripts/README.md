# Scripts

## `sync-scryfall.ts` — nightly card data sync (F-3)

Streams the Scryfall **default_cards** bulk file and upserts every **paper**
printing into the `cards` table. Idempotent: re-running refreshes prices on the
same rows (upsert on `scryfall_id`), never duplicates. Skips digital-only cards,
tokens, emblems, and other non-addable layouts. Logs processed / upserted /
skipped / error counts and exits non-zero on failure.

### Run it manually

```bash
# 1. get the Supabase keys locally (writes .env.local, gitignored)
npx vercel env pull .env.local
# 2. install deps if you haven't
npm install
# 3. run
npm run sync:scryfall
```

`npm run sync:scryfall` auto-loads `.env.local` if present. It needs
`SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY`.
The service-role key bypasses RLS so the job can write to `cards`.

### Automated nightly run

`.github/workflows/sync-scryfall.yml` runs it every day at 08:00 UTC (and is
manually triggerable from the **Actions** tab → "Scryfall nightly sync" → "Run
workflow").

**One-time setup:** add two **repository secrets** in GitHub
(Settings → Secrets and variables → Actions → New repository secret):

- `SUPABASE_URL` — your project URL (e.g. `https://xxxx.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` — the service-role key (keep it secret)

### Notes

- First run populates the catalog (~100k+ paper printings); subsequent runs just
  refresh prices. Expect a few minutes depending on network.
- `card_cheapest` (the budget-price source) is computed from this data by **F-4**.
