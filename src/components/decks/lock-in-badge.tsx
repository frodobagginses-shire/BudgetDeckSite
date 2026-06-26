import { formatUsd } from "@/lib/format";
import type { LockIn } from "@/lib/types";

export function LockInBadge({ lockIn }: { lockIn: LockIn | null }) {
  if (!lockIn) return null;
  const date = new Date(lockIn.locked_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return (
    <span
      className="bg-brand-50 text-brand-700 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium"
      title="The budget price that was locked in on this date"
    >
      🔒 Locked in at {formatUsd(lockIn.budget_price)} on {date}
    </span>
  );
}
