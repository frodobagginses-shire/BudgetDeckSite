export function formatUsd(n: number | null | undefined): string {
  if (n == null) return "—";
  return `$${n.toFixed(2)}`;
}

const TYPE_ORDER = [
  "Creature",
  "Planeswalker",
  "Battle",
  "Instant",
  "Sorcery",
  "Artifact",
  "Enchantment",
  "Land",
] as const;

// Matching priority differs from display order: Land wins over other card
// types (artifact lands, Dryad Arbor), then Creature (artifact/enchantment
// creatures), then the rest — the convention deck builders expect.
const TYPE_MATCH_PRIORITY = [
  "Land",
  "Creature",
  "Planeswalker",
  "Battle",
  "Instant",
  "Sorcery",
  "Artifact",
  "Enchantment",
] as const;

/** Reduce a full type line to a single grouping bucket for the editor list. */
export function getTypeBucket(typeLine: string | null): string {
  if (!typeLine) return "Other";
  // Only bucket by the card's front-face types (before any "//").
  const front = typeLine.split("//")[0];
  for (const t of TYPE_MATCH_PRIORITY) {
    if (front.includes(t)) return t;
  }
  return "Other";
}

/** Stable display order for the buckets above (Other last). */
export function typeBucketRank(bucket: string): number {
  const i = (TYPE_ORDER as readonly string[]).indexOf(bucket);
  return i === -1 ? TYPE_ORDER.length : i;
}
