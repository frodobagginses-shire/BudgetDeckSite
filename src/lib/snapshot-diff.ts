import type { LockSnapshot, LockSnapshotCard } from "@/lib/types";

/** One card line, merged across printings, keyed by board + name. */
interface Line {
  name: string;
  board: string;
  commander: boolean;
  counted: boolean;
  qty: number;
  /** Cheapest price for the whole line; null when the snapshot has none. */
  price: number | null;
}

export interface DiffLine {
  name: string;
  board: string;
  commander: boolean;
  /** Counts toward the budget in the snapshot this line's price comes from. */
  counted: boolean;
  /** Copies added (or removed); always positive. */
  qty: number;
  /** Price of just those copies: newer snapshot's price for additions,
   * older snapshot's price for removals. */
  price: number | null;
  /** The same card went the other way on another board — i.e. it was moved
   * (e.g. main → maybe). Holds that other board. */
  movedTo?: string;
  movedFrom?: string;
}

export interface PriceMover {
  name: string;
  board: string;
  qty: number;
  from: number;
  to: number;
  /** Budget impact of the price change on the copies kept. */
  delta: number;
}

export interface SnapshotDiff {
  added: DiffLine[];
  removed: DiffLine[];
  movers: PriceMover[];
  /** Both snapshots carry per-card prices. */
  priced: boolean;
  /** Budget effect of cards added / removed, and of price moves on the
   * cards kept. added - removed + drift = the change in budget price. */
  addedValue: number;
  removedValue: number;
  drift: number;
}

const BOARD_ORDER = ["main", "side", "considering", "maybe"];
const keyOf = (c: { board: string; name: string }) => `${c.board}|${c.name}`;

function lines(snap: LockSnapshot | null): Map<string, Line> {
  const out = new Map<string, Line>();
  for (const c of (snap?.cards ?? []) as LockSnapshotCard[]) {
    const k = keyOf(c);
    const cur = out.get(k);
    const price = c.line_cheapest == null ? null : Number(c.line_cheapest);
    if (cur) {
      cur.qty += c.qty;
      cur.commander ||= c.commander;
      cur.counted ||= c.counts_toward_budget;
      cur.price =
        cur.price == null && price == null
          ? null
          : (cur.price ?? 0) + (price ?? 0);
    } else {
      out.set(k, {
        name: c.name,
        board: c.board,
        commander: !!c.commander,
        counted: !!c.counts_toward_budget,
        qty: c.qty,
        price,
      });
    }
  }
  return out;
}

const unit = (l: Line | undefined) =>
  l && l.price != null && l.qty > 0 ? l.price / l.qty : null;
const round2 = (n: number) => Math.round(n * 100) / 100;

function sortLines<
  T extends { board: string; name: string; commander?: boolean },
>(arr: T[]): T[] {
  return arr.sort(
    (a, b) =>
      Number(!!b.commander) - Number(!!a.commander) ||
      BOARD_ORDER.indexOf(a.board) - BOARD_ORDER.indexOf(b.board) ||
      a.name.localeCompare(b.name)
  );
}

/** Compare two snapshots: what was added, what was removed, and how the
 * budget price moved (card changes vs. market price changes). */
export function diffSnapshots(
  from: LockSnapshot | null,
  to: LockSnapshot | null,
  budgetFrom: number,
  budgetTo: number
): SnapshotDiff {
  const a = lines(from);
  const b = lines(to);
  const priced = !!from?.priced && !!to?.priced;

  const added: DiffLine[] = [];
  const removed: DiffLine[] = [];
  const movers: PriceMover[] = [];
  let addedValue = 0;
  let removedValue = 0;

  for (const k of new Set([...a.keys(), ...b.keys()])) {
    const la = a.get(k);
    const lb = b.get(k);
    const qa = la?.qty ?? 0;
    const qb = lb?.qty ?? 0;
    const ua = unit(la);
    const ub = unit(lb);
    const ref = (lb ?? la)!;

    if (qb > qa) {
      const price = ub == null ? null : round2(ub * (qb - qa));
      added.push({
        name: ref.name,
        board: ref.board,
        commander: !!lb?.commander,
        counted: !!lb?.counted,
        qty: qb - qa,
        price,
      });
      if (lb?.counted && price != null) addedValue += price;
    } else if (qa > qb) {
      const price = ua == null ? null : round2(ua * (qa - qb));
      removed.push({
        name: ref.name,
        board: ref.board,
        commander: !!la?.commander,
        counted: !!la?.counted,
        qty: qa - qb,
        price,
      });
      if (la?.counted && price != null) removedValue += price;
    }

    const kept = Math.min(qa, qb);
    if (
      priced &&
      kept > 0 &&
      ua != null &&
      ub != null &&
      la!.counted &&
      lb!.counted
    ) {
      const delta = round2(kept * (ub - ua));
      if (Math.abs(delta) >= 0.01) {
        movers.push({
          name: ref.name,
          board: ref.board,
          qty: kept,
          from: round2(kept * ua),
          to: round2(kept * ub),
          delta,
        });
      }
    }
  }

  addedValue = round2(addedValue);
  removedValue = round2(removedValue);
  // Whatever the card changes don't explain is market movement (this also
  // absorbs cards whose "counts toward budget" flag flipped).
  const drift = round2(budgetTo - budgetFrom - addedValue + removedValue);

  movers.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

  // Pair removals with additions of the same card on another board: moves.
  for (const r of removed) {
    const a = added.find((x) => x.name === r.name && x.board !== r.board);
    if (a) {
      r.movedTo = a.board;
      a.movedFrom = r.board;
    }
  }

  return {
    added: sortLines(added),
    removed: sortLines(removed),
    movers,
    priced,
    addedValue,
    removedValue,
    drift,
  };
}
