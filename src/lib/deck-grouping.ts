import type { PricedCard } from "@/lib/types";
import { getTypeBucket, typeBucketRank } from "@/lib/format";

export type GroupKey =
  | "type"
  | "color"
  | "cmc"
  | "rarity"
  | "price"
  | "set"
  | "none";

export type SortKey = "name" | "cmc" | "price" | "rarity" | "quantity";
export type SortDir = "asc" | "desc";

export const GROUP_OPTIONS: { key: GroupKey; label: string }[] = [
  { key: "type", label: "Type" },
  { key: "color", label: "Color" },
  { key: "cmc", label: "Mana Value" },
  { key: "rarity", label: "Rarity" },
  { key: "price", label: "Price" },
  { key: "set", label: "Set" },
  { key: "none", label: "None" },
];

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "cmc", label: "Mana Value" },
  { key: "price", label: "Price" },
  { key: "rarity", label: "Rarity" },
  { key: "quantity", label: "Quantity" },
];

/** A marker the renderer draws before a group label.
 * - mana/pip → a Scryfall mana symbol (value is the symbol code, e.g. W or 3)
 * - dot      → a colored circle (value is a hex color)
 * - emoji    → a small glyph (value is the character) */
export interface GroupIcon {
  kind: "mana" | "pip" | "dot" | "type";
  value: string;
}

export interface CardGroup {
  key: string;
  label: string;
  cards: PricedCard[];
  count: number;
  subtotal: number;
  icon: GroupIcon | null;
}

// ----- color category ------------------------------------------------------
const COLOR_LABEL: Record<string, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
};
const COLOR_ORDER = [
  "White",
  "Blue",
  "Black",
  "Red",
  "Green",
  "Multicolor",
  "Colorless",
  "Lands",
];
const COLOR_ICON: Record<string, GroupIcon> = {
  White: { kind: "mana", value: "W" },
  Blue: { kind: "mana", value: "U" },
  Black: { kind: "mana", value: "B" },
  Red: { kind: "mana", value: "R" },
  Green: { kind: "mana", value: "G" },
  Colorless: { kind: "mana", value: "C" },
  Multicolor: { kind: "dot", value: "#c5a44e" },
  Lands: { kind: "dot", value: "#8a6d3b" },
};

function colorCategory(c: PricedCard): string {
  if ((c.type_line ?? "").includes("Land")) return "Lands";
  const ci = c.color_identity ?? [];
  if (ci.length === 0) return "Colorless";
  if (ci.length > 1) return "Multicolor";
  return COLOR_LABEL[ci[0]] ?? "Colorless";
}

// ----- rarity --------------------------------------------------------------
const RARITY_ORDER = ["mythic", "rare", "uncommon", "common", "special"];
const RARITY_COLOR: Record<string, string> = {
  common: "#111827",
  uncommon: "#9ca3af",
  rare: "#c5a44e",
  mythic: "#e2552b",
};
function rarityRank(r: string | null): number {
  const i = RARITY_ORDER.indexOf((r ?? "").toLowerCase());
  return i === -1 ? RARITY_ORDER.length : i;
}
function rarityLabel(r: string | null): string {
  if (!r) return "Other";
  return r.charAt(0).toUpperCase() + r.slice(1);
}

// ----- price bands (5 bands sized to the deck's range) ----------------------
function niceStep(x: number): number {
  if (x <= 0) return 0.25;
  const steps = [0.1, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100];
  for (const s of steps) if (x <= s) return s;
  return Math.ceil(x / 100) * 100;
}
function fmtMoney(n: number): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}
interface Band {
  min: number;
  max: number;
  label: string;
  rank: number;
}
function priceBands(cards: PricedCard[]): Band[] {
  const max = Math.max(0, ...cards.map((c) => c.unit_cheapest ?? 0));
  if (max <= 0) return [{ min: 0, max: Infinity, label: "$0", rank: 0 }];
  const step = niceStep(max / 5);
  const bands: Band[] = [];
  for (let i = 0; i < 5; i++) {
    const lo = i * step;
    const hi = i === 4 ? Infinity : (i + 1) * step;
    bands.push({
      min: lo,
      max: hi,
      label: i === 4 ? `${fmtMoney(lo)}+` : `${fmtMoney(lo)} – ${fmtMoney(hi)}`,
      rank: i,
    });
  }
  return bands;
}

