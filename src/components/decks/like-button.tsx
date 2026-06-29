"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleLike } from "@/app/decks/actions";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      className="block shrink-0"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

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

  // Identical markup for both states so size/spacing never shift; only the
  // color and the heart's fill change. tabular-nums keeps the count from
  // reflowing as the number grows.
  const inner = (
    <span className="inline-flex items-center gap-1.5 text-sm leading-none">
      <HeartIcon filled={liked} />
      <span className="tabular-nums">{count}</span>
    </span>
  );

  if (!canLike) {
    return <span className="text-muted-foreground">{inner}</span>;
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
      className={`transition-colors ${
        liked
          ? "text-destructive"
          : "text-muted-foreground hover:text-foreground"
      }`}
      aria-pressed={liked}
      aria-label={liked ? "Unlike deck" : "Like deck"}
    >
      {inner}
    </button>
  );
}
