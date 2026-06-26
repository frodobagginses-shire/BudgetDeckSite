import Link from "next/link";
import { formatUsd, getTypeBucket, typeBucketRank } from "@/lib/format";
import type { Deck, DeckTotals, LockIn, PricedCard } from "@/lib/types";
import { LockInBadge } from "@/components/decks/lock-in-badge";
import { ExportMenu } from "@/components/decks/export-menu";
import { BuyDeckButton } from "@/components/decks/buy-deck-button";
import { BuyCardLink } from "@/components/decks/buy-card-link";
import { VisitorLockInButton } from "@/components/decks/visitor-lock-in-button";
import { ForkButton } from "@/components/decks/fork-button";
import {
  DeckLineage,
  type LineageParent,
} from "@/components/decks/deck-lineage";
import { ArticleBody } from "@/components/articles/article-body";
import { LikeButton } from "@/components/decks/like-button";
import { CardHover } from "@/components/cards/card-hover";
import { ColorPips } from "@/components/cards/color-pips";
import { DeckBanner } from "@/components/decks/deck-banner";

export function DeckReadOnly({
  deck,
  ownerHandle,
  cards,
  totals,
  lockIn,
  canLock,
  locked,
  parent,
  forkCount,
  likeCount,
  liked,
  deckIdentity,
  bannerImageUrl,
}: {
  deck: Deck;
  ownerHandle: string | null;
  cards: PricedCard[];
  totals: DeckTotals;
  lockIn: LockIn | null;
  canLock: boolean;
  locked: boolean;
  parent: LineageParent | null;
  forkCount: number;
  likeCount: number;
  liked: boolean;
  deckIdentity: string[];
  bannerImageUrl: string | null;
}) {
  const overBudget =
    deck.threshold_amount != null && totals.budget_price > deck.threshold_amount;

  // Group by type bucket.
  const buckets = new Map<string, PricedCard[]>();
  for (const c of cards) {
    const k = getTypeBucket(c.type_line);
    const arr = buckets.get(k);
    if (arr) arr.push(c);
    else buckets.set(k, [c]);
  }
  const groups = [...buckets.entries()].sort(
    (a, b) => typeBucketRank(a[0]) - typeBucketRank(b[0])
  );

  // Mana curve over non-land cards (0..7+).
  const curve = new Array(8).fill(0) as number[];
  for (const c of cards) {
    if ((c.type_line ?? "").includes("Land")) continue;
    const b = Math.min(7, Math.max(0, Math.floor(c.cmc ?? 0)));
    curve[b] += c.quantity;
  }
  const maxCurve = Math.max(1, ...curve);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <DeckBanner
        deckId={deck.id}
        imageUrl={bannerImageUrl}
        canEdit={false}
        choices={[]}
        currentBannerId={null}
      />
      <header className="flex flex-col gap-1">
        {ownerHandle && (
          <Link
            href={`/users/${ownerHandle}`}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            @{ownerHandle}
          </Link>
        )}
        <h1 className="text-3xl font-bold tracking-tight">{deck.name}</h1>
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm capitalize">
          <span>{deck.game_format}</span>
          {deck.game_format === "commander" && (
            <ColorPips identity={deckIdentity} />
          )}
          {deck.threshold_amount != null && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                overBudget
                  ? "bg-destructive/10 text-destructive"
                  : "bg-brand-50 text-brand-700"
              }`}
            >
              {overBudget
                ? `Over ${formatUsd(deck.threshold_amount)}`
                : `Under ${formatUsd(deck.threshold_amount)} ✓`}
            </span>
          )}
        </div>
        <DeckLineage parent={parent} forkCount={forkCount} />
      </header>

      {/* Price summary */}
      <div className="border-border bg-card flex flex-wrap items-center gap-x-8 gap-y-2 rounded-xl border p-4">
        <div>
          <div className="text-muted-foreground text-xs">Budget price</div>
          <div className="text-2xl font-bold">
            {formatUsd(totals.budget_price)}
          </div>
        </div>
        <div className="text-muted-foreground flex gap-6 text-sm">
          <span>Total {formatUsd(totals.total_price)}</span>
          <span>Your printings {formatUsd(totals.bling_price)}</span>
          <span>{totals.card_count} cards</span>
        </div>
        <div className="flex basis-full items-center gap-3 pt-1">
          {lockIn && <LockInBadge lockIn={lockIn} />}
          <LikeButton
            deckId={deck.id}
            liked={liked}
            count={likeCount}
            canLike={canLock}
          />
          {canLock && <VisitorLockInButton deckId={deck.id} locked={locked} />}
          {canLock && <ForkButton deckId={deck.id} />}
          <div className="ml-auto flex items-center gap-2">
            <BuyDeckButton
              cards={cards.map((c) => ({ name: c.name, quantity: c.quantity }))}
            />
            <ExportMenu
              cards={cards.map((c) => ({
                name: c.name,
                quantity: c.quantity,
                set_code: c.set_code,
                collector_number: c.collector_number,
              }))}
            />
          </div>
        </div>
      </div>

      {/* Mana curve */}
      <section>
        <div className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
          Mana curve
        </div>
        <div className="flex items-end gap-2">
          {curve.map((n, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="text-muted-foreground text-xs tabular-nums">
                {n || ""}
              </div>
              <div
                className="bg-brand-400 w-full rounded-t"
                style={{ height: `${(n / maxCurve) * 64 + 2}px` }}
              />
              <div className="text-muted-foreground text-xs">
                {i === 7 ? "7+" : i}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Card list */}
      <div className="flex flex-col gap-5">
        {groups.map(([bucket, list]) => {
          const subtotal = list.reduce((s, c) => s + (c.line_cheapest ?? 0), 0);
          const count = list.reduce((s, c) => s + c.quantity, 0);
          return (
            <section key={bucket}>
              <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
                <span>
                  {bucket} ({count})
                </span>
                <span>{formatUsd(subtotal)}</span>
              </div>
              <div className="divide-border divide-y">
                {list.map((c) => (
                  <div
                    key={c.scryfall_id}
                    className="flex items-center gap-3 py-1.5 text-sm"
                  >
                    <span className="text-muted-foreground w-6 text-right tabular-nums">
                      {c.quantity}
                    </span>
                    <span className="min-w-0 flex-1">
                      <CardHover name={c.name} className="text-left hover:underline" />
                    </span>
                    <span className="text-muted-foreground w-16 text-right tabular-nums">
                      {formatUsd(c.line_cheapest)}
                    </span>
                    <BuyCardLink name={c.name} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Primer / description */}
      {deck.description_md && (
        <section className="border-border border-t pt-4">
          <div className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
            Primer
          </div>
          <ArticleBody body={deck.description_md} />
        </section>
      )}
    </main>
  );
}
