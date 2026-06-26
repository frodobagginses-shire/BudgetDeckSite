"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  moveCard,
  removeCard,
  setCountsTowardBudget,
  setQuantity,
  toggleCommander,
} from "@/app/decks/actions";
import { formatUsd } from "@/lib/format";
import type { Board, PricedCard } from "@/lib/types";
import { BuyCardLink } from "@/components/decks/buy-card-link";
import { CardHover } from "@/components/cards/card-hover";

const BOARDS: { value: Board; label: string }[] = [
  { value: "main", label: "Main" },
  { value: "side", label: "Sideboard" },
  { value: "considering", label: "Considering" },
  { value: "maybe", label: "Maybe" },
];

export function CardRow({
  deckId,
  card,
  commanderEligible = false,
  isCommander = false,
}: {
  deckId: string;
  card: PricedCard;
  commanderEligible?: boolean;
  isCommander?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const commander = () =>
    startTransition(async () => {
      await toggleCommander(deckId, card.scryfall_id);
      router.refresh();
    });

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

  const move = (to: Board) =>
    startTransition(async () => {
      await moveCard(deckId, card.scryfall_id, card.board, to);
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

      <span className="flex-1 truncate">
        <CardHover name={card.name} className="hover:underline" />
      </span>

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

      <select
        value={card.board}
        onChange={(e) => move(e.target.value as Board)}
        className="border-border bg-background rounded border px-1 py-0.5 text-xs"
        aria-label="Board"
      >
        {BOARDS.map((b) => (
          <option key={b.value} value={b.value}>
            {b.label}
          </option>
        ))}
      </select>

      <span className="text-muted-foreground w-16 text-right tabular-nums">
        {formatUsd(card.line_cheapest)}
      </span>

      {commanderEligible && (
        <button
          type="button"
          onClick={commander}
          title={isCommander ? "Unset commander" : "Set as commander"}
          className={isCommander ? "" : "opacity-40 hover:opacity-100"}
        >
          👑
        </button>
      )}

      <BuyCardLink name={card.name} />

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
