/** Plain-text decklist parsing/serialization shared by bulk import and bulk
 * edit. Understands the common export shapes:
 *
 *   4 Cranial Plating          ← "<qty> <name>", "4x Name" also accepted
 *   3 Great Furnace (MH2) 242  ← set/collector suffixes are stripped
 *   SIDEBOARD:                 ← Moxfield-style section header
 *   SB: 3 Duress               ← MTGO-style per-line sideboard prefix
 *
 * "Deck" / "Mainboard" / "Commander" headers (Arena exports) reset to main.
 * Comment lines (// or #) and blank lines are ignored.
 */

export type TextBoard = "main" | "side";

export interface ParsedLine {
  qty: number;
  name: string;
  board: TextBoard;
}

const SIDE_HEADER = /^sideboard:?$/i;
const MAIN_HEADER = /^(main\s?(board|\s?deck)?|deck|commander):?$/i;

export function parseDeckText(text: string): ParsedLine[] {
  const out: ParsedLine[] = [];
  let section: TextBoard = "main";

  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;

    if (SIDE_HEADER.test(line)) {
      section = "side";
      continue;
    }
    if (MAIN_HEADER.test(line)) {
      section = "main";
      continue;
    }

    let board = section;
    const sb = line.match(/^SB:\s*(.+)$/i);
    if (sb) {
      board = "side";
      line = sb[1];
    }

    const m = line.match(/^(\d+)\s*x?\s+(.+)$/i);
    if (!m) continue;
    const name = m[2]
      .replace(/\s*\([A-Za-z0-9]{2,6}\)\s*[\w-]*\s*$/, "") // strip "(SET) 123"
      .replace(/\s*\*[FE]\*\s*$/, "") // strip foil/etched markers
      .trim();
    if (name) out.push({ qty: parseInt(m[1], 10), name, board });
  }
  return out;
}

/** Serialize a deck's main + sideboard as editable text (commanders first so
 * a round-trip through bulk edit keeps them visible at the top). */
export function buildDeckText(
  cards: {
    name: string;
    quantity: number;
    board: string;
    is_commander?: boolean;
  }[]
): string {
  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name);
  const main = cards
    .filter((c) => c.board === "main")
    .sort(
      (a, b) =>
        Number(b.is_commander ?? false) - Number(a.is_commander ?? false) ||
        byName(a, b)
    );
  const side = cards.filter((c) => c.board === "side").sort(byName);

  const lines = main.map((c) => `${c.quantity} ${c.name}`);
  if (side.length) {
    lines.push("SIDEBOARD:");
    for (const c of side) lines.push(`${c.quantity} ${c.name}`);
  }
  return lines.join("\n");
}
