"use client";

import { useCallback, useRef, useState } from "react";
import { FloatingPanel } from "@/components/ui/floating-panel";
import {
  exportFileBase,
  snapshotToCsv,
  snapshotToText,
} from "@/lib/snapshot-export";
import type { LockSnapshotCard } from "@/lib/types";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older Safari / non-secure contexts: fall back to a hidden textarea.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function download(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Export a frozen snapshot's decklist: copy or download as text, or a CSV
 * with every board and the prices recorded in the snapshot. */
export function SnapshotExportMenu({
  deckName,
  lockedAt,
  cards,
}: {
  deckName: string;
  lockedAt: string;
  cards: LockSnapshotCard[];
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const hasPrintings = cards.some((c) => c.set);
  const base = exportFileBase(deckName, lockedAt);

  const flash = (key: string) => {
    setDone(key);
    setTimeout(() => setDone((d) => (d === key ? null : d)), 1500);
  };

  const item =
    "hover:bg-muted flex w-full flex-col items-start px-3 py-2 text-left";
  const sub = "text-muted-foreground text-xs";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="border-border bg-card hover:bg-muted inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
        </svg>
        Export
      </button>
      <FloatingPanel
        anchorRef={triggerRef}
        open={open}
        onClose={close}
        width={256}
        align="start"
        sheet
        title="Export this snapshot"
      >
        <div className="py-1 text-sm">
          <button
            type="button"
            className={item}
            onClick={async () => {
              if (await copyText(snapshotToText(cards))) flash("text");
            }}
          >
            <span>{done === "text" ? "Copied!" : "Copy decklist"}</span>
            <span className={sub}>Main deck + sideboard, ready to import</span>
          </button>
          {hasPrintings && (
            <button
              type="button"
              className={item}
              onClick={async () => {
                if (await copyText(snapshotToText(cards, true)))
                  flash("printings");
              }}
            >
              <span>
                {done === "printings" ? "Copied!" : "Copy with printings"}
              </span>
              <span className={sub}>Adds set and collector number</span>
            </button>
          )}
          <div className="border-border my-1 border-t" />
          <button
            type="button"
            className={item}
            onClick={() => {
              download(
                `${base}.txt`,
                snapshotToText(cards, hasPrintings),
                "text/plain;charset=utf-8"
              );
              flash("txt");
            }}
          >
            <span>{done === "txt" ? "Downloaded" : "Download .txt"}</span>
            <span className={sub}>Decklist file</span>
          </button>
          <button
            type="button"
            className={item}
            onClick={() => {
              // BOM so Excel reads accented card names correctly.
              download(
                `${base}.csv`,
                "﻿" + snapshotToCsv(cards),
                "text/csv;charset=utf-8"
              );
              flash("csv");
            }}
          >
            <span>{done === "csv" ? "Downloaded" : "Download .csv"}</span>
            <span className={sub}>Every board, with snapshot prices</span>
          </button>
        </div>
      </FloatingPanel>
    </>
  );
}
