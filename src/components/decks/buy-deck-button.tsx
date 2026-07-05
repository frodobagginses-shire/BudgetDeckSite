"use client";

import { useState } from "react";
import { manapoolDeckUrl, deckListText, type BuyCard } from "@/lib/affiliate";

/** Mana Pool generates the deck token on their end, so we copy the list and
 * open their Mass Entry. A confirm dialog makes the "paste it" step obvious
 * before we send the user off (and opening from this click dodges popup blockers). */
export function BuyDeckButton({ cards }: { cards: BuyCard[] }) {
  const [open, setOpen] = useState(false);
  if (cards.length === 0) return null;

  const go = () => {
    // Open + copy within this click so the popup isn't blocked and the
    // clipboard write counts as a user gesture.
    window.open(manapoolDeckUrl(), "_blank", "noopener,noreferrer");
    navigator.clipboard?.writeText(deckListText(cards)).catch(() => {});
    setOpen(false);
  };

  const keycap =
    "border-border bg-muted rounded border px-1.5 py-0.5 font-mono text-xs";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-brand-600 inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
      >
        Buy this deck on Mana Pool
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="border-border bg-card w-full max-w-sm rounded-xl border p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-base font-semibold">Buy this deck on Mana Pool</div>
            <p className="text-muted-foreground mt-2 text-sm">
              We&apos;ll copy your {cards.length}-card list and open Mana Pool&apos;s
              bulk entry in a new tab. Paste the list into the box there, then
              check out.
            </p>

            <div className="border-border bg-muted/40 my-4 flex items-center justify-center gap-2 rounded-md border py-3 text-sm">
              <span className="text-muted-foreground">Then just press</span>
              <span className="inline-flex animate-pulse items-center gap-1">
                <kbd className={keycap}>⌘</kbd>
                <span className="text-muted-foreground">/</span>
                <kbd className={keycap}>Ctrl</kbd>
                <span className="text-muted-foreground">+</span>
                <kbd className={keycap}>V</kbd>
              </span>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="border-border hover:bg-muted rounded-md border px-3 py-1.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={go}
                className="bg-brand-600 rounded-md px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
              >
                Copy list &amp; open Mana Pool
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
