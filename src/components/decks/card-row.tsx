"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeCard, setQuantity } from "@/app/decks/actions";
import { formatUsd } from "@/lib/format";
import type { PricedCard } from "@/lib/types";
import { BuyCardLink } from "@/components/decks/buy-card-link";
import { CardHover } from "@/components/cards/card-hover";
import { CardRowMenu } from "@/components/decks/card-row-menu";

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

      <span className="min-w-0 flex-1">
        <CardHover name={card.name} className="text-left hover:underline" />
      </span>

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

      <button
        type="button"
        onClick={remove}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Remove"
      >
        ✕
      </button>

      <CardRowMenu
        deckId={deckId}
        card={card}
        commanderEligible={commanderEligible}
        isCommander={isCommander}
      />
    </div>
  );
}
