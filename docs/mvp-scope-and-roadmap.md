# Budget Deck Website — MVP Scope & Roadmap

*Prepared June 25, 2026*
*Build approach: you direct; AI/contractors implement. This doc doubles as a spec to delegate from.*
*Companion doc: `moxfield-feature-teardown.md`*

---

## 1. Product thesis (the one-paragraph version)

A deck builder for budget Magic that does one thing Moxfield/Archidekt don't: it treats **price as a first-class constraint**. Every deck is built against a user-chosen **threshold** (e.g. $15 EDH, $20 Vintage), validated on the *cheapest available printing* of each card, and can be **Locked In** — a dated price stamp that proves "this deck really was $15 on this date." Discovery, the editor, and the content/articles all revolve around price. Monetization is **affiliate-first** (whole-deck and single-card buy links), in contrast to Moxfield's ad+Patreon model.

---

## 2. Recommended tech stack

Chosen for a delegated/AI-assisted build: popular, exceptionally well-documented (so any dev or AI tool knows it), few moving parts, and strong SEO for the articles engine.

| Layer | Recommendation | Why |
|---|---|---|
| App framework | **Next.js (React, TypeScript), App Router** | Server-rendered deck & article pages = good SEO and fast first paint; one codebase for UI + API. The default choice AI tooling handles best. |
| Styling/UI | **Tailwind CSS + shadcn/ui** | Fast to build, consistent, componentized; easy for delegated work to stay visually coherent. |
| Database | **PostgreSQL** (via **Supabase** or **Neon**) | Relational data (decks, cards, lock-ins, lineage) fits Postgres cleanly. Supabase bundles DB + auth + file storage, minimizing services to wire up. |
| Auth | **Supabase Auth** (or **Clerk**) with **Google sign-in only** | You never store credentials. Supabase Auth keeps it in-stack; Clerk is the easiest DX if you'd rather. |
| File storage | **Supabase Storage** (or Cloudflare R2) | Deck cover images, user avatars, article assets. |
| Hosting | **Vercel** (app) + **Supabase** (managed DB/auth) | Push-to-deploy, generous free tiers, scales with traffic. |
| Background jobs | **Vercel Cron** or **Supabase scheduled functions / pg_cron** | Nightly Scryfall + price sync. |
| Card data | **Scryfall API + bulk data**, cached into our Postgres | Free, comprehensive, industry standard. We don't hit Scryfall live per request — we sync nightly. |
| Card search | Postgres full-text first; **Meilisearch/Typesense** later | Postgres is enough for MVP; add a search engine when card-search volume/syntax demands it. |
| Articles/CMS | **MDX in-repo** for MVP, or **Sanity/Payload** later | Start by writing articles as MDX (fast, version-controlled, great SEO). Move to a CMS when non-devs need to publish. |
| Analytics | **Plausible** or **PostHog** | Track affiliate-link CTR and conversion funnels (privacy-friendly). |

*Single-vendor shortcut:* if you want the fewest accounts to manage, **Next.js on Vercel + Supabase (DB/Auth/Storage)** covers ~90% of the MVP with two services.

---

## 3. The three concepts that make us different (spec these carefully)

### 3.1 Formats and thresholds are SEPARATE fields

A deck has two independent attributes:

- **Game format** — the construction/legality ruleset: Commander/EDH, Vintage, Legacy, Modern, Pioneer, Standard, Pauper, or "Casual/None." Drives color-identity and legality checks (same as Moxfield).
- **Budget threshold** — an *optional* price cap: an amount + currency (e.g. $15 / $20 / $50 / custom / none).

A "**$20 Vintage**" deck is simply `format = Vintage` + `threshold = $20`. A "$15 EDH" deck is `format = Commander` + `threshold = $15`. This separation means any format can carry any cap — exactly your "price cap instead of rarity cap" idea, generalized. Threshold is **per deck** and freely set by the builder; we ship presets ($15/$20/$50) plus a custom field.

**Validation:** a deck is "under threshold" when its **Budget price** (§3.2) ≤ threshold. We surface this like a legality check — a green "Under $15" / red "Over by $2.40" badge.

### 3.2 Two price metrics (Budget vs. Bling)

Every deck tracks **two totals at once**:

