-- 0019: format explainer articles (linked from the homepage) plus a fleshed-out
-- "Underrated for the Price" piece. Upsert by slug so re-applying is safe and so
-- it overwrites the earlier Unexplained Absence stub from 0008.

insert into public.articles (slug, title, excerpt, body_md, featured_cards, published_at)
values
(
  '15-commander',
  $ex$The $15 Commander Format$ex$,
  $ex$A deckbuilder's dream that trades expensive staples for heavy synergy and creative engine-building.$ex$,
  $md$# The $15 Commander Format

The $15 Commander format is a deckbuilder's dream that trades expensive staples for heavy synergy and creative engine-building. The rules are simple, but they create a deeply rewarding and fair playing field that highlights your skills as a brewer.

## The rules

**The Price Limit.** The total cost of the deck (excluding basic lands) must be $15 or less, based on the TCGplayer Market price. Deckbuilding sites like this one, Moxfield, and Archidekt will tabulate it automatically for you.

**The "Lock-In" Rule.** Once you build and verify a decklist at $15 or under, it is permanently legal. Even if the market price of your cards spikes later, your deck stays legal to play. However, if you open the decklist back up to make updates, upgrades, or revisions, the *new* list must re-verify at the $15 limit.

**Staples Are Out, Synergy Is In.** You cannot afford ubiquitous staples like [[Sol Ring]], [[Force of Will]], or [[Deflecting Swat]]. This limitation restricts the raw power level of the format, but it forces you to dive into the massive pool of sub-$0.50 cards to find underplayed, hidden gems that fit your exact strategy.

**Power Level and Pacing.** In practical terms, these decks sit somewhere between Bracket 2 and Bracket 3. The raw power of the individual cards is closer to a 2, but the high level of optimization and tuning pushes the deck's synergy closer to a 3. They can comfortably hang with most preconstructed decks. Because there is no fast mana available, games tend to be slower out of the gate, usually starting to heat up around turns 3 or 4.

## Why build to $15?

The cap rewards card evaluation over budget. Everyone at the table is working from the same pool of cheap cards, so your advantage comes from finding the synergies other players missed, not from owning the most expensive staples.

When you are ready, start a deck, set your cap to $15, and build. We validate every card on its cheapest printing and let you Lock In a dated price you can prove later.$md$,
  '{}',
  now()
),
(
  '30-value-vintage',
  $ex$$30 Value Vintage$ex$,
  $ex$Powerful, interactive Vintage on a $30 budget: the Vintage banlist without the Vintage price tag.$ex$,
  $md$# $30 Value Vintage

Value Vintage ("$30 Budget Vintage," or just VV) is a community-built format out of Cincinnati, Ohio. The idea is to capture the powerful, interactive feel of Vintage without the four-figure buy-in of Legacy or Modern.

## How it works

VV uses the **Vintage Banned and Restricted list**, but your deck and sideboard together cannot cost more than **$30**. Price is set by the cheapest English, tournament-legal printing at TCGplayer Market. Basic lands do not count toward the budget, though Snow basics and Wastes do.

That single constraint reshapes the format. The busted enablers are still legal, but most of them are restricted to a single copy, and the genuinely expensive cards price themselves out. What remains is a deep, interactive metagame where almost every archetype from Magic's history has some playable build.

## The restricted list does the balancing

Because VV inherits Vintage's restricted list, format-warping cards like [[Brainstorm]], [[Sol Ring]], [[Necropotence]], and [[Demonic Consultation]] are limited to one copy each. You still get to play the iconic cards, just not four of them, which keeps games fast and skill-testing without letting any single engine take over.

## See it in action

Tolarian Community College did a thorough breakdown of the format:

https://www.youtube.com/watch?v=Bq22oqVRzHI&t=1s

## Where to start

The full deckbuilding rules, example metagame lists, and a staples list live on the format's home site, [vvmtg.com](https://vvmtg.com). Build to $30 here, validate on the cheapest printing, and Lock In your list.

*Value Vintage is an independent community format. This write-up summarizes their rules and credits the VV team, and is not affiliated with that community or with Wizards of the Coast.*$md$,
  '{}',
  now()
),
(
  '50-modern',
  $ex$$50 Modern$ex$,
  $ex$Modern's card pool, capped at $50. A price-first way into the format, inspired by Value Vintage.$ex$,
  $md$# $50 Modern

$50 Modern applies the idea behind Value Vintage to Modern: keep the format's banlist, cap the budget, and let card evaluation do the rest.

## How it works

Build a deck and sideboard that together cost **$50 or less**, priced on the cheapest tournament-legal printing. Use Modern's banned list as your legality baseline. Basic lands are free, and everything else counts.

Fifty dollars is tight for Modern, and that is the point. The format's defining decks lean on expensive manabases and premium interaction, so the cap steers you toward the large middle tier of Modern-legal cards that rarely see play only because something pricier does the job a little better. Those are the cards this format is built to showcase.

## What changes at $50

The chase rares and fast mana fall away, and games slow down a step. In their place you get focused, linear decks: aggressive creature builds, value midrange, and the occasional combo that does not need a $400 manabase to function.

## Build one

This is a price-capped idea in the spirit of [Value Vintage](https://vvmtg.com), not an official, sanctioned format, so treat the cap as the rule and have fun with it. Set your budget to $50, validate on the cheapest printing, and Lock In a dated list you can prove later.$md$,
  '{}',
  now()
),
(
  'underrated-for-the-price-unexplained-absence',
  $ex$Underrated for the Price: Unexplained Absence$ex$,
  $ex$A cheap white instant from Karlov Manor that punches above its price in any multiplayer game.$ex$,
  $md$# Underrated for the Price: Unexplained Absence

Every set hides a card that competitive players pass over and budget brewers should be grabbing. From Murders at Karlov Manor, [[Unexplained Absence]] is one of those cards: a four-mana white instant that sells for pocket change and does real work in any multiplayer pod.

![Unexplained Absence](https://api.scryfall.com/cards/named?format=image&version=art_crop&exact=Unexplained%20Absence)

## One instant, the whole table

The text reads: for {3}{W} at instant speed, exile up to one nonland permanent from each player. Note that it says each *player*, not each opponent, and that detail is what makes the card so flexible. In a four-player Commander game you can clear a threat from every opponent at once, or pick off a single problem permanent, all at the end of someone's turn or in response to a combo.

Exile matters too. There is no "return it" or "sacrifice" clause for opponents to value off of, so the permanents are simply gone. For a card that costs less than a booster pack, answering one permanent per player is a rate that premium removal rarely matches.

## The defensive trick most people miss

Because it can target your own permanents at instant speed, [[Unexplained Absence]] doubles as protection for your commander. Say an opponent tries to neutralize your general with an aura like [[Darksteel Mutation]] or [[Kenrith's Transformation]]. In response, you exile your own commander with Unexplained Absence and send it to the command zone. The aura loses its target and fizzles, and you recast your commander whenever you like. You spend four mana to dodge a lock that would otherwise have shut you out of the game.

## The "catch" barely bites

The downside is the cloak clause: each player whose permanent you exiled cloaks the top card of their library, which makes a face-down 2/2 with ward {2}. So you do hand opponents a small body. In practice, trading a vanilla 2/2 for their best permanent is a deal you will take almost every time, and when you exile your own permanent defensively, you are the one who gets the free creature.

## Where it shines

In a [$15 Commander](/articles/15-commander) build, flexible removal that scales with the number of opponents is exactly what you want. [[Unexplained Absence]] slots into any white deck as instant-speed insurance, and it pairs well with another budget all-star, [[Dismantling Wave]], for a removal suite that costs less than a single foil [[Swords to Plowshares]].

![Dismantling Wave](https://api.scryfall.com/cards/named?format=image&version=art_crop&exact=Dismantling%20Wave)

It will not win the game on its own, since it is an answer rather than a threat, but answers are exactly what budget decks tend to skimp on. At this price, there is no reason to.

## The verdict

[[Unexplained Absence]] is a textbook "underrated for the price" pickup: premium flexibility, multiplayer reach, a defensive mode that protects your commander, and a downside that rarely matters, all for the cost of a common.$md$,
  array['Unexplained Absence', 'Dismantling Wave', 'Swords to Plowshares', 'Darksteel Mutation', 'Kenrith''s Transformation'],
  now()
)
on conflict (slug) do update set
  title          = excluded.title,
  excerpt        = excluded.excerpt,
  body_md        = excluded.body_md,
  featured_cards = excluded.featured_cards,
  published_at   = coalesce(public.articles.published_at, excluded.published_at);
