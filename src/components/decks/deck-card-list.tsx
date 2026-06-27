"use client";

import { useEffect, useMemo, useState } from "react";
import type { PricedCard } from "@/lib/types";
import { formatUsd } from "@/lib/format";
import {
  GROUP_OPTIONS,
  SORT_OPTIONS,
  groupAndSort,
  type GroupKey,
  type SortKey,
  type SortDir,
} from "@/lib/deck-grouping";
import { CardRow } from "@/components/decks/card-row";
import { usePreview } from "@/components/decks/deck-preview";
import { BuyCardLink } from "@/components/decks/buy-card-link";

export function DeckCardList({
  cards,
  variant,
  deckId,
  commanderEligible = false,
}: {
  cards: PricedCard[];
  variant: "editor" | "view";
  deckId: string;
  commanderEligible?: boolean;
}) {
  const [groupBy, setGroupBy] = useState<GroupKey>("type");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [dir, setDir] = useState<SortDir>("asc");
  const setPreview = usePreview();

  // Remember the viewer's preference across decks/sessions.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("bds.cardview");
      if (raw) {
        const v = JSON.parse(raw);
        if (v.groupBy) setGroupBy(v.groupBy);
        if (v.sortBy) setSortBy(v.sortBy);
        if (v.dir) setDir(v.dir);
      }
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        "bds.cardview",
        JSON.stringify({ groupBy, sortBy, dir })
      );
    } catch {
      /* ignore */
    }
  }, [groupBy, sortBy, dir]);

  const groups = useMemo(
    () => groupAndSort(cards, groupBy, sortBy, dir),
    [cards, groupBy, sortBy, dir]
  );

  const fieldCls =
    "select-clean border-border bg-background hover:bg-muted/60 focus:border-ring focus:ring-ring/30 h-8 cursor-pointer rounded-md border pl-2.5 text-xs font-medium focus:ring-2 focus:outline-none";

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border bg-card flex flex-wrap items-center gap-2 rounded-lg border p-1.5">
        <label className="text-muted-foreground flex items-center gap-1.5 pl-1 text-xs font-medium">
          <span>Group</span>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupKey)}
            className={fieldCls}
          >
            {GROUP_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-muted-foreground flex items-center gap-1.5 pl-1 text-xs font-medium">
          <span>Sort</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className={fieldCls}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
          className="border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium"
          title={dir === "asc" ? "Ascending" : "Descending"}
        >
          <span className="text-sm leading-none">{dir === "asc" ? "↑" : "↓"}</span>
          {dir === "asc" ? "Asc" : "Desc"}
        </button>
      </div>

      <div className="gap-x-8 sm:columns-2">
        {groups.map((g) => (
          <section key={g.key} className="mb-5 break-inside-avoid">
            <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
              <span>
                {g.label} ({g.count})
              </span>
              <span>{formatUsd(g.subtotal)}</span>
            </div>
            <div className="divide-border divide-y">
              {g.cards.map((c) =>
                variant === "editor" ? (
                  <CardRow
                    key={c.scryfall_id}
                    deckId={deckId}
                    card={c}
                    commanderEligible={commanderEligible}
                  />
                ) : (
                  <div
                    key={c.scryfall_id}
                    onMouseEnter={() => setPreview(c.name)}
                    className="flex items-center gap-3 py-1.5 text-sm"
                  >
                    <span className="text-muted-foreground w-6 text-right tabular-nums">
                      {c.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreview(c.name)}
                      className="min-w-0 flex-1 truncate text-left hover:underline"
                    >
                      {c.name}
                    </button>
                    <span className="text-muted-foreground w-16 text-right tabular-nums">
                      {formatUsd(c.line_cheapest)}
                    </span>
                    <BuyCardLink name={c.name} />
                  </div>
                )
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
