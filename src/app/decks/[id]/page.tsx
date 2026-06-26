import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteDeck, updateDeckMeta } from "@/app/decks/actions";
import { AddCardSearch } from "@/components/decks/add-card-search";
import { CardRow } from "@/components/decks/card-row";
import { formatUsd, getTypeBucket, typeBucketRank } from "@/lib/format";
import { GAME_FORMATS, type Deck, type DeckTotals, type PricedCard } from "@/lib/types";

export default async function DeckEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: deckData } = await supabase
    .from("decks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!deckData) notFound();
  const deck = deckData as Deck;
  if (deck.owner_id !== user.id) redirect("/decks");

  const { data: cardsData } = await supabase.rpc("deck_cards_priced", {
    p_deck_id: id,
  });
  const cards = ((cardsData ?? []) as PricedCard[])
    .filter((c) => c.board === "main")
    .sort((a, b) => a.name.localeCompare(b.name));

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
      </div>

      {/* Add card */}
      <AddCardSearch deckId={deck.id} />

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
