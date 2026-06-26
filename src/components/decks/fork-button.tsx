"use client";

import { useState, useTransition } from "react";
import { forkDeck } from "@/app/decks/actions";
import { Button } from "@/components/ui/button";

export function ForkButton({ deckId }: { deckId: string }) {
  const [linkBack, setLinkBack] = useState(true);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => forkDeck(deckId, linkBack))}
      >
        {pending ? "Copying…" : "Copy to my decks"}
      </Button>
      <label className="text-muted-foreground flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={linkBack}
          onChange={(e) => setLinkBack(e.target.checked)}
        />
        link back to original
      </label>
    </div>
  );
}
