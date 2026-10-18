import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatUsd } from "@/lib/format";
import { LocalTime } from "@/components/local-time";
import { SnapshotKindChip } from "@/components/decks/snapshot-kind-chip";
import {
  SnapshotCompareForm,
  type SnapshotOption,
} from "@/components/decks/snapshot-select";
import type { LockSnapshot } from "@/lib/types";

export const metadata = {
  title: "Snapshot history | Budget Deck Site",
};

interface LockRow {
  id: string;
  locked_at: string;
  budget_price: number;
  bling_price: number | null;
  kind: "creator" | "auto";
  snapshot: LockSnapshot | null;
}

/** Snapshot History: every Price Lock and automatic snapshot for a deck,
 * newest first — a record of how the build (and its price) changed. */
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
    .select("id, locked_at, budget_price, bling_price, kind, snapshot")
    .eq("deck_id", id)
    .in("kind", ["creator", "auto"])
    .order("locked_at", { ascending: false });
  const locks = (lockRows ?? []) as LockRow[];

  // Cards in the deck itself (main + sideboard), not Considering / Maybe.
  const cardCount = (l: LockRow) =>
    l.snapshot?.cards
      ?.filter((c) => c.board === "main" || c.board === "side")
      .reduce((s, c) => s + c.qty, 0) ?? null;
  // #1 = oldest, so numbers stay put as new snapshots arrive.
  const num = (i: number) => locks.length - i;
  const options: SnapshotOption[] = locks.map((l, i) => ({
    id: l.id,
    num: num(i),
    locked_at: l.locked_at,
    budget_price: l.budget_price,
    kind: l.kind,
  }));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href={`/decks/${id}`}
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Back to current deck
      </Link>

      <header className="flex flex-col gap-1">
        <span className="text-muted-foreground text-sm">Snapshot history</span>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {deck.name}
        </h1>
        <p className="text-muted-foreground text-sm">
          Each snapshot freezes the decklist and its price at that moment. Price
          Locks are taken when you press Lock In; auto snapshots are saved when
          the list changes (a burst of edits becomes one snapshot).
        </p>
      </header>

      {locks.length >= 2 && (
        <SnapshotCompareForm
          action={`/decks/${id}/locks/compare`}
          options={options}
          fromId={locks[1].id}
          toId={locks[0].id}
        />
      )}

      {locks.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No snapshots yet. Locking in the deck&apos;s price creates one, and so
          does changing a complete decklist.
        </p>
      ) : (
        <ol className="border-border divide-border bg-card divide-y rounded-xl border">
          {locks.map((l, i) => {
            // Delta vs the previous (older) snapshot.
            const prev = locks[i + 1];
            const delta = prev ? l.budget_price - prev.budget_price : null;
            const n = cardCount(l);
            return (
              <li
                key={l.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
              >
                <Link
                  href={`/decks/${id}/locks/${l.id}`}
                  className="group flex min-w-48 flex-1 flex-col"
                >
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    <span className="text-muted-foreground text-xs font-normal tabular-nums">
                      #{num(i)}
                    </span>
                    <span className="group-hover:underline">
                      <LocalTime iso={l.locked_at} withTime />
                    </span>
                    <SnapshotKindChip kind={l.kind} />
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {n != null ? `${n} cards` : "price-only record"}
                    {i === 0 && " · latest"}
                  </span>
                </Link>
                <span className="flex items-center gap-3">
                  {prev && (
                    <Link
                      href={`/decks/${id}/locks/compare?from=${prev.id}&to=${l.id}`}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md px-2 py-1 text-xs underline-offset-2 hover:underline"
                      title="Compare with the snapshot before it"
                    >
                      What changed
                    </Link>
                  )}
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
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
