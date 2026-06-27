"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ARCHETYPES, MAX_ARCHETYPES } from "@/lib/archetypes";
import { setArchetypes } from "@/app/decks/actions";

export function ArchetypePicker({
  deckId,
  selected,
}: {
  deckId: string;
  selected: string[];
}) {
  const [sel, setSel] = useState<string[]>(selected);
  const [pending, start] = useTransition();
  const router = useRouter();

  const toggle = (a: string) => {
    let next: string[];
    if (sel.includes(a)) next = sel.filter((x) => x !== a);
    else {
      if (sel.length >= MAX_ARCHETYPES) return;
      next = [...sel, a];
    }
    setSel(next);
    start(async () => {
      await setArchetypes(deckId, next);
      router.refresh();
    });
  };

  return (
    <div className="border-border bg-card rounded-xl border p-4">
      <div className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
        Archetypes ({sel.length}/{MAX_ARCHETYPES})
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ARCHETYPES.map((a) => {
          const on = sel.includes(a);
          const disabled = !on && sel.length >= MAX_ARCHETYPES;
          return (
            <button
              key={a}
              type="button"
              onClick={() => toggle(a)}
              disabled={pending || disabled}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                on
                  ? "border-brand-600 bg-brand-50 text-brand-700 font-medium"
                  : disabled
                    ? "border-border text-muted-foreground/40"
                    : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {a}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Read-only chips for displaying a deck's archetypes. */
export function ArchetypeChips({ archetypes }: { archetypes: string[] }) {
  if (!archetypes?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {archetypes.map((a) => (
        <span
          key={a}
          className="border-brand-200 bg-brand-50 text-brand-700 rounded-full border px-2.5 py-0.5 text-xs font-medium"
        >
          {a}
        </span>
      ))}
    </div>
  );
}
