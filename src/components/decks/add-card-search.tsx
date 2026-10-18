"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCard } from "@/app/decks/actions";
import { formatUsd } from "@/lib/format";
import { useCardSearch } from "@/lib/use-card-search";

export function AddCardSearch({ deckId }: { deckId: string }) {
  const { q, setQ, results, open, setOpen, reset } = useCardSearch(10, deckId);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const inputId = useId();
  const hintId = useId();
  const boxRef = useRef<HTMLDivElement>(null);

  // Tapping/clicking anywhere else tucks the results away (they reopen on
  // focus), so they don't sit over the deck list.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, setOpen]);

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
    <div ref={boxRef} className="relative">
      <label
        htmlFor={inputId}
        className="text-brand-700 mb-1.5 flex items-center gap-1.5 text-sm font-semibold"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add cards
      </label>
      <div className="relative">
        <div
          className={`border-brand-500 bg-card focus-within:border-brand-600 focus-within:ring-brand-500/25 flex h-12 items-center gap-2.5 rounded-xl border-2 px-3 shadow-sm transition-shadow focus-within:ring-4 ${
            pending ? "opacity-70" : ""
          }`}
        >
          {pending ? (
            <span
              className="border-brand-600 size-5 shrink-0 animate-spin rounded-full border-2 border-t-transparent"
              aria-hidden="true"
            />
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="text-brand-600 size-5 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          )}
          <input
            id={inputId}
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
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Search cards to add…"
            aria-describedby={hintId}
            autoComplete="off"
            enterKeyHint="search"
            className="placeholder:text-muted-foreground h-full min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm"
            disabled={pending}
          />
          {q && !pending && (
            <button
              type="button"
              onClick={reset}
              className="text-muted-foreground hover:text-foreground -mr-1 flex size-8 shrink-0 items-center justify-center rounded-md"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        {open && results.length > 0 && (
          <div className="border-border bg-card absolute top-full z-30 mt-1 w-full overflow-hidden rounded-xl border shadow-lg">
            <ul className="max-h-[60dvh] overflow-y-auto">
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
                      className={`hover:bg-muted flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm sm:py-2 ${
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
          </div>
        )}
      </div>
      <p id={hintId} className="text-muted-foreground mt-1.5 text-xs">
        Filters work too, like{" "}
        <code className="font-mono">t:creature mv&lt;=2</code>
        <span className="hidden sm:inline">
          {" "}
          · <kbd className="font-sans font-medium">Shift</kbd>+
          <kbd className="font-sans font-medium">Enter</kbd> adds the top result
        </span>
      </p>
      {msg && <p className="text-destructive mt-1 text-xs">{msg}</p>}
    </div>
  );
}