function cmcValue(c: PricedCard): number {
  return Math.max(0, Math.floor(c.cmc ?? 0));
}

/** Group key + label + rank + icon for one card (price handled separately). */
function groupOf(
  c: PricedCard,
  groupBy: GroupKey
): { key: string; label: string; rank: number; icon: GroupIcon | null } {
  switch (groupBy) {
    case "type": {
      const b = getTypeBucket(c.type_line);
      return {
        key: b,
        label: b,
        rank: typeBucketRank(b),
        icon: { kind: "type", value: b },
      };
    }
    case "color": {
      const b = colorCategory(c);
      return {
        key: b,
        label: b,
        rank: COLOR_ORDER.indexOf(b),
        icon: COLOR_ICON[b] ?? null,
      };
    }
    case "cmc": {
      const v = cmcValue(c);
      const label = `Mana Value ${v >= 7 ? "7+" : v}`;
      return {
        key: label,
        label,
        rank: Math.min(7, v),
        icon: { kind: "pip", value: String(Math.min(7, v)) },
      };
    }
    case "rarity": {
      const lbl = rarityLabel(c.rarity);
      const color = RARITY_COLOR[(c.rarity ?? "").toLowerCase()] ?? "#9ca3af";
      return {
        key: lbl,
        label: lbl,
        rank: rarityRank(c.rarity),
        icon: { kind: "dot", value: color },
      };
    }
    case "set": {
      const s = (c.set_code ?? "—").toUpperCase();
      return { key: s, label: s, rank: 0, icon: null };
    }
    case "none":
    default:
      return { key: "all", label: "All cards", rank: 0, icon: null };
  }
}

function compare(a: PricedCard, b: PricedCard, sortBy: SortKey): number {
  switch (sortBy) {
    case "cmc":
      return (a.cmc ?? 0) - (b.cmc ?? 0);
    case "price":
      return (a.unit_cheapest ?? 0) - (b.unit_cheapest ?? 0);
    case "rarity":
      return rarityRank(a.rarity) - rarityRank(b.rarity);
    case "quantity":
      return a.quantity - b.quantity;
    case "name":
    default:
      return a.name.localeCompare(b.name);
  }
}

/** Group + sort a card list per the chosen options. */
export function groupAndSort(
  cards: PricedCard[],
  groupBy: GroupKey,
  sortBy: SortKey,
  dir: SortDir
): CardGroup[] {
  const bands = groupBy === "price" ? priceBands(cards) : null;
  const assign = (c: PricedCard) => {
    if (bands) {
      const p = c.unit_cheapest ?? 0;
      const band =
        bands.find((b) => p >= b.min && p < b.max) ?? bands[bands.length - 1];
      return { key: band.label, label: band.label, rank: band.rank, icon: null };
    }
    return groupOf(c, groupBy);
  };

  const map = new Map<
    string,
    { label: string; rank: number; icon: GroupIcon | null; cards: PricedCard[] }
  >();
  for (const c of cards) {
    const g = assign(c);
    const entry = map.get(g.key);
    if (entry) entry.cards.push(c);
    else map.set(g.key, { label: g.label, rank: g.rank, icon: g.icon, cards: [c] });
  }

  const sign = dir === "desc" ? -1 : 1;
  const groups: CardGroup[] = [...map.entries()].map(([key, v]) => {
    const sorted = [...v.cards].sort((a, b) => {
      const primary = compare(a, b, sortBy) * sign;
      return primary !== 0 ? primary : a.name.localeCompare(b.name);
    });
    return {
      key,
      label: v.label,
      icon: v.icon,
      cards: sorted,
      count: sorted.reduce((s, c) => s + c.quantity, 0),
      subtotal: sorted.reduce((s, c) => s + (c.line_cheapest ?? 0), 0),
    };
  });

  groups.sort((a, b) => {
    const ra = map.get(a.key)!.rank;
    const rb = map.get(b.key)!.rank;
    if (groupBy === "set" || ra === rb) return a.label.localeCompare(b.label);
    return ra - rb;
  });
  return groups;
}
