/** Labels a snapshot as a Price Lock (button press) or an automatic one. */
export function SnapshotKindChip({ kind }: { kind: string }) {
  if (kind === "auto") {
    return (
      <span
        className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium"
        title="Saved automatically after the decklist changed"
      >
        Auto
      </span>
    );
  }
  return (
    <span
      className="bg-brand-50 text-brand-700 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      title="Taken with the Lock In button"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      Price Lock
    </span>
  );
}
