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

/** Reduce a full type line to a single grouping bucket for the editor list. */
export function getTypeBucket(typeLine: string | null): string {
  if (!typeLine) return "Other";
  for (const t of TYPE_ORDER) {
    if (typeLine.includes(t)) return t;
  }
  return "Other";
}

/** Stable display order for the buckets above (Other last). */
export function typeBucketRank(bucket: string): number {
  const i = (TYPE_ORDER as readonly string[]).indexOf(bucket);
  return i === -1 ? TYPE_ORDER.length : i;
}
