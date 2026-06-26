import { createDeck } from "@/app/decks/actions";
import { GAME_FORMATS } from "@/lib/types";

export default function NewDeckPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">New deck</h1>

      <form action={createDeck} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Name</span>
          <input
            name="name"
            placeholder="$15 Omnath Landfall"
            className="border-border bg-background rounded-md border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Format</span>
          <select
            name="game_format"
            defaultValue="commander"
            className="border-border bg-background rounded-md border px-3 py-2 capitalize"
          >
            {GAME_FORMATS.map((f) => (
              <option key={f} value={f} className="capitalize">
                {f}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Budget cap (USD)</span>
          <input
            name="threshold_amount"
            type="number"
            step="0.01"
            min="0"
            list="threshold-presets"
            placeholder="15 — leave blank for no cap"
            className="border-border bg-background rounded-md border px-3 py-2"
          />
          <datalist id="threshold-presets">
            <option value="15" />
            <option value="20" />
            <option value="50" />
          </datalist>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Visibility</span>
          <select
            name="visibility"
            defaultValue="private"
            className="border-border bg-background rounded-md border px-3 py-2"
          >
            <option value="private">Private</option>
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
          </select>
        </label>

        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium hover:opacity-90"
        >
          Create deck
        </button>
      </form>
    </main>
  );
}
