import type { LockSnapshotCard } from "@/lib/types";

const BOARD_LABEL: Record<string, string> = {
  main: "Mainboard",
  side: "Sideboard",
  considering: "Considering",
  maybe: "Maybe",
};
const BOARD_ORDER = ["main", "side", "considering", "maybe"];

/** Merge rows that share a board + name (+ printing, when kept). */
function merged(cards: LockSnapshotCard[], keepPrinting: boolean) {
  const out = new Map<string, LockSnapshotCard>();
  for (const c of cards) {
    const k = [c.board, c.name, keepPrinting ? `${c.set}|${c.cn}` : ""].join(
      "|"
    );
    const cur = out.get(k);
    if (cur) {
      cur.qty += c.qty;
      cur.commander ||= c.commander;
    } else out.set(k, { ...c });
  }
  return [...out.values()];
}

const byDeckOrder = (a: LockSnapshotCard, b: LockSnapshotCard) =>
  Number(b.commander) - Number(a.commander) || a.name.localeCompare(b.name);

/** Plain-text decklist (main deck with commanders first, then SIDEBOARD:),
 * the format Bulk import here, Moxfield and Archidekt all accept.
 * `withPrintings` appends "(SET) 123" where the snapshot recorded it. */
export function snapshotToText(
  cards: LockSnapshotCard[],
  withPrintings = false
): string {
  const line = (c: LockSnapshotCard) =>
    `${c.qty} ${c.name}${
      withPrintings && c.set
        ? ` (${c.set.toUpperCase()})${c.cn ? ` ${c.cn}` : ""}`
        : ""
    }`;
  const list = merged(cards, withPrintings);
  const main = list.filter((c) => c.board === "main").sort(byDeckOrder);
  const side = list.filter((c) => c.board === "side").sort(byDeckOrder);
  const out = main.map(line);
  if (side.length) out.push("", "SIDEBOARD:", ...side.map(line));
  return out.join("\n") + "\n";
}

const csvCell = (v: string | number | boolean | null | undefined) => {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Every board, one row per card, with the snapshot's prices. */
export function snapshotToCsv(cards: LockSnapshotCard[]): string {
  const header = [
    "Board",
    "Quantity",
    "Name",
    "Commander",
    "Counts toward budget",
    "Set",
    "Collector number",
    "Budget price (USD)",
    "Your printings price (USD)",
  ];
  const rows = [...cards]
    .sort(
      (a, b) =>
        BOARD_ORDER.indexOf(a.board) - BOARD_ORDER.indexOf(b.board) ||
        byDeckOrder(a, b)
    )
    .map((c) => [
      BOARD_LABEL[c.board] ?? c.board,
      c.qty,
      c.name,
      c.commander ? "yes" : "",
      c.counts_toward_budget ? "yes" : "no",
      c.set ? c.set.toUpperCase() : "",
      c.cn ?? "",
      c.line_cheapest == null ? "" : Number(c.line_cheapest).toFixed(2),
      c.line_bling == null ? "" : Number(c.line_bling).toFixed(2),
    ]);
  return (
    [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n"
  );
}

/** "my-deck-2026-10-17" style base filename. */
export function exportFileBase(deckName: string, iso: string): string {
  const slug =
    deckName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "deck";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${slug}-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
