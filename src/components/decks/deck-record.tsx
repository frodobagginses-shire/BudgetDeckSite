"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRecordPublic } from "@/app/decks/actions";
import type { DeckRecord } from "@/lib/types";

function Chips({ items }: { items: string[] }) {
  if (!items.length)
    return <span className="text-muted-foreground text-xs">none yet</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((a) => (
        <span
          key={a}
          className="border-border bg-muted rounded-full border px-2 py-0.5 text-xs"
        >
          {a}
        </span>
      ))}
    </span>
  );
}

export function DeckRecordCard({
  deckId,
  record,
  isOwner,
  recordPublic,
}: {
  deckId: string;
  record: DeckRecord;
  isOwner: boolean;
  recordPublic: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pub, setPub] = useState(recordPublic);
  const [pending, start] = useTransition();
  const router = useRouter();

  const games = record.wins + record.losses + record.draws;
  if (games === 0 && !isOwner) return null;

  const decided = record.wins + record.losses;
  const rate = decided ? Math.round((record.wins / decided) * 100) : null;

  const toggle = () =>
    start(async () => {
      const next = !pub;
      setPub(next);
      await setRecordPublic(deckId, next);
      router.refresh();
    });

  return (
    <div className="border-border bg-card rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-left"
        >
          <span className="text-muted-foreground text-xs">Match record</span>
          <div className="text-lg font-bold">
            {record.wins}–{record.losses}
            {record.draws ? `–${record.draws}` : ""}
            {rate != null && (
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                {rate}% win rate
              </span>
            )}
          </div>
          {games > 0 && (
            <span className="text-brand-600 text-xs">
              {open ? "Hide matchups ▲" : "See what it beat / lost to ▼"}
            </span>
          )}
        </button>

        {isOwner && (
          <div className="flex flex-col items-end gap-1 text-xs">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pub}
                onChange={toggle}
                disabled={pending}
              />
              Public record
            </label>
            <Link href="/matches" className="text-brand-600 hover:underline">
              Your matches
            </Link>
          </div>
        )}
      </div>

      {open && games > 0 && (
        <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Beat
            </span>
            <Chips items={record.beat} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Lost to
            </span>
            <Chips items={record.lost_to} />
          </div>
        </div>
      )}
    </div>
  );
}
