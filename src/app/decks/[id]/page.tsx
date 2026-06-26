import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteDeck, updateDeckMeta, updateDeckPrimer } from "@/app/decks/actions";
import { MarkdownEditor } from "@/components/markdown-editor";
import { AddCardSearch } from "@/components/decks/add-card-search";
import { CardRow } from "@/components/decks/card-row";
import { DeckReadOnly } from "@/components/decks/deck-read-only";
import { ExportMenu } from "@/components/decks/export-menu";
import { BuyDeckButton } from "@/components/decks/buy-deck-button";
import { LockInBadge } from "@/components/decks/lock-in-badge";
import { LockInButton } from "@/components/decks/lock-in-button";
import { ForkButton } from "@/components/decks/fork-button";
import {
  DeckLineage,
  type LineageParent,
} from "@/components/decks/deck-lineage";
import { LikeButton } from "@/components/decks/like-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("decks")
    .select("name, game_format")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { title: "Deck — Budget Deck Site" };
  return {
    title: `${data.name} — Budget Deck Site`,
    description: `A ${data.game_format} deck on Budget Deck Site — build to a budget, validate on the cheapest printing.`,
    openGraph: { title: `${data.name} — Budget Deck Site` },
  };
}
import { formatUsd, getTypeBucket, typeBucketRank } from "@/lib/format";
import {
  GAME_FORMATS,
  type Board,
  type Deck,
  type DeckTotals,
  type LockIn,
  type PricedCard,
} from "@/lib/types";

