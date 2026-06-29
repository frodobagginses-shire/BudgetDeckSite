"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleLike } from "@/app/decks/actions";

// Shared layout with ViewCount so the icon + number sit at identical heights.
const STAT_LAYOUT = "inline-flex items-center gap-1.5 text-sm leading-none";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      className="block shrink-0"
      // Optical nudge: a heart's mass sits in the top lobes, so a geometrically
      // centered path still reads ~1px high next to the eye. Push it down.
      style={{ transform: "translateY(1px)" }}
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
  const [, startTransition] = useTransition();
  const router = useRouter();

  // Optimistic local state so the click registers instantly; the server save
  // and refresh happen in the background and reconcile this afterward.
  const [state, setState] = useState({ liked, count });
  useEffect(() => setState({ liked, count }), [liked, count]);

  const content = (
    <>
      <HeartIcon filled={state.liked} />
      <span className="tabular-nums">{state.count}</span>
    </>
  );

  if (!canLike) {
    return (
      <span className={`${STAT_LAYOUT} text-muted-foreground`}>{content}</span>
    );
  }

  const onClick = () => {
    setState((s) => ({
      liked: !s.liked,
      count: s.count + (s.liked ? -1 : 1),
    }));
    startTransition(async () => {
      await toggleLike(deckId);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${STAT_LAYOUT} cursor-pointer transition-transform hover:scale-110 active:scale-95 ${
        state.liked
          ? "text-destructive hover:opacity-80"
          : "text-muted-foreground hover:text-destructive"
      }`}
      aria-pressed={state.liked}
      aria-label={state.liked ? "Unlike deck" : "Like deck"}
    >
      {content}
    </button>
  );
}
