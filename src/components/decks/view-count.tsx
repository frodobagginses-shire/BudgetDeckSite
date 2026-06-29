/** Static view-count display, styled to sit alongside the like button. */
export function ViewCount({ count }: { count: number }) {
  return (
    <span
      className="text-muted-foreground inline-flex items-center gap-1.5 text-sm leading-none"
      title={`${count.toLocaleString()} ${count === 1 ? "view" : "views"}`}
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        aria-hidden="true"
        className="shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span className="tabular-nums">{count.toLocaleString()}</span>
    </span>
  );
}
