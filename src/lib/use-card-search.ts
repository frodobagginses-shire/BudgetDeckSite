"use client";

import { useEffect, useRef, useState } from "react";
import type { SearchCard } from "@/lib/types";

/**
 * Debounced card-search hook for autocomplete inputs.
 * - cancels in-flight requests when the term changes (no out-of-order results)
 * - caches results per term, so backspacing / re-typing is instant
 */
export function useCardSearch(limit = 10, deckId?: string, partnerFor?: string) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchCard[]>([]);
  const [open, setOpen] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cache = useRef<Map<string, SearchCard[]>>(new Map());
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (timer.current) clearTimeout(timer.current);

    if (!term) {
      setResults([]);
      setOpen(false);
      return;
    }

    const cached = cache.current.get(term);
    if (cached) {
      setResults(cached);
      setOpen(true);
      return;
    }

    timer.current = setTimeout(async () => {
      ctrl.current?.abort();
      const ac = new AbortController();
      ctrl.current = ac;
      try {
        const res = await fetch(
          `/api/cards/search?q=${encodeURIComponent(term)}&limit=${limit}${
            deckId ? `&deckId=${encodeURIComponent(deckId)}` : ""
          }${partnerFor ? `&partnerFor=${encodeURIComponent(partnerFor)}` : ""}`,
          { signal: ac.signal }
        );
        const json = await res.json();
        const list = (json.results ?? []) as SearchCard[];
        cache.current.set(term, list);
        setResults(list);
        setOpen(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setResults([]);
      }
    }, 150);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, limit, deckId, partnerFor]);

  const reset = () => {
    setQ("");
    setResults([]);
    setOpen(false);
  };

  return { q, setQ, results, open, setOpen, reset };
}
