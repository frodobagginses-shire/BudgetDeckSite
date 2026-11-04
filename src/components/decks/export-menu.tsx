"use client";

import { useState } from "react";
import {
  exportArenaText,
  exportDeckText,
  type ExportCard,
} from "@/lib/deck-text";

/** Export the deck list (main deck plus sideboard) to the clipboard. */
export function ExportMenu({
  cards,
  sideboard = [],
}: {
  cards: ExportCard[];
  sideboard?: ExportCard[];
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const textList = exportDeckText(cards, sideboard);
  const arenaList = exportArenaText(cards, sideboard);

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="border-border hover:bg-muted rounded-md border px-3 py-1.5 text-sm"
      >
        Export ▾
      </button>
      {open && (
        <div className="border-border bg-card absolute z-10 mt-1 w-48 overflow-hidden rounded-md border shadow-lg">
          <button
            type="button"
            onClick={() => copy("text", textList)}
            className="hover:bg-muted block w-full px-3 py-2 text-left text-sm"
          >
            {copied === "text" ? "Copied!" : "Copy as text"}
          </button>
          <button
            type="button"
            onClick={() => copy("arena", arenaList)}
            className="hover:bg-muted block w-full px-3 py-2 text-left text-sm"
          >
            {copied === "arena" ? "Copied!" : "Copy for Arena"}
          </button>
        </div>
      )}
    </div>
  );
}
