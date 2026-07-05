"use client";

import { useState } from "react";
import { createDeck } from "@/app/decks/actions";
import { GAME_FORMATS } from "@/lib/types";
import { useCardSearch } from "@/lib/use-card-search";
import { Button } from "@/components/ui/button";

const field = "border-border bg-background rounded-md border px-3 py-2 text-sm";

export function NewDeckForm() {
  const [format, setFormat] = useState("commander");
  const [commander, setCommander] = useState<{
    name: string;
    oracle_id: string;
  } | null>(null);

  return (
    <form action={createDeck} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Name</span>
        <input
          name="name"
          placeholder="$15 Omnath Landfall"
          className={field}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Format</span>
        <select
          name="game_format"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className={`${field} capitalize`}
        >
          {GAME_FORMATS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>

      {format === "commander" && (
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Commander (optional)</span>
          <CommanderPicker value={commander} onChange={setCommander} />
          <input
            type="hidden"
            name="commander_oracle_id"
            value={commander?.oracle_id ?? ""}
          />
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Budget cap (USD)</span>
        <input
          name="threshold_amount"
          type="number"
          step="0.01"
          min="0"
          list="threshold-presets"
          placeholder="15"
          className={field}
        />
        <span className="text-muted-foreground text-xs">
          Leave blank for no cap.
        </span>
        <datalist id="threshold-presets">
          <option value="15" />
          <option value="20" />
          <option value="50" />
        </datalist>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Visibility</span>
        <select name="visibility" defaultValue="private" className={field}>
          <option value="private">Private</option>
          <option value="unlisted">Unlisted</option>
          <option value="public">Public</option>
        </select>
      </label>

      <Button type="submit" className="self-start">
        Create deck
      </Button>
    </form>
  );
}

function CommanderPicker({
  value,
  onChange,
}: {
  value: { name: string; oracle_id: string } | null;
  onChange: (v: { name: string; oracle_id: string } | null) => void;
}) {
  const { q, setQ, results, open, reset } = useCardSearch(8);

  if (value) {
    return (
      <div className="border-border bg-background flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
        <span className="font-medium">{value.name}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search a commander…"
        className={`${field} w-full`}
      />
      {open && results.length > 0 && (
        <ul className="border-border bg-card absolute z-10 mt-1 w-full overflow-hidden rounded-md border shadow-lg">
          {results.map((r) => (
            <li key={r.oracle_id}>
              <button
                type="button"
                onClick={() => {
                  onChange({ name: r.name, oracle_id: r.oracle_id });
                  reset();
                }}
                className="hover:bg-muted block w-full px-3 py-2 text-left text-sm"
              >
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
