"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  removeCard,
  setCountsTowardBudget,
  setQuantity,
} from "@/app/decks/actions";
import { formatUsd } from "@/lib/format";
import type { PricedCard } from "@/lib/types";

export function CardRow({
  deckId,
  card,
}: {
  deckId: string;
  card: PricedCard;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const changeQty = (delta: number) =>
    startTransition(async () => {
      await setQuantity(
        deckId,
        card.scryfall_id,
        card.board,
        card.quantity + delta
      );
      router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      await removeCard(deckId, card.scryfall_id, card.board);
      router.refresh();
    });

  const toggleCounts = () =>
    startTransition(async () => {
      await setCountsTowardBudget(
        deckId,
        card.scryfall_id,
        card.board,
        !card.counts_toward_budget
      );
      router.refresh();
    });

  return (
    <div
      className={`flex items-center gap-3 py-1.5 text-sm ${
        pending ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => changeQty(-1)}
          className="border-border hover:bg-muted size-6 rounded border leading-none"
          aria-label="Decrease"
        >
          −
        </button>
        <span className="w-6 text-center tabular-nums">{card.quantity}</span>
        <button
          type="button"
          onClick={() => changeQty(1)}
          className="border-border hover:bg-muted size-6 rounded border leading-none"
          aria-label="Increase"
        >
          +
        </button>
      </div>

      <span className="flex-1 truncate">{card.name}</span>

      <label
        className="text-muted-foreground flex items-center gap-1 text-xs"
        title="Counts toward the budget price"
      >
        <input
          type="checkbox"
          checked={card.counts_toward_budget}
          onChange={toggleCounts}
        />
        budget
      </label>

      <span className="text-muted-foreground w-16 text-right tabular-nums">
        {formatUsd(card.line_cheapest)}
      </span>

      <button
        type="button"
        onClick={remove}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Remove"
      >
        ✕
      </button>
    </div>
  );
}
