# Phase 1 Build Backlog

*Budget Deck Website — delegate-ready tickets for Phase 0 (Foundations) + Phase 1 (MVP)*
*Prepared June 25, 2026 · Companion docs: `mvp-scope-and-roadmap.md`, `moxfield-feature-teardown.md`*

## How to use this

Tickets are grouped into epics and ordered so dependencies come first. Each ticket has an **ID**, **acceptance criteria** (the testable definition of done), **dependencies**, and a rough **size** (S ≈ ≤1 day, M ≈ 2–4 days, L ≈ 1–2 weeks for one builder). Hand a ticket to a dev/AI as-is; the acceptance criteria are the contract.

**Stack assumed:** Next.js (App Router, TS) + Tailwind/shadcn on Vercel; Supabase (Postgres + Auth + Storage); Scryfall data cached nightly. See roadmap §2.

**Standing assumptions (override if you disagree):**

- **A1 — "Cheapest printing" rule:** Budget price uses the **lowest paper Scryfall price across *all* printings** of a card (by `oracle_id`), considering **both non-foil and foil** prices and **regardless of stock** — sometimes the foil is the cheapest. This mirrors Moxfield's "switch to cheapest printing." Only **non-paper (digital/MTGO tix)** is excluded. Printings with no paper price are ignored; a card with no paper price anywhere is flagged "price unavailable." The cheapest result records which printing and whether it's the foil or non-foil price.
- **A2 — Currency:** USD only in Phase 1 (matches TCGPlayer); schema leaves room for others.
- **A3 — Prices** come from our nightly Scryfall sync, not live per request.

---

## Epic 0 — Foundations (Phase 0, gates everything)

### F-1 — Project scaffold & deploy pipeline — **S**
Stand up Next.js (App Router, TypeScript), Tailwind + shadcn/ui, ESLint/Prettier, and connect to Vercel with preview + production deploys.
**Acceptance:** pushing to main deploys to production; PRs get preview URLs; a hello-world page renders with Tailwind styling.
**Depends on:** —

### F-2 — Supabase project + schema migrations — **M**
Create the Supabase project; implement the data model from roadmap §4 as versioned migrations: `users`, `cards`, `card_cheapest`, `decks`, `deck_cards`, `lock_ins`. Set up a migration tool (e.g. Supabase CLI / drizzle / prisma).
**Acceptance:** all tables exist with keys, FKs, and indexes (esp. `cards.oracle_id`, `deck_cards.deck_id`, `lock_ins.user_id`); migrations run clean on a fresh DB; a seed script inserts a sample user + deck.
**Depends on:** F-1

### F-3 — Scryfall bulk ingestion job — **M**
Nightly job that downloads Scryfall bulk "default cards," upserts into `cards` (name, set, collector no., type_line, cmc, color_identity, rarity, image_uris, price_usd, price_usd_foil, legalities, oracle_id).
**Acceptance:** job populates the full card catalog; re-running updates prices without duplicating rows; completes within the cron window; logs counts + failures. Respects Scryfall API guidelines (rate limits, attribution).
**Depends on:** F-2

### F-4 — Cheapest-printing computation — **S**
After each sync, compute `card_cheapest` per `oracle_id` using rule **A1**: for each printing take `min(price_usd, price_usd_foil)` (ignoring nulls), then take the lowest across all paper printings. Store the winning `scryfall_id`, the price, and an `is_foil` flag. Non-paper printings excluded.
**Acceptance:** every oracle card with ≥1 paper price has a `card_cheapest` row pointing to the correct printing, price, and foil flag — including cases where a foil printing is the cheapest; cards with no paper price anywhere are flagged "price unavailable" and excluded from budget math. Unit tests cover: foil-cheaper-than-nonfoil, only-foil-priced, and no-price cards.
**Depends on:** F-3

### F-5 — Google auth + user provisioning — **M**
Supabase Auth with Google as the only provider. On first sign-in, create a `users` row (handle, display name, avatar). Session handling in Next.js (server + client).
**Acceptance:** a new user can sign in with Google, lands logged-in, and has a `users` row; sign-out works; protected routes redirect anonymous users; handle is unique and editable later.
**Depends on:** F-2

### F-6 — Card search API + Scryfall-style query parsing — **M**
Server endpoint for card search over our cached `cards`. Support name autocomplete plus a useful subset of Scryfall syntax for Phase 1: `t:` (type), `c:`/`ci:` (color/identity), `cmc`/`mv` comparisons, `r:` (rarity). Postgres full-text for names.
**Acceptance:** typing a partial name returns ranked matches with price; `t:creature mv<=2 ci:rg` returns only legal matches; results include the card's cheapest price and chosen-printing options; p95 latency < 300ms on the cached catalog.
**Depends on:** F-3

---

## Epic 1 — Deck CRUD & data plumbing

