"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBanner } from "@/app/decks/actions";

export function DeckBanner({
  deckId,
  imageUrl,
  canEdit,
  choices,
  currentBannerId,
}: {
  deckId: string;
  imageUrl: string | null;
  canEdit: boolean;
  choices: { scryfall_id: string; name: string }[];
  currentBannerId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const change = (val: string) =>
    startTransition(async () => {
      await setBanner(deckId, val);
      router.refresh();
    });

  return (
    <div className="border-border bg-muted relative h-32 w-full overflow-hidden rounded-xl border sm:h-44">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : (
        <div className="from-brand-400/40 to-brand-700/30 absolute inset-0 bg-gradient-to-br" />
      )}

      {canEdit && (
        <details className="group absolute right-2 top-2">
          <summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full bg-black/45 text-sm text-white hover:bg-black/65">
            ✎
          </summary>
          <div className="border-border bg-card absolute right-0 mt-1 w-60 rounded-md border p-2 shadow-lg">
            <label className="text-muted-foreground mb-1 block text-xs">
              Banner card
            </label>
            <select
              defaultValue={currentBannerId ?? ""}
              disabled={pending}
              onChange={(e) => change(e.target.value)}
              className="border-border bg-background w-full rounded-md border px-2 py-1 text-sm"
            >
              <option value="">Auto (commander / most popular)</option>
              {choices.map((c) => (
                <option key={c.scryfall_id} value={c.scryfall_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </details>
      )}
    </div>
  );
}
