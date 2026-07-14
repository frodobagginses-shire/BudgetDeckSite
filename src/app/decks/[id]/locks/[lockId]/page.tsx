import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatUsd } from "@/lib/format";
import type { LockSnapshot, LockSnapshotCard } from "@/lib/types";

export const metadata = {
  title: "Price Lock snapshot | Budget Deck Site",
};

const BOARD_LABEL: Record<string, string> = {
  main: "Mainboard",
  considering: "Considering",
  side: "Sideboard",
  maybe: "Maybe",
};
const BOARD_ORDER = ["main", "considering", "side", "maybe"];

export default async function LockSnapshotPage({
  params,
}: {
  params: Promise<{ id: string; lockId: string }>;
}) {
  const { id, lockId } = await params;
  const supabase = await createClient();

  // RLS limits lock_ins to locks on decks you can see (or your own stamps).
  const { data: lock } = await supabase
    .from("lock_ins")
    .select("id, deck_id, user_id, locked_at, budget_price, bling_price, kind, snapshot")
    .eq("id", lockId)
    .maybeSingle();
  if (!lock || lock.deck_id !== id) notFound();

  const { data: locker } = await supabase
    .from("users")
    .select("handle")
    .eq("id", lock.user_id)
    .maybeSingle();
  const lockerHandle = (locker?.handle as string) ?? null;

  const date = new Date(lock.locked_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const snap = (lock.snapshot as LockSnapshot | null) ?? null;
  const cards = snap?.cards ?? [];

  // Commander(s) first, then cards grouped by board.
  const commanders = cards.filter((c) => c.commander);
  const byBoard = new Map<string, LockSnapshotCard[]>();
  for (const c of cards) {
    if (c.commander) continue;
    const arr = byBoard.get(c.board) ?? [];
    arr.push(c);
    byBoard.set(c.board, arr);
  }

  const Row = ({ c }: { c: LockSnapshotCard }) => (
    <li className="flex items-center justify-between gap-3 py-1 text-sm">
      <span className="min-w-0 truncate">
        <span className="text-muted-foreground tabular-nums">{c.qty}×</span>{" "}
        {c.name}
        {!c.counts_toward_budget && (
          <span className="text-muted-foreground ml-2 text-xs">
            (excluded)
          </span>
        )}
      </span>
      {snap?.priced && c.line_cheapest != null && (
        <span className="text-muted-foreground shrink-0 tabular-nums">
          {formatUsd(c.line_cheapest)}
        </span>
      )}
    </li>
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <Link
          href={`/decks/${id}`}
          className="text-muted-foreground hover:text-foreground"
        >
          Back to current deck
        </Link>
        {lock.kind === "creator" && (
          <Link
            href={`/decks/${id}/locks`}
            className="text-muted-foreground hover:text-foreground"
          >
            Snapshot history
          </Link>
        )}
      </div>

      <header className="flex flex-col gap-2">
        <span className="text-muted-foreground text-sm">
          Price Lock snapshot
          {lockerHandle && (
            <>
              {" · "}
              <Link
                href={`/users/${lockerHandle}`}
                className="hover:text-foreground"
              >
                @{lockerHandle}
              </Link>
            </>
          )}
        </span>
        <h1 className="text-3xl font-bold tracking-tight">
          {snap?.name ?? "Deck"}
        </h1>
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm capitalize">
          {snap?.game_format && <span>{snap.game_format}</span>}
          {snap?.threshold_amount != null && (
            <span>· cap {formatUsd(snap.threshold_amount)}</span>
          )}
        </div>
      </header>

      <div className="border-border bg-card flex flex-wrap items-center gap-x-8 gap-y-2 rounded-xl border p-4">
        <div>
          <div className="text-muted-foreground text-xs">Locked budget price</div>
          <div className="text-2xl font-bold">
            {formatUsd(lock.budget_price)}
          </div>
        </div>
        <div className="text-muted-foreground text-sm">
          Locked on <span className="text-foreground">{date}</span>
        </div>
      </div>

      <p className="text-muted-foreground border-border bg-muted/40 rounded-md border p-3 text-xs">
        This is a frozen snapshot of the deck exactly as it stood when the price
        was locked on {date}. The{" "}
        <Link href={`/decks/${id}`} className="underline">
          live deck
        </Link>{" "}
        may have changed since.
        {snap && !snap.priced && (
          <>
            {" "}
            Card prices aren&apos;t shown for this lock because the budget
            figure was recorded directly.
          </>
        )}
      </p>

      {!snap ? (
        <p className="text-muted-foreground text-sm">
          No decklist snapshot was captured for this lock (it predates
          snapshotting). Only the locked price and date are on record.
        </p>
      ) : (
        <section className="flex flex-col gap-5">
          {commanders.length > 0 && (
            <div>
              <div className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
                Commander
              </div>
              <ul className="divide-border divide-y">
                {commanders.map((c) => (
                  <Row key={`cmd-${c.name}`} c={c} />
                ))}
              </ul>
            </div>
          )}

          {BOARD_ORDER.filter((b) => byBoard.has(b)).map((b) => {
            const list = byBoard.get(b)!;
            const count = list.reduce((s, c) => s + c.qty, 0);
            return (
              <div key={b}>
                <div className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
                  {BOARD_LABEL[b] ?? b} ({count})
                </div>
                <ul className="divide-border divide-y">
                  {list.map((c) => (
                    <Row key={`${b}-${c.name}`} c={c} />
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
