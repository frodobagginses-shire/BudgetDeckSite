"use client";

import { useState } from "react";
import type { DeckToken } from "@/lib/types";

// Helper cards like "On an Adventure" can be made by dozens of cards; list
// this many and summarize the rest so the popover stays on screen.
const MAX_NAMES = 8;

/** "Brazen Borrower // Petty Theft" -> "Brazen Borrower": the front face is
 * enough to recognize the card, and keeps the popover lines short. */
const frontFace = (name: string) => name.split(" // ")[0];

/** Tokens, emblems and helper cards the deck makes, as a grid of card images.
 * Collapsed by default. Each tile shows which cards in the deck make it: on
 * hover with a mouse, or by tapping it on a touch screen. */
export function DeckTokens({ tokens }: { tokens: DeckToken[] }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  if (tokens.length === 0) return null;

  return (
    <section>
      <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
        <span>Tokens ({tokens.length})</span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="text-brand-700 font-normal tracking-normal normal-case hover:underline"
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>

      {open && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
          {tokens.map((t) => {
            const shown = active === t.scryfall_id;
            const tipId = `token-made-by-${t.scryfall_id}`;
            return (
              <li key={t.scryfall_id} className="group relative">
                <button
                  type="button"
                  onClick={() => setActive(shown ? null : t.scryfall_id)}
                  onBlur={() =>
                    setActive((a) => (a === t.scryfall_id ? null : a))
                  }
                  aria-describedby={tipId}
                  className="focus-visible:ring-ring block w-full overflow-hidden rounded-[5%/3.6%] focus-visible:ring-2 focus-visible:outline-none"
                >
                  {t.image_normal ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.image_normal}
                      alt={t.name}
                      loading="lazy"
                      className="block aspect-[488/680] w-full"
                    />
                  ) : (
                    <div className="border-border bg-muted flex aspect-[488/680] flex-col items-center justify-center gap-1 rounded-[5%/3.6%] border p-2 text-center">
                      <span className="text-sm font-medium">{t.name}</span>
                      <span className="text-muted-foreground text-[10px]">
                        {t.type_line}
                      </span>
                    </div>
                  )}
                </button>
                <div
                  id={tipId}
                  role="tooltip"
                  className={`pointer-events-none absolute inset-x-0 top-[12%] z-10 rounded-md bg-black/90 px-2 py-1.5 text-[11px] leading-snug text-white shadow-lg transition-opacity sm:px-2.5 sm:py-2 sm:text-xs ${
                    shown ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  <div className="text-white/70">
                    Made by {t.made_by.length}{" "}
                    {t.made_by.length === 1 ? "card" : "cards"}:
                  </div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-3.5 sm:pl-4">
                    {t.made_by.slice(0, MAX_NAMES).map((n) => (
                      <li key={n}>{frontFace(n)}</li>
                    ))}
                  </ul>
                  {t.made_by.length > MAX_NAMES && (
                    <div className="mt-1 text-white/70">
                      and {t.made_by.length - MAX_NAMES} more
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