### D-1 — Create / read / update / delete decks — **M**
APIs + minimal UI to create a deck (name, game format, threshold amount, visibility), edit metadata, and delete. Markdown `description`.
**Acceptance:** a logged-in user can create, rename, change format/threshold/visibility, and delete their own deck; visibility is enforced (private invisible to others, unlisted reachable by link, public listed); non-owners cannot edit.
**Depends on:** F-5

### D-2 — Deck card operations (add/remove/quantity/board) — **M**
Add a card (chosen printing) to a deck, set quantity, move between boards (main/sideboard/considering), remove. Persist `deck_cards`.
**Acceptance:** adding a card stores the chosen printing id; quantity changes persist; a card can be moved across boards; removing deletes the row; color-identity/format-illegal cards are blocked from main (with a clear message). Changes autosave.
**Depends on:** D-1, F-6

### D-3 — Dual-price computation service — **M**
Server logic computing, for any deck: **Budget price** (Σ qty × `card_cheapest` by oracle_id) and **Bling price** (Σ qty × chosen printing price), plus per-type subtotals and per-card prices. Handle "price unavailable" gracefully.
**Acceptance:** both totals match a hand-computed fixture deck to the cent; per-type subtotals sum to the total; a card with no valid cheapest price is excluded from Budget and flagged; results returned in one payload for the deck view/editor.
**Depends on:** D-2, F-4

---

## Epic 2 — Deck Editor (the core surface)

### E-1 — Editor shell & card list — **L**
The inline editor page: header (name, format/threshold badges, description), card-add search box, and the grouped card list with per-card prices and per-type subtotals. Text view first.
**Acceptance:** owner sees their deck grouped by type with quantities, per-card prices, and per-type subtotals; non-owners are routed to the read-only deck view; layout matches the teardown's editor model.
**Depends on:** D-3

### E-2 — Add-card autocomplete with prices + quick-add — **M**
Wire the search box to F-6: dropdown shows name + price; Enter/click adds; Shift+Enter quick-adds top result; color-identity/format enforced inline.
**Acceptance:** typing shows priced suggestions < 300ms; selecting adds to main deck and updates totals without full reload; Shift+Enter adds the first result; illegal cards are visibly disabled.
**Depends on:** E-1, D-2

### E-3 — Threshold selector + under/over indicator — **S**
Control to set the deck's threshold (presets $15/$20/$50 + custom + none) and a live badge comparing **Budget price** to it ("Under $15 ✓" / "Over by $2.40").
**Acceptance:** changing threshold persists and instantly updates the badge; badge is green when Budget ≤ threshold, red otherwise, hidden when threshold = none; uses Budget price (not Bling).
**Depends on:** E-1, D-3

### E-4 — Dual-price display (Budget + Bling) — **S**
Show both totals together in the editor and sticky bar: "Budget: $14.62 ✓ · Your printings: $28.40."
**Acceptance:** both update live as cards/printings/quantities change; "price unavailable" cards are noted; matches D-3 output.
**Depends on:** E-1, D-3

### E-5 — Switch printing / "use cheapest" — **M**
Per-card action to change the chosen printing (affects Bling) and a one-click "use cheapest printing" (sets chosen = cheapest). Show per-printing prices.
**Acceptance:** changing printing updates Bling price and the card image; "use cheapest" sets the chosen printing to the A1 cheapest and is reflected in both totals; choice persists.
**Depends on:** E-1, D-3

