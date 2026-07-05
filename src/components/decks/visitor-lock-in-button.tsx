"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeVisitorLockIn, visitorLockIn } from "@/app/decks/actions";
import { Button } from "@/components/ui/button";

export function VisitorLockInButton({
  deckId,
  locked,
}: {
  deckId: string;
  locked: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const click = () =>
    startTransition(async () => {
      if (locked) await removeVisitorLockIn(deckId);
      else await visitorLockIn(deckId);
      router.refresh();
    });

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={click}>
      {pending
        ? "…"
        : locked
          ? "Locked in (remove)"
          : "Lock In to my profile"}
    </Button>
  );
}
