"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setQuantity } from "@/app/decks/actions";
import { formatUsd } from "@/lib/format";
import type { PricedCard } from "@/lib/types";
import { BuyCardLink } from "@/components/decks/buy-card-link";
import { usePreview } from "@/components/decks/deck-preview";
import { CardRowMenu } from "@/components/decks/card-row-menu";
import { ManaCost } from "@/components/cards/mana-cost";

/** Quantity shown as a number; click it for a compact − [n] + stepper. */
function QuantityControl({
  quantity,
  onSet,
  pending,
}: {
  quantity: number;
  onSet: (n: number) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(String(quantity));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setVal(String(quantity)), [quantity]);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const apply = (n: number) => {
    if (Number.isFinite(n) && n >= 1 && n !== quantity) onSet(n);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="hover:bg-muted min-w-7 rounded px-1.5 py-0.5 text-center font-medium tabular-nums"
        aria-label="Quantity"
        title="Change quantity"
      >
        {quantity}
      </button>
      {open && (
        <div className="border-border bg-card absolute left-0 z-50 mt-1 flex items-center gap-1 rounded-md border p-1 shadow-lg">
          <button
            type="button"
            onClick={() => apply(quantity - 1)}
            disabled={pending || quantity <= 1}
            className="border-border hover:bg-muted size-6 rounded border leading-none disabled:opacity-40"
            aria-label="Decrease"
          >
            −
          </button>
          <input
            value={val}
            onChange={(e) => setVal(e.target.value.replace(/[^0-9]/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                apply(parseInt(val || "1", 10));
                setOpen(false);
              }
            }}
            onBlur={() => apply(parseInt(val || "1", 10))}
            className="border-border w-10 rounded border px-1 py-0.5 text-center text-sm"
            inputMode="numeric"
            aria-label="Set quantity"
          />
          <button
            type="button"
            onClick={() => apply(quantity + 1)}
            disabled={pending}
            className="border-border hover:bg-muted size-6 rounded border leading-none"
            aria-label="Increase"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

export function CardRow({
  deckId,
  card,
  commanderEligible = false,
  isCommander = false,
  showMana = false,
}: {
  deckId: string;
  card: PricedCard;
  commanderEligible?: boolean;
  isCommander?: boolean;
  showMana?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const setPreview = usePreview();

  const setQty = (n: number) =>
    startTransition(async () => {
      await setQuantity(deckId, card.scryfall_id, card.board, n);
      router.refresh();
    });

  return (
    <div
      onMouseEnter={() => setPreview(card.name)}
      className={`flex items-center gap-3 py-[0.34rem] text-sm ${
        pending ? "opacity-50" : ""
      }`}
    >
      <QuantityControl
        quantity={card.quantity}
        onSet={setQty}
        pending={pending}
      />

      <button
        type="button"
        onClick={() => setPreview(card.name)}
        className="min-w-0 flex-1 truncate text-left hover:underline"
      >
        {card.name}
      </button>

      {showMana && <ManaCost cost={card.mana_cost} />}

      {!card.counts_toward_budget && (
        <span
          className="text-muted-foreground text-[10px] uppercase"
          title="Not counted toward budget"
        >
          free
        </span>
      )}

      <span className="text-muted-foreground w-16 text-right tabular-nums">
        {formatUsd(card.line_cheapest)}
      </span>

      <BuyCardLink name={card.name} />

      <CardRowMenu
        deckId={deckId}
        card={card}
        commanderEligible={commanderEligible}
        isCommander={isCommander}
      />
    </div>
  );
}