| Metric | Definition | Used for |
|---|---|---|
| **Budget price** (a.k.a. Lock In price) | Sum of the **cheapest available printing** of each card × quantity | Threshold validation; the headline "this is a $15 deck" number; what Lock In stamps by default |
| **Bling / Actual price** | Sum of the **specific printing the user chose** for each card × quantity | Shows the real cost if they run their preferred printings (e.g. a Secret Lair card) |

Data implication: each card in a deck stores the **chosen printing** (a specific Scryfall printing id). The **Bling price** sums those chosen printings. The **Budget price** is derived by mapping each card to its `oracle_id` and looking up the **minimum-price printing** across all printings of that card. Both numbers are shown side by side in the editor and on the deck page, e.g.:

> **Budget: $14.62** ✓ under $15  ·  **Your printings: $28.40**

This lets a user validate at threshold on cheapest printings, then "bling out" with favorite printings without losing the proof that the deck *can* be built at budget.

### 3.3 Lock In = snapshot-on-press (no historical price DB needed)

Per your clarification, Lock In simply **captures the price currently displayed at the moment the button is pressed**. We never need to reconstruct historical prices — we persist a value on demand.

Two flavors:

- **Creator stamp** — the deck owner presses Lock In on their own deck. We write a stamp onto the deck: lock date + Budget price (and Bling price) at that moment. Shown publicly: "Locked in at **$14.62** (budget) on **Jun 25, 2026**." Optionally support re-locking (keep history of stamps, show the latest + a small "price history" list of past lock points).
- **Visitor stamp** — any logged-in user presses Lock In on any deck they're viewing. We create a record on **their** profile (under "Locked In Decks"): a link to the deck + the date + the price at that moment. It does **not** modify the deck.

Implementation: a `lock_in` row copies the already-computed price values. The only live dependency is that we display a current price (from our nightly-synced Scryfall data) — which we're doing anyway. **This removes the biggest infra item from the earlier teardown.** (We may still keep our own daily price snapshots later for charts/analytics, but it's no longer required for Lock In.)

### 3.4 Fork lineage (copy with optional link-back)

Copying a deck creates a new deck owned by the copier. The copier chooses whether to **link back to the parent** (`parent_deck_id` + `show_lineage` flag). When linked, both decks show the relationship ("forked from X" / "N forks"). This is our GitHub-for-decks angle and a genuine second differentiator — treat it as first-class, not a checkbox.

---

## 4. Core data model (MVP sketch)

```
User            id, handle, display_name, avatar_url, joined_at            (from auth)
Card            scryfall_id (PK), oracle_id, name, set_code, collector_no,
                type_line, cmc, color_identity[], rarity, image_uris,
                price_usd, price_usd_foil, legalities{}, updated_at        (synced nightly)
CardCheapest    oracle_id (PK), cheapest_scryfall_id, cheapest_price_usd   (derived nightly)
Deck            id, owner_id, name, game_format, threshold_amount,
                threshold_currency, visibility(public/unlisted/private),
                description_md, parent_deck_id?, show_lineage,
                created_at, updated_at
DeckCard        deck_id, scryfall_id (chosen printing), quantity,
                board(main/side/considering/maybe), tags[]
LockIn          id, deck_id, user_id, locked_at, budget_price,
                bling_price, currency, kind(creator/visitor)
Article         id, slug, title, body_md, hero_card_oracle_id?,
                published_at, author_id                                   (Phase 2)
Badge / UserBadge ...                                                     (Phase 3)
```

Derived per deck on render: **Budget price** (Σ qty × CardCheapest.cheapest_price_usd by oracle_id) and **Bling price** (Σ qty × Card.price_usd for chosen printing), plus curve/type counts.

---

## 5. MVP scope (Phase 1 — the launchable core)

**In:**

1. **Accounts** — Google sign-in; public/unlisted/private decks.
2. **Card database** — nightly Scryfall sync; cheapest-printing computation; card images.
3. **Deck editor** — card search w/ price-bearing autocomplete and color-identity/format enforcement; add/remove/quantity (Alt+1/2 etc.); boards (main/side/considering); group & sort incl. by price; text + image views; **paste-import** a list; switch printing (incl. "use cheapest"); per-card and per-type prices; **dual Budget/Bling totals**; **threshold selector + under/over indicator**.
4. **Deck view (public)** — mana curve + type counts; **dual price display**; **Lock In badge**; export (Moxfield/Arena/MTGO/text); primer (Markdown).
5. **Monetization** — **TCGPlayer mass-entry "Buy this deck"** (affiliate) + per-card buy links.
6. **Lock In** — creator stamp + visitor profile stamp (§3.3).
7. **Fork** — copy with optional link-back (§3.4).
8. **Profiles** — basic profile + **"Locked In Decks"** section.
9. **Browse/search** — by format, color, popularity, and **price threshold** (our signature filter) + **sort by price** (both absent on Moxfield).

