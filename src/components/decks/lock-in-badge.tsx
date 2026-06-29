import Link from "next/link";
import { formatUsd } from "@/lib/format";
import type { LockIn } from "@/lib/types";

export function LockInBadge({
  lockIn,
  href,
}: {
  lockIn: LockIn | null;
  href?: string;
}) {
  if (!lockIn) return null;
  const date = new Date(lockIn.locked_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const label = (
    <>
      🔒 Locked at {formatUsd(lockIn.budget_price)} · {date}
    </>
  );
  const base =
    "bg-brand-50 text-brand-700 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium";
  const title =
    "Price Lock: budget price and decklist captured and timestamped on this date";

  // When linked, the badge opens the frozen snapshot of the deck as it stood
  // at lock time — the proof behind the price.
  if (href) {
    return (
      <Link href={href} className={`${base} hover:opacity-80`} title={title}>
        {label}
        <span aria-hidden="true" className="opacity-60">
          →
        </span>
      </Link>
    );
  }

  return (
    <span className={base} title={title}>
      {label}
    </span>
  );
}
