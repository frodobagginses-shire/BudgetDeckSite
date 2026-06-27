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
  { key: "cmc", label: "Mana value" },
  { key: "rarity", label: "Rarity" },
  { key: "price", label: "Price" },
  { key: "set", label: "Set" },
  { key: "none", label: "None" },
];

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "cmc", label: "Mana value" },
  { key: "price", label: "Price" },
  { key: "rarity", label: "Rarity" },
  { key: "quantity", label: "Quantity" },
];

export interface CardGroup {
  key: string;
  label: string;
  cards: PricedCard[];
  count: number;
  subtotal: number;
}

// ----- color category (Moxfield-style) -------------------------------------
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

function colorCategory(c: PricedCard): string {
  if ((c.type_line ?? "").includes("Land")) return "Lands";
  const ci = c.color_identity ?? [];
  if (ci.length === 0) return "Colorless";
  if (ci.length > 1) return "Multicolor";
  return COLOR_LABEL[ci[0]] ?? "Colorless";
}

// ----- rarity --------------------------------------------------------------
const RARITY_ORDER = ["mythic", "rare", "uncommon", "common", "special"];
function rarityRank(r: string | null): number {
  const i = RARITY_ORDER.indexOf((r ?? "").toLowerCase());
  return i === -1 ? RARITY_ORDER.length : i;
}
function rarityLabel(r: string | null): string {
  if (!r) return "Other";
  return r.charAt(0).toUpperCase() + r.slice(1);
}

// ----- price buckets -------------------------------------------------------
const PRICE_BUCKETS = [
  { max: 1, label: "Under $1", rank: 0 },
  { max: 5, label: "$1–5", rank: 1 },
  { max: 10, label: "$5–10", rank: 2 },
  { max: 25, label: "$10–25", rank: 3 },
  { max: Infinity, label: "$25+", rank: 4 },
];
function priceBucket(c: PricedCard) {
  const p = c.unit_cheapest ?? 0;
  return PRICE_BUCKETS.find((b) => p < b.max) ?? PRICE_BUCKETS[PRICE_BUCKETS.length - 1];
}

function cmcLabel(c: PricedCard): string {
  const v = Math.max(0, Math.floor(c.cmc ?? 0));
  return v >= 7 ? "7+ MV" : `${v} MV`;
}

/** Compute the group key + label + ordering rank for one card. */
function groupOf(
  c: PricedCard,
  groupBy: GroupKey
): { key: string; label: string; rank: number } {
  switch (groupBy) {
    case "type": {
      const b = getTypeBucket(c.type_line);
      return { key: b, label: b, rank: typeBucketRank(b) };
    }
    case "color": {
      const b = colorCategory(c);
      return { key: b, label: b, rank: COLOR_ORDER.indexOf(b) };
    }
    case "cmc": {
      const v = Math.max(0, Math.floor(c.cmc ?? 0));
      return { key: cmcLabel(c), label: cmcLabel(c), rank: Math.min(7, v) };
    }
    case "rarity":
      return {
        key: rarityLabel(c.rarity),
        label: rarityLabel(c.rarity),
        rank: rarityRank(c.rarity),
      };
    case "price": {
      const b = priceBucket(c);
      return { key: b.label, label: b.label, rank: b.rank };
    }
    case "set": {
      const s = (c.set_code ?? "—").toUpperCase();
      return { key: s, label: s, rank: 0 };
    }
    case "none":
    default:
      return { key: "all", label: "All cards", rank: 0 };
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
  const map = new Map<string, { label: string; rank: number; cards: PricedCard[] }>();
  for (const c of cards) {
    const g = groupOf(c, groupBy);
    const entry = map.get(g.key);
    if (entry) entry.cards.push(c);
    else map.set(g.key, { label: g.label, rank: g.rank, cards: [c] });
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
      cards: sorted,
      count: sorted.reduce((s, c) => s + c.quantity, 0),
      subtotal: sorted.reduce((s, c) => s + (c.line_cheapest ?? 0), 0),
    };
  });

  // Order the groups themselves. "set" groups alphabetically; others by rank.
  groups.sort((a, b) => {
    const ra = map.get(a.key)!.rank;
    const rb = map.get(b.key)!.rank;
    if (groupBy === "set" || ra === rb) return a.label.localeCompare(b.label);
    return ra - rb;
  });
  return groups;
}