**Explicitly OUT of MVP** (deferred to later phases): articles/CMS, comments/likes/follows, badges, playtest sandbox, EDHREC integration, collections/wishlist, packages, sell/rent links, affiliates beyond TCGPlayer, mobile-native polish.

**MVP definition of done:** a logged-in user can build a Commander deck against a $15 cap, see it validated on cheapest printings, swap in a bling printing and see both prices, publish it, Lock In a dated price, get a working "Buy this deck" affiliate link, and have another user fork it and Lock In their own copy.

---

## 6. Phased roadmap

### Phase 0 — Foundations
Stand up the stack (Next.js/Vercel + Supabase). Build the **Scryfall ingestion + nightly price sync** and the **cheapest-printing** job. Define the data model and auth (Google). *Exit:* cards searchable in our DB with current + cheapest prices; users can sign in.

### Phase 1 — MVP builder (the launch)
Everything in §5. Sequence within the phase: editor → deck view → dual-price + threshold → buy links → Lock In → fork → profiles → browse filter. *Exit:* the MVP definition of done above. **Launch here.**

### Phase 2 — Content & social (the monetization engine)
**Articles** (single-card and budget-build deep dives) with heavy, reusable affiliate-link components and embedded decks. Likes/comments/follows. Richer discovery (trending, tags). This is where traffic → affiliate revenue compounds, so prioritize it right after launch.

### Phase 3 — Affiliate breadth & community
Add Card Kingdom + Mana Pool (and others) behind a seller-abstraction layer; optional sell/rent links. **Badges** (popular decks, # posted, etc.). Packages. Folders.

### Phase 4 — Power features & polish
Playtest/sample-hand sandbox, EDHREC integration, collections/wishlist, mobile/responsive polish, search engine upgrade (Meilisearch/Typesense).

---

## 7. Affiliate integration plan

- **Anchor:** TCGPlayer via the **Impact** program (3.5%, last-click, 48h window, whole-cart credit). Mass Entry accepts affiliate codes → whole-deck buy works. Build a `BuyLink` component that takes a card list + seller and emits the correct affiliate URL.
- **Abstraction:** model sellers as plug-ins (`tcgplayer`, later `cardkingdom`, `manapool`, …) so Phase 3 additions don't touch the editor.
- **Two CTAs everywhere:** "Buy this deck" (mass entry) and per-card buy. Push hardest inside articles.
- **Measure:** instrument affiliate-link clicks from day one (Plausible/PostHog) so you can see which decks/articles convert.

---

## 8. Risks & open questions

- **Card data/pricing terms.** Confirm compliance with Scryfall's API guidelines and pricing-data display rules, and WotC's **Fan Content Policy** for card images/names. (Low effort, do before launch.)
- **Price freshness vs. Lock In.** Lock In stamps the *displayed* price; since prices sync nightly, a stamp reflects the last sync, not the literal minute. Decide whether that's fine (almost certainly yes) or whether high-value decks warrant on-demand refresh.
- **"Cheapest printing" edge cases.** Exclude non-paper (digital), exclude $0/again-unavailable listings, and decide whether foils/promos count toward "cheapest." Define the rule explicitly.
- **Threshold currency.** MVP can be USD-only (matches TCGPlayer); design the field to allow EUR later.
- **Re-lock behavior.** Decide if creators can re-Lock In (keep a small history) or if a stamp is permanent until manually updated.
- **Articles timing.** They're a core differentiator but depend on affiliate-link infra; Phase 2 fast-follow is the recommendation, but if content is your main traffic bet you could pull a lightweight MDX article system into Phase 1.

---

## 9. What to decide next

1. Confirm the recommended stack (or name a preference) so specs can be written against it.
2. Confirm MVP boundary in §5 — anything to pull in or push out?
3. Decide the "cheapest printing" rule (foils/promos in or out).
4. Decide whether a minimal articles system rides along in Phase 1 or waits for Phase 2.

Once those are set, the natural next deliverable is a **Phase 1 build backlog** — the editor, deck view, Lock In, etc., broken into delegate-ready tickets with acceptance criteria.
