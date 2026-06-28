"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  moveCard,
  removeCard,
  setCountsTowardBudget,
  setPrinting,
  setQuantity,
  toggleCommander,
} from "@/app/decks/actions";
import { formatUsd } from "@/lib/format";
import type { Board, PricedCard } from "@/lib/types";

const BOARDS: { value: Board; label: string }[] = [
  { value: "main", label: "Main" },
  { value: "side", label: "Sideboard" },
  { value: "considering", label: "Considering" },
  { value: "maybe", label: "Maybe" },
];

interface Printing {
  scryfall_id: string;
  set_code: string | null;
  collector_number: string | null;
  price_usd: number | null;
}

export function CardRowMenu({
  deckId,
  card,
  commanderEligible,
  isCommander,
}: {
  deckId: string;
  card: PricedCard;
  commanderEligible: boolean;
  isCommander: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [printingsOpen, setPrintingsOpen] = useState(false);
  const [printings, setPrintings] = useState<Printing[] | null>(null);
  const [qtyOpen, setQtyOpen] = useState(false);
  const [qtyVal, setQtyVal] = useState(String(card.quantity));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setPrintingsOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const act = (fn: () => Promise<void>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
      setOpen(false);
      setPrintingsOpen(false);
    });

  const loadPrintings = async () => {
    setPrintingsOpen((v) => !v);
    if (printings) return;
    try {
      const res = await fetch(
        `/api/cards/printings?oracleId=${encodeURIComponent(card.oracle_id)}`
      );
      const json = await res.json();
      setPrintings((json.printings as Printing[]) ?? []);
    } catch {
      setPrintings([]);
    }
  };

  const item =
    "hover:bg-muted block w-full px-3 py-1.5 text-left disabled:opacity-50";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-muted-foreground hover:text-foreground px-1 leading-none"
        aria-label="More options"
      >
        ⋮
      </button>
      {open && (
        <div className="border-border bg-card absolute right-0 z-50 mt-1 w-56 rounded-md border py-1 text-sm shadow-lg">
          <button
            type="button"
            disabled={pending}
            className={item}
            onClick={() =>
              act(() =>
                setQuantity(
                  deckId,
                  card.scryfall_id,
                  card.board,
                  card.quantity + 1
                )
              )
            }
          >
            Add one
          </button>
          <button
            type="button"
            className={item}
            onClick={() => setQtyOpen((v) => !v)}
          >
            Set quantity…
          </button>
          {qtyOpen && (
            <div className="flex items-center gap-1 px-3 py-1.5">
              <input
                value={qtyVal}
                onChange={(e) =>
                  setQtyVal(e.target.value.replace(/[^0-9]/g, ""))
                }
                className="border-border w-14 rounded border px-1 py-0.5 text-sm"
                inputMode="numeric"
                aria-label="Set quantity"
              />
              <button
                type="button"
                disabled={pending}
                className="border-border hover:bg-muted rounded border px-2 py-0.5 text-xs"
                onClick={() => {
                  const n = parseInt(qtyVal || "1", 10);
                  if (n >= 1)
                    act(() =>
                      setQuantity(deckId, card.scryfall_id, card.board, n)
                    );
                }}
              >
                Set
              </button>
            </div>
          )}

          <div className="border-border my-1 border-t" />

          <button
            type="button"
            disabled={pending}
            className={item}
            onClick={() =>
              act(() =>
                setCountsTowardBudget(
                  deckId,
                  card.scryfall_id,
                  card.board,
                  !card.counts_toward_budget
                )
              )
            }
          >
            {card.counts_toward_budget
              ? "Don't count toward budget"
              : "Count toward budget"}
          </button>

          {commanderEligible && (
            <button
              type="button"
              disabled={pending}
              className={item}
              onClick={() =>
                startTransition(async () => {
                  const r = await toggleCommander(deckId, card.scryfall_id);
                  if (!r.ok) {
                    setMsg(r.message ?? "Can't set that as commander.");
                    return;
                  }
                  setMsg(null);
                  router.refresh();
                  setOpen(false);
                })
              }
            >
              {isCommander ? "Unset commander" : "Set as commander"}
            </button>
          )}
          {msg && (
            <p className="text-destructive px-3 py-1.5 text-xs">{msg}</p>
          )}

          <button
            type="button"
            className={item}
            onClick={loadPrintings}
          >
            Switch printing…
          </button>
          {printingsOpen && (
            <div className="border-border max-h-44 overflow-auto border-t">
              {printings === null ? (
                <div className="text-muted-foreground px-3 py-1.5 text-xs">
                  Loading…
                </div>
              ) : printings.length === 0 ? (
                <div className="text-muted-foreground px-3 py-1.5 text-xs">
                  No printings found.
                </div>
              ) : (
                printings.map((p) => (
                  <button
                    key={p.scryfall_id}
                    type="button"
                    disabled={pending}
                    className={`hover:bg-muted block w-full px-3 py-1 text-left text-xs ${
                      p.scryfall_id === card.scryfall_id ? "font-semibold" : ""
                    }`}
                    onClick={() =>
                      act(() =>
                        setPrinting(
                          deckId,
                          card.scryfall_id,
                          p.scryfall_id,
                          card.board
                        )
                      )
                    }
                  >
                    {(p.set_code ?? "").toUpperCase()} {p.collector_number ?? ""}{" "}
                    · {formatUsd(p.price_usd)}
                  </button>
                ))
              )}
            </div>
          )}

          <div className="border-border my-1 border-t" />
          <div className="text-muted-foreground px-3 py-1 text-xs uppercase tracking-wide">
            Move to
          </div>
          {BOARDS.filter((b) => b.value !== card.board).map((b) => (
            <button
              key={b.value}
              type="button"
              disabled={pending}
              className={item}
              onClick={() =>
                act(() => moveCard(deckId, card.scryfall_id, card.board, b.value))
              }
            >
              {b.label}
            </button>
          ))}

          <div className="border-border my-1 border-t" />
          <button
            type="button"
            disabled={pending}
            className="hover:bg-destructive/10 text-destructive block w-full px-3 py-1.5 text-left font-medium disabled:opacity-50"
            onClick={() =>
              act(() => removeCard(deckId, card.scryfall_id, card.board))
            }
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