export default async function DeckEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = sp?.tab === "primer" ? "primer" : "cards";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: deckData } = await supabase
    .from("decks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!deckData) notFound();
  const deck = deckData as Deck;
  const isOwner = !!user && deck.owner_id === user.id;

  let parent: LineageParent | null = null;
  if (deck.parent_deck_id && deck.show_lineage) {
    const { data: p } = await supabase
      .from("decks")
      .select("id, name, owner_id")
      .eq("id", deck.parent_deck_id)
      .maybeSingle();
    if (p) {
      const { data: ph } = await supabase
        .from("users")
        .select("handle")
        .eq("id", p.owner_id)
        .maybeSingle();
      parent = {
        id: p.id as string,
        name: p.name as string,
        handle: (ph?.handle as string) ?? null,
      };
    }
  }
  const { count: forkCountRaw } = await supabase
    .from("decks")
    .select("id", { count: "exact", head: true })
    .eq("parent_deck_id", deck.id);
  const forkCount = forkCountRaw ?? 0;

  const { count: likeCountRaw } = await supabase
    .from("deck_likes")
    .select("*", { count: "exact", head: true })
    .eq("deck_id", deck.id);
  const likeCount = likeCountRaw ?? 0;
  let liked = false;
  if (user) {
    const { data: lk } = await supabase
      .from("deck_likes")
      .select("deck_id")
      .eq("deck_id", deck.id)
      .eq("user_id", user.id)
      .maybeSingle();
    liked = !!lk;
  }

  const { data: cardsData } = await supabase.rpc("deck_cards_priced", {
    p_deck_id: id,
  });
  const allCards = ((cardsData ?? []) as PricedCard[]).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const cards = allCards.filter((c) => c.board === "main");
  const otherBoards: { key: Board; label: string }[] = [
    { key: "considering", label: "Considering" },
    { key: "side", label: "Sideboard" },
    { key: "maybe", label: "Maybe" },
  ];

  const { data: totalsData } = await supabase.rpc("deck_totals", {
    p_deck_id: id,
  });
  const totals: DeckTotals =
    ((totalsData as DeckTotals[] | null)?.[0]) ?? {
      budget_price: 0,
      total_price: 0,
      bling_price: 0,
      excluded_value: 0,
      card_count: 0,
    };

  const { data: lockData } = await supabase
    .from("lock_ins")
    .select("budget_price, bling_price, locked_at, kind")
    .eq("deck_id", id)
    .eq("kind", "creator")
    .order("locked_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const lockIn = (lockData as LockIn | null) ?? null;

  // Non-owners (and anonymous visitors) get the public read-only view.
  if (!isOwner) {
    const { data: owner } = await supabase
      .from("users")
      .select("handle")
      .eq("id", deck.owner_id)
      .maybeSingle();

    let visitorLocked = false;
    if (user) {
      const { data: vl } = await supabase
        .from("lock_ins")
        .select("id")
        .eq("deck_id", id)
        .eq("user_id", user.id)
        .eq("kind", "visitor")
        .maybeSingle();
      visitorLocked = !!vl;
    }

    return (
      <DeckReadOnly
        deck={deck}
        ownerHandle={(owner?.handle as string) ?? null}
        cards={cards}
        totals={totals}
        lockIn={lockIn}
        canLock={!!user}
        locked={visitorLocked}
        parent={parent}
        forkCount={forkCount}
        likeCount={likeCount}
        liked={liked}
      />
    );
  }

  const overBudget =
    deck.threshold_amount != null && totals.budget_price > deck.threshold_amount;

  // Group by type bucket, with a cheapest subtotal per group.
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

  const updateBound = updateDeckMeta.bind(null, deck.id);
  const deleteBound = deleteDeck.bind(null, deck.id);
  const updatePrimerBound = updateDeckPrimer.bind(null, deck.id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      {/* Settings */}
      <form action={updateBound} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Name</span>
          <input
            name="name"
            defaultValue={deck.name}
            className="border-border bg-background rounded-md border px-3 py-2 text-base font-semibold"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Format</span>
          <select
            name="game_format"
            defaultValue={deck.game_format}
            className="border-border bg-background rounded-md border px-2 py-2 capitalize"
          >
            {GAME_FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-24 flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Cap $</span>
          <input
            name="threshold_amount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={deck.threshold_amount ?? ""}
            className="border-border bg-background rounded-md border px-2 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Visibility</span>
          <select
            name="visibility"
            defaultValue={deck.visibility}
            className="border-border bg-background rounded-md border px-2 py-2"
          >
            <option value="private">Private</option>
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
          </select>
        </label>
        <button
          type="submit"
          className="border-border hover:bg-muted rounded-md border px-3 py-2 text-sm"
        >
          Save
        </button>
      </form>

      <DeckLineage parent={parent} forkCount={forkCount} />

      {/* Price summary */}
      <div className="border-border bg-card flex flex-wrap items-center gap-x-8 gap-y-2 rounded-xl border p-4">
        <div>
          <div className="text-muted-foreground text-xs">Budget price</div>
          <div className="text-2xl font-bold">
            {formatUsd(totals.budget_price)}
          </div>
        </div>
        {deck.threshold_amount != null && (
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              overBudget
                ? "bg-destructive/10 text-destructive"
                : "bg-brand-50 text-brand-700"
            }`}
          >
            {overBudget
              ? `Over by ${formatUsd(totals.budget_price - deck.threshold_amount)}`
              : `Under ${formatUsd(deck.threshold_amount)} ✓`}
          </span>
        )}
        <div className="text-muted-foreground ml-auto flex gap-6 text-sm">
          <span>Total {formatUsd(totals.total_price)}</span>
          <span>Your printings {formatUsd(totals.bling_price)}</span>
          <span>{totals.card_count} cards</span>
        </div>
        {totals.excluded_value > 0 && (
          <div className="text-muted-foreground basis-full text-xs">
            {formatUsd(totals.excluded_value)} excluded from budget (uncounted
            cards)
          </div>
        )}
        <div className="flex basis-full flex-wrap items-center gap-3 pt-1">
          <LockInButton deckId={deck.id} />
          <LockInBadge lockIn={lockIn} />
          <ForkButton deckId={deck.id} />
          <LikeButton
            deckId={deck.id}
            liked={liked}
            count={likeCount}
            canLike={!!user}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-border flex gap-1 border-b">
        <Link
          href={`/decks/${deck.id}`}
          className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === "cards" ? "border-brand-600 text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Cards
        </Link>
        <Link
          href={`/decks/${deck.id}?tab=primer`}
          className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === "primer" ? "border-brand-600 text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Primer
        </Link>
      </div>

      {tab === "cards" && (
        <>
      {/* Add card + export */}
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <AddCardSearch deckId={deck.id} />
        </div>
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

      {/* Card list */}
      {cards.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No cards yet — search above to add some.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(([bucket, list]) => {
            const subtotal = list.reduce(
              (s, c) => s + (c.line_cheapest ?? 0),
              0
            );
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
                    <CardRow key={c.scryfall_id} deckId={deck.id} card={c} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Other boards */}
      {otherBoards.map(({ key, label }) => {
        const list = allCards.filter((c) => c.board === key);
        if (list.length === 0) return null;
        return (
          <section key={key}>
            <div className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
              {label} ({list.reduce((s, c) => s + c.quantity, 0)})
            </div>
            <div className="divide-border divide-y">
              {list.map((c) => (
                <CardRow
                  key={`${key}-${c.scryfall_id}`}
                  deckId={deck.id}
                  card={c}
                />
              ))}
            </div>
          </section>
        );
      })}
        </>
      )}

      {tab === "primer" && (
      <section className="border-border border-t pt-4">
        <div className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
          Primer (Markdown)
        </div>
        <form action={updatePrimerBound} className="flex flex-col gap-2">
          <MarkdownEditor
            name="description_md"
            defaultValue={deck.description_md ?? ""}
            rows={10}
            placeholder="How the deck works, mulligan notes, budget swaps…"
          />
          <button
            type="submit"
            className="border-border hover:bg-muted self-start rounded-md border px-3 py-2 text-sm"
          >
            Save primer
          </button>
        </form>
      </section>
      )}

      {/* Danger zone */}
      <form action={deleteBound} className="pt-4">
        <button
          type="submit"
          className="text-muted-foreground hover:text-destructive text-xs"
        >
          Delete deck
        </button>
      </form>
    </main>
  );
}
