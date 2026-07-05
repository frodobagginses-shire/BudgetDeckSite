"use client";

import { useState } from "react";

export interface ExportCard {
  name: string;
  quantity: number;
  set_code: string | null;
  collector_number: string | null;
}

export function ExportMenu({ cards }: { cards: ExportCard[] }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const textList = cards.map((c) => `${c.quantity} ${c.name}`).join("\n");
  const arenaList = cards
    .map((c) => {
      const set = c.set_code ? ` (${c.set_code.toUpperCase()})` : "";
      const num =
        c.set_code && c.collector_number ? ` ${c.collector_number}` : "";
      return `${c.quantity} ${c.name}${set}${num}`;
    })
    .join("\n");

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
