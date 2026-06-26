"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFollow } from "@/app/users/actions";
import { Button } from "@/components/ui/button";

export function FollowButton({
  userId,
  following,
}: {
  userId: string;
  following: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant={following ? "outline" : "default"}
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleFollow(userId);
          router.refresh();
        })
      }
    >
      {pending ? "…" : following ? "Following" : "Follow"}
    </Button>
  );
}
