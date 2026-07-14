import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatUsd } from "@/lib/format";
import type { LockSnapshot } from "@/lib/types";

export const metadata = {
  title: "Snapshot history | Budget Deck Site",
};

interface LockRow {
  id: string;
  locked_at: string;
  budget_price: number;
  bling_price: number | null;
  snapshot: LockSnapshot | null;
}

/** Snapshot History: every creator Lock-In for a deck, newest first — a
 * record of how the build (and its price) changed over time. */
export default async function SnapshotHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS hides decks (and their locks) the viewer isn't allowed to see.
  const { data: deck } = await supabase
    .from("decks")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (!deck) notFound();

  const { data: lockRows } = await supabase
    .from("lock_ins")
    .select("id, locked_at, budget_price, bling_price, snapshot")
    .eq("deck_id", id)
    .eq("kind", "creator")
    .order("locked_at", { ascending: false });
  const locks = (lockRows ?? []) as LockRow[];

  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const cardCount = (l: LockRow) =>
    l.snapshot?.cards?.reduce((s, c) => s + c.qty, 0) ?? null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <Link
        href={`/decks/${id}`}
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        Back to current deck
      </Link>

      <header className="flex flex-col gap-1">
        <span className="text-muted-foreground text-sm">Snapshot history</span>
        <h1 className="text-3xl font-bold tracking-tight">{deck.name}</h1>
        <p className="text-muted-foreground text-sm">
          Every Price Lock freezes the decklist and price as they stood that
          day. Nothing here changes when the live deck does.
        </p>
      </header>

      {locks.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No snapshots yet. Locking in the deck&apos;s price creates one.
        </p>
      ) : (
        <ol className="border-border divide-border divide-y rounded-xl border">
          {locks.map((l, i) => {
            // Delta vs the previous (older) snapshot.
            const prev = locks[i + 1];
            const delta = prev ? l.budget_price - prev.budget_price : null;
            const n = cardCount(l);
            return (
              <li key={l.id}>
                <Link
                  href={`/decks/${id}/locks/${l.id}`}
                  className="hover:bg-muted flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium">{fmtDate(l.locked_at)}</span>
                    <span className="text-muted-foreground text-xs">
                      {n != null ? `${n} cards` : "price-only record"}
                      {i === 0 && " · latest"}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    {delta != null && Math.abs(delta) >= 0.005 && (
                      <span
                        className={`text-xs tabular-nums ${
                          delta > 0 ? "text-destructive" : "text-brand-600"
                        }`}
                      >
                        {delta > 0 ? "+" : "−"}
                        {formatUsd(Math.abs(delta))}
                      </span>
                    )}
                    <span className="text-lg font-bold tabular-nums">
                      {formatUsd(l.budget_price)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
