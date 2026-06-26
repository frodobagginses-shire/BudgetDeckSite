"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { lockInDeck } from "@/app/decks/actions";
import { Button } from "@/components/ui/button";

export function LockInButton({ deckId }: { deckId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await lockInDeck(deckId);
          router.refresh();
        })
      }
    >
      {pending ? "Locking in…" : "Lock In price"}
    </Button>
  );
}
