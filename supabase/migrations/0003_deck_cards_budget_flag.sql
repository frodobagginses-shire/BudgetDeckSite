-- 0003 — per-card "counts toward budget" flag
-- --------------------------------------------------------------------------
-- Each deck_card carries a boolean for whether it counts toward the deck's
-- Budget price. Defaults to TRUE for every card. It gets set to FALSE either:
--   • automatically, by a format rule chosen at build time
--     (e.g. "$15, basics don't count" → basic lands flagged false), or
--   • manually, for house rules (e.g. "3 free proxies").
--
-- This unifies format rules and house rules under one mechanism and lets the
-- app show two transparent figures:
--   • Total Price            = sum of every card (cheapest printing)
--   • Budget Price           = sum of cards where counts_toward_budget = true
-- The difference is what's excluded (basics, proxies, etc.), shown as
-- "Total excluding <reason>". Threshold validation (D-3 / E-3) uses Budget Price.
--
-- Basic lands are identifiable by the "Basic" supertype in cards.type_line
-- (e.g. 'Basic Land — Forest', incl. Wastes and Snow-Covered basics).

alter table public.deck_cards
  add column counts_toward_budget boolean not null default true;
