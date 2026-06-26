"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCard } from "@/app/decks/actions";
import { formatUsd } from "@/lib/format";
import type { SearchCard } from "@/lib/types";

export function AddCardSearch({ deckId }: { deckId: string }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchCard[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/cards/search?q=${encodeURIComponent(q)}&limit=10`
        );
        const json = await res.json();
        setResults((json.results ?? []) as SearchCard[]);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  const add = (oracleId: string) => {
    startTransition(async () => {
      const res = await addCard(deckId, oracleId);
      if (!res.ok) {
        setMsg(res.message ?? "Couldn't add that card.");
        return;
      }
      setMsg(null);
      setQ("");
      setResults([]);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder="Search cards to add… (try t:creature mv<=2)"
        className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
        disabled={pending}
      />
      {open && results.length > 0 && (
        <ul className="border-border bg-card absolute z-10 mt-1 w-full overflow-hidden rounded-md border shadow-lg">
          {results.map((r) => (
            <li key={r.oracle_id}>
              <button
                type="button"
                onClick={() => add(r.oracle_id)}
                className="hover:bg-muted flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
              >
                <span className="truncate">{r.name}</span>
                <span className="text-muted-foreground shrink-0">
                  {formatUsd(r.cheapest_price_usd)}
                  {r.is_foil ? " ✦" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="text-destructive mt-1 text-xs">{msg}</p>}
    </div>
  );
}
