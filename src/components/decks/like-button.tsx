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
      className="shrink-0"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
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
