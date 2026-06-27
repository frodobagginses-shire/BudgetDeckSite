"use client";

import { useState } from "react";

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="border-border hover:bg-muted rounded-md border px-3 py-2 text-sm whitespace-nowrap"
    >
      {copied ? "Link copied ✓" : "Share"}
    </button>
  );
}
