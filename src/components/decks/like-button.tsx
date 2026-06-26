"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleLike } from "@/app/decks/actions";

export function LikeButton({
  deckId,
  liked,
  count,
  canLike,
}: {
  deckId: string;
  liked: boolean;
  count: number;
  canLike: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!canLike) {
    return (
      <span className="text-muted-foreground text-sm">♥ {count}</span>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleLike(deckId);
          router.refresh();
        })
      }
      className={`text-sm ${
        liked ? "text-destructive" : "text-muted-foreground hover:text-foreground"
      }`}
      aria-pressed={liked}
    >
      {liked ? "♥" : "♡"} {count}
    </button>
  );
}
