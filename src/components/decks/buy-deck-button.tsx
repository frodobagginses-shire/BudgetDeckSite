"use client";

import { useState } from "react";
import { manapoolDeckUrl, deckListText, type BuyCard } from "@/lib/affiliate";

/** Opens Mana Pool's Mass Entry (with our ref) and copies the decklist so the
 * buyer can paste it — Mana Pool generates the deck token on their end. */
export function BuyDeckButton({ cards }: { cards: BuyCard[] }) {
  const [copied, setCopied] = useState(false);
  if (cards.length === 0) return null;

  const onClick = () => {
    // Open within the click gesture so the popup isn't blocked.
    window.open(manapoolDeckUrl(), "_blank", "noopener,noreferrer");
    navigator.clipboard
      ?.writeText(deckListText(cards))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {});
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-brand-600 inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
      title="Opens Mana Pool and copies your decklist to paste"
    >
      {copied ? "List copied — paste on Mana Pool" : "Buy this deck on Mana Pool"}
    </button>
  );
}
