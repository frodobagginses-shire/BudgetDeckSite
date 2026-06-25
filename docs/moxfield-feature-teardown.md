# Moxfield / Archidekt Feature Teardown

*For: Budget Deck Website ("$15 deck" builder)*
*Prepared June 25, 2026 — updated same day with a live walkthrough of moxfield.com*

> **Live walkthrough done.** Sections below are now confirmed against the live site (June 25, 2026). The biggest confirmations: (1) whole-deck affiliate purchase works across **six** sellers including Mana Pool; (2) Moxfield has **no price filter or price sort** in browse — a clear opening for us; (3) Moxfield monetizes itself via **ads + Patreon**, not affiliate links, so the affiliate-primary model is uncontested by the incumbent. Full live detail in the "Live walkthrough findings" section near the end.

## How to read this

This catalogs the features Moxfield (and Archidekt) offer that we'd need to match or consciously skip, organized by what to build first. Each feature is tagged:

- **MUST** — table stakes; a deck site without it feels broken.
- **SHOULD** — strong expectation from MTG users, but can come after launch.
- **LATER** — nice-to-have, polish, or scale features.
- **SKIP/DEFER** — exists on Moxfield but not worth our effort early.

Each is also flagged as **[confirmed]** (verified against Moxfield's official features wiki/shortcuts docs) or **[inferred]** (from product knowledge; verify on the live site). A live click-through is still worth doing to capture exact tooltip copy, micro-interactions, and 2024–2026 additions the public docs don't list.

A separate column notes how each interacts with **our** differentiators: Lock In (price snapshot), Fork lineage (copy-with-link-back), Threshold (configurable price cap), and Articles (affiliate content).

---

## 1. Deck Editor (the core surface)

This is where most of the engineering goes and where we have to be at least as good as Moxfield, because builders are picky.

| Feature | Priority | Status | Notes / our angle |
|---|---|---|---|
| Card search with autocomplete | MUST | confirmed | Moxfield uses **Scryfall search syntax** (e.g. `t:creature cmc<=2 c:u`). We should adopt the same syntax — users already know it, and it's powered by the same Scryfall data we'll use. |
| Format + color-identity enforcement | MUST | confirmed | Search auto-filters illegal/out-of-identity cards so you can't add them. For us, also surface a **live price total vs. threshold** in this same spot. |
| Add / remove / set quantity | MUST | confirmed | Keyboard: **Alt+1** add a copy, **Alt+2** remove. Fast iteration is the whole game. |
| Mainboard / Sideboard / Maybeboard | MUST | confirmed | Plus a **"Considering"** board (Alt+4) and move-to-sideboard (Alt+3). Our "rebalance to threshold" workflow leans on a Considering/Maybe area — cards you cut to hit price. |
| Group by Type / Color / CMC / Rarity / Custom Tag | MUST | confirmed | Standard grouping. We should add **group/sort by price** prominently since budget is our identity. |
| Sort by name / mana cost / price | MUST | confirmed | Price sort is the budget builder's most-used control. |
| Text view vs. Image (visual) view | MUST | confirmed | Toggle, with optional mana cost + price shown inline in text view. |
| Custom tags / categories (global + deck-specific) | SHOULD | confirmed | Drag-and-drop into tags in visual view; bulk-edit tags across many cards. Powerful but not launch-critical. |
| Bulk edit / paste-import a list | MUST | confirmed | Import from file, URL (Archidekt/TappedOut), or pasted Arena/MTGO list. Critical for migration — users won't rebuild decks by hand. Make **"paste a list, see the price instantly"** a hero feature. |
| Switch card printing (and see per-printing price) | SHOULD | confirmed | Big for us: cheapest printing often makes/breaks a budget deck. Consider a **"swap to cheapest printing"** one-click that helps hit threshold. |
| Change history / version tracking | SHOULD | confirmed | Every change tracked on a History page. Overlaps with our **Lock In** concept — Lock In is essentially a *named, priced* history snapshot. Build history first; Lock In is a special pin on top of it. |
| Token display | LATER | confirmed | Shows tokens the deck needs. Polish. |
| Keyboard shortcuts generally | SHOULD | confirmed (live) | Alt+1 add one, Alt+2 remove, Alt+3 to sideboard, Alt+4 to considering, Shift+T add last tag, **/** focus card search, Shift+Enter quick-add first search result. Power users expect these. |
| Drag-and-drop card movement | SHOULD | confirmed | In visual view and playtester. |
| Per-card action menu | MUST | confirmed (live) | Each card row has an action chevron: Use Foil Version, Switch Printing, Add One/Add More/Remove, Move to Sideboard/Considering, Add to Another Deck, Add to Collection/Wish List, Change Tags, Change Mana Cost, View Details, Copy Card Name, Set as Deck Image, Set as Preferred Printing, Buy on TCGplayer/Card Kingdom. Rich, but we can launch with a subset. |
| Per-group + per-card pricing inline | MUST | confirmed (live) | Editor shows price per card and a price subtotal per type group (e.g. "Creatures (29) – $6.82"). **For us this is central** — make the running total-vs-threshold and per-card prices the visual anchor of editing. |

---

## 2. Deck View Page (public-facing, where monetization happens)

This is the page our affiliate revenue depends on, so it deserves disproportionate attention.

| Feature | Priority | Status | Notes / our angle |
|---|---|---|---|
| Stats: type counts, mana curve, avg CMC | MUST | confirmed | Moxfield goes deep: curve, spells vs. permanents, curve per color, avg CMC with/without lands, lands-in-opening-hand, % on-curve. We need the basics (curve, type counts, total price); the rest is SHOULD. |
| Total deck price (multi-source) | MUST | confirmed | Moxfield shows USD / EUR / tix, normal + foil, from TCGPlayer, CardMarket, CardHoarder. **We anchor on TCGPlayer USD** (our affiliate). |
| **Lock In price + date** (OUR FEATURE) | MUST | n/a | Not a Moxfield feature. A timestamped snapshot of the deck's total at lock time, shown as a badge: "Locked in at $14.62 on Jun 25, 2026." Requires us to store our own daily price history (Scryfall's API doesn't give reliable history). |
| **Buy whole deck (mass entry)** | MUST | confirmed (live) | Moxfield's "Buy Deck" opens a modal with **6 affiliates**: Card Kingdom, TCGplayer, StarCityGames, CoolStuffInc, **Mana Pool**, Cardhoarder — plus options "include connected tokens," "include set codes," "don't buy cards from my collection," "use any printing to match collection," then **"Buy now for $X"** for the whole deck. This is exactly our primary CTA. Whole-deck affiliate purchase is proven, and Mana Pool is already a participant. |
| Buy single card (affiliate) | MUST | confirmed | Per-card affiliate link as fallback/secondary, esp. inside articles. |
| Sell / Rent deck (extra affiliate angles) | LATER | confirmed (live) | More menu offers "Sell Deck @ Card Kingdom," "Sell Deck @ Card Conduit," "Rent Deck @ Cardhoarder (MTGO)." Additional affiliate revenue streams we could add later. |
| Compare two decks | SHOULD | confirmed (live) | More > Compare. **Directly useful for our rebalance workflow** — diff the original vs. your trimmed-to-threshold version. |
| Export (Arena / MTGO / text / file) | MUST | confirmed (live) | Export modal: Copy for Moxfield / Arena / MTGO / Plain Text, Download for MTGO, and per-format illegal-card detection ("Found 31 illegal cards for Arena"). |
| Primer / deck description (Markdown) | SHOULD | confirmed | Full Markdown editor, syntax highlighting, split preview, auto-generated table of contents. Great for our budget "how this deck works on $15" writeups. |
| Likes / comments / share / views | SHOULD | confirmed | Social proof. Comments can be toggled off per deck. View counts feed our badge system later. |
| Sample hand / playtest sandbox | LATER | confirmed | Full game sandbox with hotkeys, life/energy/poison, counters, dice, tokens. Big build — DEFER. Sample-hand (draw 7) is cheap and worth doing earlier. |
| EDHREC integration | LATER | confirmed | Moxfield pipes Commander data to EDHREC and shows recommendations inline. Partnership play, not launch. |
| Legality check | SHOULD | confirmed | Shows legal/not and where it failed; Highlander points. We add **"under/over threshold"** as our own "legality"-style check. |

---

## 3. Browse / Search / Discovery

| Feature | Priority | Status | Notes / our angle |
|---|---|---|---|
| Browse public decks with filters | MUST | confirmed | Live filters: Deck Name, Format, Commander, Partner, Theme, Card in Board (+ board selector), Companion, **Commander Bracket** (power-level), Author(s). **There is NO price/budget filter** — our biggest discovery-side opening: ship a price-threshold filter ("show me $15 Commander decks"). |
| Deck search | MUST | confirmed | Free-text search box plus the filter panel above. Tabs: All Decks / Your Decks / People You Follow / Decks You Liked. |
| Sort options | MUST | confirmed | Live sort: Color, Format, Commander Bracket, Recently Updated, Recently Created, Most Views, Most Likes, Most Comments + asc/desc. **No sort-by-price** — add it. |
| Folders / bookmarks | SHOULD | confirmed | Profile has a folder selector ("All Decks") and a list/binder view toggle. |
| Trending / popular feeds | SHOULD | confirmed | Driven by Most Views/Likes sort. Feeds the article funnel. |
| Following feed | LATER | confirmed | Feed of new decks from users you follow. |

---

## 4. Accounts & Profiles

| Feature | Priority | Status | Notes / our angle |
|---|---|---|---|
| Sign-in (Google) | MUST | n/a | Use an auth provider (Clerk/Auth0/Supabase) so we never store credentials. Google-only at launch is fine. |
| Private / public / unlisted decks | MUST | confirmed | Three visibility levels. |
| Duplicate/copy anyone's deck | MUST | confirmed | Moxfield calls it "duplicate to begin brewing." **This is our Fork lineage feature** — extend it with optional link-back to parent (deck genealogy, GitHub-style). Treat as first-class, not a checkbox. |
| User profile page | SHOULD | confirmed | Live: avatar + banner, Follow button, share, username/@handle, Followers / Following counts, Joined date; tabs **Decks** and **Packages**; folder selector, search, filters, sort, list/binder toggle. **Add our "Locked In Decks" tab** here alongside Decks, showing date + price per deck. |
| Packages (reusable card groups) | LATER | confirmed | Profile "Packages" tab — saved reusable card bundles users drop into decks. Nice power-user feature; defer. |
| Notifications (likes/comments/follows) | SHOULD | confirmed | |
| **Badges** (popular decks, # posted, etc.) | LATER | n/a | Our feature; explicitly deferred per your plan. Design profile data model now so badges can read from it later. |
| Collection / binder tracking | SKIP/DEFER | confirmed | Moxfield tracks owned cards. Out of scope for a budget-deck site early. |

---

## 5. Data & Infrastructure (not user-facing, but load-bearing)

| Concern | Priority | Notes |
|---|---|---|
| Card database | MUST | **Scryfall API** + bulk data (free, industry standard). Cache locally; refresh daily. |
| Card images | MUST | From Scryfall. Confirm usage stays within **WotC Fan Content Policy**. |
| Pricing — current | MUST | Scryfall gives daily aggregate prices. Good enough for display. |
| Pricing — **history (for Lock In)** | MUST | Scryfall does **not** give reliable history. We snapshot prices daily into our own store. This is the backbone of Lock In and our biggest non-obvious infra task. |
| Affiliate integration | MUST | TCGPlayer via **Impact** (3.5%, last-click, 48h window, cart-wide credit, mass entry supports affiliate codes). Design a seller-abstraction layer so Card Kingdom / Mana Pool slot in later. |
| Import parsers | MUST | Arena, MTGO, Archidekt, TappedOut formats. |

---

## Recommended build order (MVP first)

1. **Foundation:** Scryfall ingestion + daily price snapshot job; auth (Google).
2. **Editor:** search (Scryfall syntax), add/remove, quantities, boards, group/sort (esp. by price), text+image views, paste-import, live price total vs. threshold.
3. **Deck view:** curve + type counts + total price, export, primer.
4. **Monetization:** TCGPlayer mass-entry "Buy this deck" + single-card links.
5. **Our differentiators:** Lock In (price snapshot badge + profile section), Fork-with-link-back, configurable threshold.
6. **Discovery:** browse/search with price-threshold filter.
7. **Social/articles:** likes/comments, article system with heavy affiliate placement.
8. **Later:** badges, playtest sandbox, EDHREC, collections.

## Live walkthrough findings (confirmed June 25, 2026)

A click-through of moxfield.com confirmed the above and surfaced detail the public docs missed.

**Explore / browse page.** Tabs: All Decks / Your Decks / People You Follow / Decks You Liked. Search box + Filters + Sort. Deck cards show format, color-identity pips, comment/like/view counts, author, last-updated, and a "New" badge. Filter panel fields: Deck Name, Format, Commander, Partner, Theme, Card in Board (with board selector), Companion, Commander Bracket, Author(s), with Save Filters. Sort: Color, Format, Commander Bracket, Recently Updated, Recently Created, Most Views, Most Likes, Most Comments + asc/desc. **No price filter and no price sort anywhere** — the clearest product gap for a budget-focused competitor.

**Deck view page.** Header: author, deck name, format + "Bracket Info" badges, comment/like/view counts, share, last-updated, Report Deck. Action bar: Playtest, Buy Deck, Download, More, Highlighter; plus Disable Collection, Enable Tags, View Options. Sticky bottom bar: main/sideboard counts, Commander, Bracket Info, two price figures (market and a lower figure), and per-type count icons.

**Buy Deck modal.** Six affiliates (Card Kingdom, TCGplayer, StarCityGames, CoolStuffInc, Mana Pool, Cardhoarder); purchase options (include connected tokens; include set codes); collection options (don't buy cards I own; use any printing to match collection); single "Buy now for $X" whole-deck button.

**More menu.** Export, Duplicate, Compare, View History, Get Playtest Cards, Get Deck Registration, Sell Deck @ Card Kingdom, Sell Deck @ Card Conduit, Rent Deck @ Cardhoarder, Add to Collection, Add to Wish List.

**View Options (per-deck, overrides account defaults).** View styles: Text, Condensed Text, Visual Grid, Visual Stacks, Visual Stacks (Split), Visual Spoiler. Group By: Type, SubType, Type & Tag, Rarity, Color, Color Identity, Mana Value, Set, Artist, No Grouping. Sort By: Name, Mana Value, Price, Rarity. Include extra data: Mana Cost, Price, Set Symbol.

**Profile page.** Avatar + banner, Follow, share, 3-dot menu, username/@handle, Followers / Following counts, Joined date. Tabs: Decks and Packages. Folder selector, search, filters, sort, list/binder view toggle.

**Moxfield's own monetization.** Display ads throughout + a Patreon "support us to remove ads" prompt. Notably, Moxfield does **not** lead with affiliate links — our affiliate-primary, ad-light model is differentiated and uncontested by the incumbent.

**Editor (walked live on an owned deck — "$15 Omnath Landfall").** Editing happens inline on the deck page for the owner (no separate edit URL). Editable header: deck-type/Bracket/Primer badges (with "+" to add), "Change deck description," "Change card image." Action bar adds Primer, **Bulk Edit**, a settings gear, a quick-tools (lightning) icon, and the Highlighter. Card search box ("Find and add cards to main deck...") with Advanced Search / EDHRecs / Tips links; autocomplete shows **inline prices** and supports Shift+Enter to quick-add the top result, with color-identity/format enforced. Card list is grouped by type with **per-group price subtotals** and **per-card prices**; each row has an info icon and the per-card action menu described above. The selected-card preview panel shows normal + foil prices and **per-card buy buttons for TCGplayer, Card Kingdom, and Mana Pool**, plus Add to Wish List and a "Change price" link.

**Real-world proof point for Lock In.** This deck is titled "$15 Omnath Landfall" but the live editor total reads **$20.49** — a ~37% drift with no record of the original price. This is exactly the problem our Lock In snapshot solves, observed in the wild on your own deck.

**Remaining gaps.** Only mobile/responsive behavior and exact tooltip microcopy remain uncaptured; everything material (browse, deck view, buy/export, editor, profile) is now confirmed live.

---

### Sources
- Live walkthrough of [moxfield.com](https://moxfield.com/decks/public) — Explore, deck view, Buy/Export/More menus, View Options, profile (June 25, 2026)
- [Moxfield Features wiki](https://github.com/moxfield/moxfield-public/wiki/Features)
- [Moxfield keyboard shortcuts](https://moxfield.com/help/shortcuts)
- [TCGplayer Affiliate Program docs](https://docs.tcgplayer.com/docs/tcgplayer-affiliate-program)
- [TCGplayer Mass Entry](https://www.tcgplayer.com/massentry)
