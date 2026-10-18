import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatUsd } from "@/lib/format";
import { diffSnapshots, type DiffLine } from "@/lib/snapshot-diff";
import { LocalTime } from "@/components/local-time";
import { SnapshotKindChip } from "@/components/decks/snapshot-kind-chip";
import { SnapshotCompareForm } from "@/components/decks/snapshot-select";
import type { LockSnapshot } from "@/lib/types";

export const metadata = {
  title: "Compare snapshots | Budget Deck Site",
};

interface LockRow {
  id: string;
  locked_at: string;
  budget_price: number;
  kind: "creator" | "auto";
  snapshot: LockSnapshot | null;
}

const BOARD_LABEL: Record<string, string> = {
  side: "Sideboard",
  considering: "Considering",
  maybe: "Maybe",
};
const BOARD_NAME: Record<string, string> = {
  main: "main deck",
  side: "sideboard",
  considering: "Considering",
  maybe: "Maybe",
};
// The deck proper; Considering / Maybe changes are listed separately.
const DECK_BOARDS = new Set(["main", "side"]);

const signed = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : "±"}${formatUsd(Math.abs(n))}`;
const deltaClass = (n: number) =>
  n > 0.004
    ? "text-destructive"
    : n < -0.004
      ? "text-brand-700"
      : "text-muted-foreground";

function Tags({ l }: { l: DiffLine }) {
  return (
    <>
      {l.commander && (
        <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-px text-[10px] font-medium uppercase">
          Commander
        </span>
      )}
      {BOARD_LABEL[l.board] && (
        <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-px text-[10px] font-medium uppercase">
          {BOARD_LABEL[l.board]}
        </span>
      )}
      {l.movedTo && (
        <span className="text-muted-foreground shrink-0 text-[11px]">
          → moved to {BOARD_NAME[l.movedTo] ?? l.movedTo}
        </span>
      )}
      {l.movedFrom && (
        <span className="text-muted-foreground shrink-0 text-[11px]">
          ← from {BOARD_NAME[l.movedFrom] ?? l.movedFrom}
        </span>
      )}
      {!l.counted && (
        <span
          className="text-muted-foreground shrink-0 text-[10px] uppercase"
          title="Doesn't count toward the budget price"
        >
          not counted
        </span>
      )}
    </>
  );
}

function ChangeList({
  title,
  lines,
  sign,
  total,
}: {
  title: string;
  lines: DiffLine[];
  sign: "+" | "−";
  total: number;
}) {
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const added = sign === "+";
  return (
    <section className="border-border bg-card flex min-w-0 flex-col rounded-xl border">
      <header
        className={`flex items-center justify-between gap-3 rounded-t-xl border-b px-4 py-2.5 ${
          added ? "bg-brand-50" : "bg-destructive/5"
        }`}
      >
        <h2
          className={`text-sm font-semibold ${added ? "text-brand-700" : "text-destructive"}`}
        >
          {title}{" "}
          <span className="font-normal">
            ({count} {count === 1 ? "card" : "cards"})
          </span>
        </h2>
        <span
          className={`text-sm font-semibold tabular-nums ${added ? "text-brand-700" : "text-destructive"}`}
        >
          {sign}
          {formatUsd(total)}
        </span>
      </header>
      {lines.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-sm">None</p>
      ) : (
        <ul className="divide-border divide-y px-4">
          {lines.map((l) => (
            <li
              key={`${l.board}|${l.name}`}
              className="flex items-center gap-2 py-2 text-sm"
            >
              <span
                className={`w-8 shrink-0 font-medium tabular-nums ${added ? "text-brand-700" : "text-destructive"}`}
              >
                {sign}
                {l.qty}
              </span>
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="min-w-0 break-words">{l.name}</span>
                <Tags l={l} />
              </span>
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {formatUsd(l.price)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Side({
  deckId,
  l,
  label,
}: {
  deckId: string;
  l: LockRow;
  label: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <Link
        href={`/decks/${deckId}/locks/${l.id}`}
        className="flex flex-wrap items-center gap-1.5 text-sm font-medium hover:underline"
      >
        <LocalTime iso={l.locked_at} withTime />
        <SnapshotKindChip kind={l.kind} />
      </Link>
      <span className="text-2xl font-bold tabular-nums">
        {formatUsd(l.budget_price)}
      </span>
    </div>
  );
}

/** Diff two snapshots of a deck: cards added and removed (with prices), and
 * how the budget price moved — card changes vs. market price changes. */
export default async function CompareSnapshotsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: deck } = await supabase
    .from("decks")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (!deck) notFound();

  const { data: rows } = await supabase
    .from("lock_ins")
    .select("id, locked_at, budget_price, kind, snapshot")
    .eq("deck_id", id)
    .in("kind", ["creator", "auto"])
    .order("locked_at", { ascending: false });
  const locks = (rows ?? []) as LockRow[];
  const num = (l: LockRow) => locks.length - locks.indexOf(l);

  const pick = (v: unknown) =>
    typeof v === "string" ? locks.find((l) => l.id === v) : undefined;
  // Defaults: the two most recent snapshots.
  const to = pick(sp.to) ?? locks[0];
  const from = pick(sp.from) ?? locks.find((l) => l !== to);

  const back = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <Link
        href={`/decks/${id}/locks`}
        className="text-muted-foreground hover:text-foreground"
      >
        ← Snapshot history
      </Link>
      <Link
        href={`/decks/${id}`}
        className="text-muted-foreground hover:text-foreground"
      >
        Current deck
      </Link>
    </div>
  );

  if (!from || !to) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        {back}
        <h1 className="text-2xl font-bold tracking-tight">{deck.name}</h1>
        <p className="text-muted-foreground text-sm">
          You need at least two snapshots to compare. Lock In the price, or
          change a complete decklist, to record another.
        </p>
      </main>
    );
  }

  const diff = diffSnapshots(
    from.snapshot,
    to.snapshot,
    Number(from.budget_price),
    Number(to.budget_price)
  );
  const change = Number(to.budget_price) - Number(from.budget_price);
  const inDeck = (l: DiffLine) => DECK_BOARDS.has(l.board);
  const deckAdded = diff.added.filter(inDeck);
  const deckRemoved = diff.removed.filter(inDeck);
  const sideLines = [
    ...diff.removed.filter((l) => !inDeck(l)).map((l) => ({ l, sign: "−" })),
    ...diff.added.filter((l) => !inDeck(l)).map((l) => ({ l, sign: "+" })),
  ].sort((a, b) => a.l.name.localeCompare(b.l.name));
  const countedTotal = (ls: DiffLine[]) =>
    Math.round(
      ls.reduce((s, l) => s + (l.counted && l.price != null ? l.price : 0), 0) *
        100
    ) / 100;
  const noCardChanges = deckAdded.length === 0 && deckRemoved.length === 0;
  const missingList = !from.snapshot || !to.snapshot;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      {back}

      <header className="flex flex-col gap-1">
        <span className="text-muted-foreground text-sm">Compare snapshots</span>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {deck.name}
        </h1>
      </header>

      <SnapshotCompareForm
        action={`/decks/${id}/locks/compare`}
        options={locks.map((l) => ({
          id: l.id,
          num: num(l),
          locked_at: l.locked_at,
          budget_price: l.budget_price,
          kind: l.kind,
        }))}
        fromId={from.id}
        toId={to.id}
        swapHref={`/decks/${id}/locks/compare?from=${to.id}&to=${from.id}`}
      />

      {/* Price summary */}
      <section className="border-border bg-card flex flex-col gap-4 rounded-xl border p-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          <Side deckId={id} l={from} label={`From #${num(from)}`} />
          <span
            className="text-muted-foreground pb-1.5 text-lg"
            aria-hidden="true"
          >
            →
          </span>
          <Side deckId={id} l={to} label={`To #${num(to)}`} />
        </div>
        <div className="border-border flex flex-wrap items-baseline justify-between gap-2 border-t pt-3">
          <span className="text-sm font-medium">Budget price change</span>
          <span
            className={`text-xl font-bold tabular-nums ${deltaClass(change)}`}
          >
            {signed(change)}
          </span>
        </div>
        {diff.priced && !missingList ? (
          <dl className="grid gap-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Cards added</dt>
              <dd className={`tabular-nums ${deltaClass(diff.addedValue)}`}>
                {signed(diff.addedValue)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Cards removed</dt>
              <dd className={`tabular-nums ${deltaClass(-diff.removedValue)}`}>
                {signed(-diff.removedValue)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">
                Price changes on cards kept
              </dt>
              <dd className={`tabular-nums ${deltaClass(diff.drift)}`}>
                {signed(diff.drift)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-muted-foreground text-xs">
            {missingList
              ? "One of these snapshots has no decklist on record (it predates snapshots), so only the totals can be compared."
              : "One of these snapshots has no per-card prices (its budget was recorded directly), so the change can't be broken down."}
          </p>
        )}
      </section>

      {!missingList &&
        (noCardChanges ? (
          <p className="border-border bg-card text-muted-foreground rounded-xl border p-4 text-sm">
            Same decklist in both snapshots
            {Math.abs(change) >= 0.005
              ? "; the price difference is all market movement."
              : "."}
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <ChangeList
              title="Added"
              lines={deckAdded}
              sign="+"
              total={countedTotal(deckAdded)}
            />
            <ChangeList
              title="Removed"
              lines={deckRemoved}
              sign="−"
              total={countedTotal(deckRemoved)}
            />
          </div>
        ))}

      {!missingList && sideLines.length > 0 && (
        <details className="border-border bg-card group rounded-xl border">
          <summary className="hover:bg-muted/50 flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium">
            <span>
              Considering &amp; Maybe changes (
              {sideLines.reduce((s, x) => s + x.l.qty, 0)})
            </span>
            <span className="text-muted-foreground text-xs group-open:hidden">
              Show
            </span>
            <span className="text-muted-foreground hidden text-xs group-open:inline">
              Hide
            </span>
          </summary>
          <ul className="divide-border divide-y border-t px-4">
            {sideLines.map(({ l, sign }) => (
              <li
                key={`${sign}${l.board}|${l.name}`}
                className="flex items-center gap-2 py-2 text-sm"
              >
                <span
                  className={`w-8 shrink-0 font-medium tabular-nums ${sign === "+" ? "text-brand-700" : "text-destructive"}`}
                >
                  {sign}
                  {l.qty}
                </span>
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="min-w-0 break-words">{l.name}</span>
                  <Tags l={l} />
                </span>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {formatUsd(l.price)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {diff.movers.length > 0 && (
        <details className="border-border bg-card group rounded-xl border">
          <summary className="hover:bg-muted/50 flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium">
            <span>
              Biggest price moves on cards kept ({diff.movers.length})
            </span>
            <span className="text-muted-foreground text-xs group-open:hidden">
              Show
            </span>
            <span className="text-muted-foreground hidden text-xs group-open:inline">
              Hide
            </span>
          </summary>
          <ul className="divide-border divide-y border-t px-4">
            {diff.movers.slice(0, 15).map((m) => (
              <li
                key={`${m.board}|${m.name}`}
                className="flex items-center gap-2 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 break-words">
                  {m.qty > 1 && (
                    <span className="text-muted-foreground tabular-nums">
                      {m.qty}×{" "}
                    </span>
                  )}
                  {m.name}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {formatUsd(m.from)} → {formatUsd(m.to)}
                </span>
                <span
                  className={`w-16 shrink-0 text-right tabular-nums ${deltaClass(m.delta)}`}
                >
                  {signed(m.delta)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </main>
  );
}
