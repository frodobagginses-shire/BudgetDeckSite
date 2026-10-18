/** Owner-facing deck check, driven by the database's deck_problems(): a
 * small "complete" chip when the list is legal-sized, or a notice listing
 * what's wrong. `problems` is null when the check isn't available. */
export function DeckValidity({
  problems,
  variant,
}: {
  problems: string[] | null;
  variant: "chip" | "notice";
}) {
  if (problems == null) return null;

  if (variant === "chip") {
    if (problems.length > 0) return null;
    return (
      <span
        className="text-brand-700 inline-flex items-center gap-1 text-xs font-medium"
        title="Card count, copy limits and commander all check out. The deck can appear in Browse, and edits are snapshotted automatically."
      >
        <svg
          viewBox="0 0 24 24"
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        Complete deck
      </span>
    );
  }

  if (problems.length === 0) return null;
  return (
    <div
      role="status"
      className="basis-full rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950"
    >
      <span className="font-semibold">Incomplete deck:</span>{" "}
      {problems.join(" · ")}. Until that&apos;s fixed it won&apos;t show in
      Browse, and edits aren&apos;t snapshotted automatically.
    </div>
  );
}
