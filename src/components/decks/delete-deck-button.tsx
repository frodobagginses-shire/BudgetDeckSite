"use client";

import { useState } from "react";

export function DeleteDeckButton({
  action,
}: {
  action: () => void | Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-muted-foreground hover:text-destructive text-xs"
      >
        Delete deck
      </button>
    );
  }

  return (
    <div className="border-destructive/30 bg-destructive/5 flex flex-wrap items-center gap-3 rounded-md border p-3 text-xs">
      <span className="text-foreground font-medium">
        Delete this deck permanently? This can&apos;t be undone.
      </span>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="border-border hover:bg-muted rounded-md border px-3 py-1.5"
        >
          Cancel
        </button>
        <form action={action}>
          <button
            type="submit"
            className="bg-destructive hover:bg-destructive/90 rounded-md px-3 py-1.5 font-medium text-white"
          >
            Yes, delete
          </button>
        </form>
      </div>
    </div>
  );
}
