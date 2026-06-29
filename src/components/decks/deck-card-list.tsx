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
  type GroupIcon,
} from "@/lib/deck-grouping";
import { CardRow } from "@/components/decks/card-row";
import { usePreview } from "@/components/decks/deck-preview";
import { BuyCardLink } from "@/components/decks/buy-card-link";
import { ManaCost } from "@/components/cards/mana-cost";
import { TypeIcon } from "@/components/cards/type-icon";

function GroupIconView({ icon }: { icon: GroupIcon | null }) {
  if (!icon) return null;
  if (icon.kind === "type") return <TypeIcon type={icon.value} />;
  if (icon.kind === "dot")
    return (
      <span
        className="inline-block size-3 rounded-full"
        style={{ backgroundColor: icon.value }}
      />
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://svgs.scryfall.io/card-symbols/${icon.value}.svg`}
      alt=""
      style={{ display: "inline-block", height: "1em", width: "1em" }}
    />
  );
}

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
  const [showMana, setShowMana] = useState(false);
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
        if (typeof v.showMana === "boolean") setShowMana(v.showMana);
      }
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        "bds.cardview",
        JSON.stringify({ groupBy, sortBy, dir, showMana })
      );
    } catch {
      /* ignore */
    }
  }, [groupBy, sortBy, dir, showMana]);

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
        <button
          type="button"
          onClick={() => setShowMana((v) => !v)}
          className={`flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium ${
            showMana
              ? "border-brand-600 bg-brand-50 text-brand-700"
              : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
          title="Show each card's mana cost"
        >
          Mana cost
        </button>
      </div>

      <div className="gap-x-8 xl:columns-2">
        {groups.map((g) => (
          <section key={g.key} className="mb-5 break-inside-avoid">
            <div className="mb-1 flex items-center justify-between gap-2 text-xs tracking-wide">
              <span className="text-foreground flex items-center gap-1.5 font-bold uppercase">
                <GroupIconView icon={g.icon} />
                {g.label}
              </span>
              <span className="text-muted-foreground font-medium">
                {g.count} {g.count === 1 ? "card" : "cards"} ·{" "}
                {formatUsd(g.subtotal)}
              </span>
            </div>
            <div className="divide-border divide-y">
              {g.cards.map((c) =>
                variant === "editor" ? (
                  <CardRow
                    key={c.scryfall_id}
                    deckId={deckId}
                    card={c}
                    commanderEligible={commanderEligible}
                    showMana={showMana}
                  />
                ) : (
                  <div
                    key={c.scryfall_id}
                    onMouseEnter={() => setPreview(c.name)}
                    className="flex items-center gap-3 py-[0.34rem] text-sm"
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
                    {showMana && <ManaCost cost={c.mana_cost} />}
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
