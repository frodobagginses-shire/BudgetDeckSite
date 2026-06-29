import Link from "next/link";
import { formatUsd } from "@/lib/format";
import type { Deck, DeckTotals, LockIn, PricedCard } from "@/lib/types";
import { LockInBadge } from "@/components/decks/lock-in-badge";
import { ExportMenu } from "@/components/decks/export-menu";
import { BuyDeckButton } from "@/components/decks/buy-deck-button";
import { VisitorLockInButton } from "@/components/decks/visitor-lock-in-button";
import { ForkButton } from "@/components/decks/fork-button";
import {
  DeckLineage,
  type LineageParent,
} from "@/components/decks/deck-lineage";
import { ArticleBody } from "@/components/articles/article-body";
import { LikeButton } from "@/components/decks/like-button";
import { ViewCount } from "@/components/decks/view-count";
import { ColorPips } from "@/components/cards/color-pips";
import { DeckBanner } from "@/components/decks/deck-banner";
import { DeckCardList } from "@/components/decks/deck-card-list";
import {
  PreviewProvider,
  DeckPreviewPane,
} from "@/components/decks/deck-preview";
import { AdminLockIn } from "@/components/decks/admin-lock-in";
import { ArchetypeChips } from "@/components/decks/archetype-picker";
import { DeckRecordCard } from "@/components/decks/deck-record";
import type { DeckRecord } from "@/lib/types";

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
  views,
  deckIdentity,
  bannerImageUrl,
  isAdmin = false,
  record = null,
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
  views: number;
  deckIdentity: string[];
  bannerImageUrl: string | null;
  isAdmin?: boolean;
  record?: DeckRecord | null;
}) {
  const overBudget =
    deck.threshold_amount != null && totals.budget_price > deck.threshold_amount;

  // Mana curve over non-land cards (0..7+).
  const curve = new Array(8).fill(0) as number[];
  for (const c of cards) {
    if ((c.type_line ?? "").includes("Land")) continue;
    const b = Math.min(7, Math.max(0, Math.floor(c.cmc ?? 0)));
    curve[b] += c.quantity;
  }
  const maxCurve = Math.max(1, ...curve);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <DeckBanner
        deckId={deck.id}
        imageUrl={bannerImageUrl}
        canEdit={false}
        choices={[]}
        currentBannerId={null}
        posX={deck.banner_pos_x ?? 50}
        posY={deck.banner_pos_y ?? 50}
      />

      <PreviewProvider initialName={cards[0]?.name ?? null}>
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="order-2 flex min-w-0 flex-1 flex-col gap-6">
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
        {deck.archetypes?.length > 0 && (
          <div className="mt-1">
            <ArchetypeChips archetypes={deck.archetypes} />
          </div>
        )}
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
          {lockIn && (
            <LockInBadge
              lockIn={lockIn}
              href={`/decks/${deck.id}/locks/${lockIn.id}`}
            />
          )}
          <LikeButton
            deckId={deck.id}
            liked={liked}
            count={likeCount}
            canLike={canLock}
          />
          <ViewCount count={views} />
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

      {isAdmin && (
        <AdminLockIn deckId={deck.id} defaultBudget={totals.budget_price} />
      )}

      {record && (
        <DeckRecordCard
          deckId={deck.id}
          record={record}
          isOwner={false}
          recordPublic={deck.record_public}
        />
      )}

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
      <DeckCardList cards={cards} variant="view" deckId={deck.id} />

      {/* Primer / description */}
      {deck.description_md && (
        <section className="border-border border-t pt-4">
          <div className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
            Primer
          </div>
          <ArticleBody body={deck.description_md} />
        </section>
      )}
          </div>

          <aside className="order-1 hidden w-[300px] shrink-0 lg:block">
            <DeckPreviewPane />
          </aside>
        </div>
      </PreviewProvider>
    </main>
  );
}
