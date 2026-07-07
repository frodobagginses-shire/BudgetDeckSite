"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addPartnerCommander } from "@/app/decks/actions";
import { useCardSearch } from "@/lib/use-card-search";
import { formatUsd } from "@/lib/format";
import { Button } from "@/components/ui/button";
import type { PartnerSpec } from "@/lib/commander";

const KIND_COPY: Record<PartnerSpec["kind"], (name: string) => string> = {
  partner: (n) =>
    `${n} has Partner — you can add a second commander that also has Partner.`,
  partnerWith: (n) => `${n} has a named partner.`,
  friendsForever: (n) =>
    `${n} has Friends forever — you can add a second commander that also has Friends forever.`,
  chooseBackground: (n) =>
    `${n} lets you choose a Background as a second commander.`,
  doctorsCompanion: (n) =>
    `${n} is a Doctor's companion — you can add a Doctor as a second commander.`,
};

/** Modal shown after a partner-capable card becomes the sole commander.
 * "Partner with X" offers a one-click add; the generic mechanics (Partner,
 * Friends forever, Backgrounds, Doctor's companion) open a filtered search. */
export function PartnerPrompt({
  deckId,
  commander,
  spec,
  onClose,
}: {
  deckId: string;
  commander: { name: string; oracle_id: string };
  spec: PartnerSpec;
  onClose: () => void;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { q, setQ, results, open } = useCardSearch(
    8,
    undefined,
    commander.oracle_id
  );

  const add = (ref: { oracleId?: string; name?: string }) =>
    startTransition(async () => {
      const r = await addPartnerCommander(deckId, ref);
      if (!r.ok) {
        setMsg(r.message ?? "Couldn't add that partner.");
        return;
      }
      router.refresh();
      onClose();
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add a partner commander"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="border-border bg-card w-full max-w-md rounded-xl border p-5 shadow-xl">
        <h2 className="text-base font-semibold">Add a partner commander?</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {KIND_COPY[spec.kind](commander.name)}
        </p>

        {spec.kind === "partnerWith" && spec.partnerName ? (
          <div className="mt-4 flex flex-col gap-2">
            <Button
              disabled={pending}
              onClick={() => add({ name: spec.partnerName! })}
            >
              Add {spec.partnerName} as second commander
            </Button>
          </div>
        ) : (
          <div className="relative mt-4">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search eligible partners…"
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
            />
            {open && (
              <ul className="border-border bg-card absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border shadow-lg">
                {results.length === 0 ? (
                  <li className="text-muted-foreground px-3 py-2 text-xs">
                    No eligible partners match.
                  </li>
                ) : (
                  results.map((r) => (
                    <li key={r.oracle_id}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => add({ oracleId: r.oracle_id })}
                        className="hover:bg-muted flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm disabled:opacity-50"
                      >
                        <span>{r.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {formatUsd(r.cheapest_price_usd)}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        )}

        {msg && <p className="text-destructive mt-3 text-xs">{msg}</p>}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
