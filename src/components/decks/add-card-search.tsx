"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCard } from "@/app/decks/actions";
import { formatUsd } from "@/lib/format";
import { useCardSearch } from "@/lib/use-card-search";

export function AddCardSearch({ deckId }: { deckId: string }) {
  const { q, setQ, results, open, setOpen, reset } = useCardSearch(10, deckId);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const add = (oracleId: string) => {
    startTransition(async () => {
      const res = await addCard(deckId, oracleId);
      if (!res.ok) {
        setMsg(res.message ?? "Couldn't add that card.");
        return;
      }
      setMsg(null);
      reset();
      router.refresh();
    });
  };

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        onKeyDown={(e) => {
          // Shift+Enter adds the top addable result (skips grayed-out ones).
          if (e.key === "Enter" && e.shiftKey && results.length) {
            e.preventDefault();
            const top =
              results.find(
                (r) => r.legal !== false && r.in_identity !== false
              ) ?? results[0];
            add(top.oracle_id);
          }
        }}
        placeholder="Search cards to add… (try t:creature mv<=2)"
        className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
        disabled={pending}
      />
      {open && results.length > 0 && (
        <div className="border-border bg-card absolute z-10 mt-1 w-full overflow-hidden rounded-md border shadow-lg">
          <ul>
            {results.map((r) => {
              const unaddable = r.legal === false || r.in_identity === false;
              const reason =
                r.legal === false
                  ? "not legal"
                  : r.in_identity === false
                    ? "off-color"
                    : null;
              return (
                <li key={r.oracle_id}>
                  <button
                    type="button"
                    onClick={() => add(r.oracle_id)}
                    title={
                      reason
                        ? `${r.name} is ${reason} for this deck`
                        : undefined
                    }
                    className={`hover:bg-muted flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${
                      unaddable ? "text-muted-foreground/50" : ""
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate">{r.name}</span>
                      {reason && (
                        <span className="shrink-0 text-[10px] uppercase opacity-70">
                          {reason}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatUsd(r.cheapest_price_usd)}
                      {r.is_foil ? " ✦" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-border text-muted-foreground border-t px-3 py-1.5 text-xs">
            Press <kbd className="font-sans font-medium">Shift</kbd>+
            <kbd className="font-sans font-medium">Enter</kbd> to add the top
            result.
          </div>
        </div>
      )}
      {msg && <p className="text-destructive mt-1 text-xs">{msg}</p>}
    </div>
  );
}