### E-6 — Grouping, sorting & view modes — **M**
Group by Type/Color/CMC/Rarity; sort by Name/Mana Value/**Price**; Text and Image (visual) views.
**Acceptance:** each grouping/sort re-renders correctly incl. sort-by-price; view toggle switches text↔image; preference persists per deck (localStorage acceptable for Phase 1).
**Depends on:** E-1

### E-7 — Paste-import a list — **M**
Import a deck from pasted text (Arena/MTGO/plain "1 Lightning Bolt"). Match names to cards; report unmatched lines.
**Acceptance:** pasting a valid list populates the deck with correct quantities; unmatched/ambiguous lines are listed for the user to fix; importing recomputes both prices. A 100-card list imports in one action.
**Depends on:** D-2, F-6

### E-8 — Per-card action menu (subset) — **S**
Row menu: Add one / Remove / Move to sideboard / Move to considering / Switch printing / Use cheapest / Copy card name / Buy. (Tags, mana-cost override deferred.)
**Acceptance:** each action works and updates totals; keyboard shortcuts Alt+1 (add), Alt+2 (remove), Alt+3 (sideboard), Alt+4 (considering) function; menu matches teardown's confirmed set minus deferred items.
**Depends on:** E-1, E-5

---

## Epic 3 — Deck View (public) & monetization

### V-1 — Public deck view page (SSR) — **L**
Server-rendered read-only deck page: header, grouped list, mana curve + type counts, **dual price**, Lock In badge slot, primer (rendered Markdown). SEO meta + Open Graph.
**Acceptance:** a public/unlisted deck renders for anyone with correct prices, curve, and counts; primer Markdown renders safely (sanitized); page has title/description/OG image; Lighthouse SEO ≥ 90.
**Depends on:** D-3

### V-2 — Export menu — **S**
Copy for Moxfield / Arena / MTGO / Plain Text and a download.
**Acceptance:** each format outputs a correct, importable list (verified by re-importing via E-7); download produces a valid file.
**Depends on:** V-1

### V-3 — Affiliate buy: whole-deck (TCGPlayer Mass Entry) — **M**
"Buy this deck" builds a TCGPlayer Mass Entry URL with our affiliate code from the deck's cards (default to cheapest printings; option to use chosen). Open in new tab.
**Acceptance:** clicking opens TCGPlayer with the full list in cart-ready Mass Entry format and our affiliate parameter present; an option toggles cheapest vs chosen printings; click is logged for analytics.
**Depends on:** V-1, D-3

### V-4 — Affiliate buy: single card — **S**
Per-card buy link (TCGPlayer, affiliate-tagged) in the editor and deck view.
**Acceptance:** each card links to its TCGPlayer page with affiliate param; opens in new tab; click logged.
**Depends on:** V-1

### V-5 — Affiliate click analytics — **S**
Instrument whole-deck and single-card buy clicks (Plausible/PostHog) with deck id + card id.
**Acceptance:** clicks appear as events with useful properties; a basic funnel (deck view → buy click) is visible in the analytics dashboard.
**Depends on:** V-3, V-4

---

## Epic 4 — Lock In, Fork, Profiles, Discovery

### L-1 — Lock In: creator stamp — **M**
Owner presses Lock In on their deck → write a `lock_ins` row (kind=creator) capturing current Budget + Bling price + date; show "Locked in at $X on DATE" on the deck. Support re-lock keeping prior stamps.
**Acceptance:** pressing Lock In persists the currently displayed prices + timestamp and renders the badge; re-locking adds a new stamp and shows the latest plus a small history; values never change after capture.
**Depends on:** V-1, D-3

### L-2 — Lock In: visitor stamp — **M**
Any logged-in viewer presses Lock In on any deck → write a `lock_ins` row (kind=visitor) tied to that user, with deck link + date + price at that moment. Does not modify the deck.
**Acceptance:** a non-owner can Lock In a deck; it appears on their profile's "Locked In Decks" with link, date, and captured price; the deck itself is unchanged; a user can remove their own visitor stamp.
**Depends on:** V-1, F-5

### FK-1 — Fork (copy) with optional link-back — **M**
"Duplicate" creates a new deck owned by the copier with all cards/boards; a checkbox sets `parent_deck_id` + `show_lineage`. Linked decks show "forked from X" and parents show fork count.
**Acceptance:** duplicating copies the full list to a new editable deck owned by the copier; with link-back on, both decks display the relationship; with it off, no link is stored; counts are accurate.
**Depends on:** D-2

### P-1 — User profile page — **M**
Public profile: avatar, handle, joined date, and tabs for **Decks** and **Locked In Decks** (the latter from L-2, with date+price+link).
**Acceptance:** visiting `/users/{handle}` shows the user's public decks and their Locked In Decks; private decks hidden from others; owner sees their own private decks; Locked In list shows captured date + price per entry.
**Depends on:** L-2

### B-1 — Browse/search with price-threshold filter — **L**
Explore page listing public decks with filters: format, color, and **price threshold / max budget price**, plus **sort by price** (and recency/popularity). Deck cards show format, colors, dual price, and Lock In badge.
**Acceptance:** filtering by format + "max budget $15" returns only matching decks; sort-by-price works ascending/descending; pagination/infinite scroll loads more; the price filter + price sort (absent on Moxfield) function correctly against Budget price.
**Depends on:** D-3, V-1

---

## Suggested delivery order (critical path)

```
F-1 → F-2 → F-3 → F-4
F-2 → F-5
F-3 → F-6
[F-4,F-5,F-6] → D-1 → D-2 → D-3
D-3 → E-1 → (E-2..E-8)         [editor]
D-3 → V-1 → (V-2..V-5)         [deck view + money]
V-1 → L-1, L-2 ; D-2 → FK-1 ; L-2 → P-1 ; D-3+V-1 → B-1
```

Foundations (F-*) are strictly first. The editor (E-*) and deck view (V-*) can proceed in parallel once D-3 lands. Lock In, Fork, Profiles, and Browse close out the MVP.

## MVP "definition of done" coverage check

The roadmap's MVP DoD — build a $15 EDH deck, validate on cheapest printings, swap a bling printing and see both prices, publish, Lock In a dated price, get a working Buy-this-deck link, and have another user fork it and Lock In their copy — is covered by: D-1/D-2/D-3 (build + dual price), E-3 (validate threshold), E-5/E-4 (bling swap + dual display), D-1 (publish), L-1/L-2 (lock in), V-3 (buy), FK-1 (fork). ✅

## Deferred to later phases (not in this backlog)

Articles/CMS, comments/likes/follows, badges, playtest sandbox, EDHREC, collections/wishlist, packages, sell/rent links, affiliates beyond TCGPlayer, custom tags & mana-cost override, native-mobile polish.
