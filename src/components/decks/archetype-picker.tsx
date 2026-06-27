"use client";

import { useEffect, useState, useTransition } from "react";
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
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

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
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-border hover:bg-muted flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left"
      >
        <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          Archetypes
        </span>
        {sel.length ? (
          <span className="flex flex-wrap gap-1.5">
            {sel.map((a) => (
              <span
                key={a}
                className="border-brand-200 bg-brand-50 text-brand-700 rounded-full border px-2 py-0.5 text-xs font-medium"
              >
                {a}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">Choose up to 3</span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="border-border bg-card max-h-[80vh] w-full max-w-lg overflow-auto rounded-xl border p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">Archetypes</div>
                <div className="text-muted-foreground text-xs">
                  Choose up to 3 ({sel.length}/{MAX_ARCHETYPES})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="bg-primary text-primary-foreground rounded-md px-4 py-1.5 text-sm font-medium hover:opacity-90"
              >
                Done
              </button>
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
        </div>
      )}
    </>
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
