"use client";

import { useSyncExternalStore } from "react";
import { formatUsd } from "@/lib/format";

export interface SnapshotOption {
  id: string;
  num: number;
  locked_at: string;
  budget_price: number;
  kind: string;
}

const noSubscribe = () => () => {};

/** A snapshot picker whose labels use the viewer's local date and time
 * (the server can only render UTC dates, which may be a day off). */
export function SnapshotSelect({
  name,
  defaultValue,
  options,
}: {
  name: string;
  defaultValue: string;
  options: SnapshotOption[];
}) {
  const local = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false
  );
  const when = (iso: string) =>
    local
      ? new Date(iso).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : new Date(iso).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        });

  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="select-clean border-border bg-background h-10 w-full min-w-0 rounded-md border pl-2.5 text-base sm:h-9 sm:text-sm"
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {`#${o.num} · ${when(o.locked_at)} · ${formatUsd(o.budget_price)}${
            o.kind === "auto" ? " (auto)" : ""
          }`}
        </option>
      ))}
    </select>
  );
}

/** From / To pickers that open the compare page (a plain GET form, so it
 * works before hydration and on any phone). */
export function SnapshotCompareForm({
  action,
  options,
  fromId,
  toId,
  swapHref,
}: {
  action: string;
  options: SnapshotOption[];
  fromId: string;
  toId: string;
  swapHref?: string;
}) {
  return (
    <form
      method="get"
      action={action}
      className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-end"
    >
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
        <span className="text-muted-foreground text-xs">From</span>
        <SnapshotSelect name="from" defaultValue={fromId} options={options} />
      </label>
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
        <span className="text-muted-foreground text-xs">To</span>
        <SnapshotSelect name="to" defaultValue={toId} options={options} />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-primary text-primary-foreground h-10 flex-1 rounded-md px-4 text-sm font-medium hover:opacity-90 sm:h-9 sm:flex-none"
        >
          Compare
        </button>
        {swapHref && (
          <a
            href={swapHref}
            className="border-border hover:bg-muted flex h-10 items-center rounded-md border px-3 text-sm sm:h-9"
            title="Swap From and To"
          >
            ⇄ Swap
          </a>
        )}
      </div>
    </form>
  );
}
