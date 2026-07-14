"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  importDeckList,
  replaceDeckList,
  getDeckListText,
} from "@/app/decks/actions";
import { Button } from "@/components/ui/button";

type Tab = "import" | "edit";

export function BulkImport({ deckId }: { deckId: string }) {
  const [tab, setTab] = useState<Tab>("import");
  const [text, setText] = useState("");
  const [editText, setEditText] = useState<string | null>(null); // null = not loaded
  const [result, setResult] = useState<string | null>(null);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const switchTab = (t: Tab) => {
    setTab(t);
    setResult(null);
    setUnmatched([]);
    if (t === "edit" && editText === null) {
      startTransition(async () => {
        setEditText(await getDeckListText(deckId));
      });
    }
  };

  const runImport = () =>
    startTransition(async () => {
      const res = await importDeckList(deckId, text);
      setResult(
        `Imported ${res.imported} card${res.imported === 1 ? "" : "s"}.`
      );
      setUnmatched(res.unmatched);
      if (res.imported > 0) {
        setText("");
        setEditText(null); // stale now
        router.refresh();
      }
    });

  const runEdit = () =>
    startTransition(async () => {
      const res = await replaceDeckList(deckId, editText ?? "");
      setResult(
        `${res.added} added · ${res.updated} updated · ${res.removed} removed.`
      );
      setUnmatched(res.unmatched);
      if (res.added + res.updated + res.removed > 0) {
        setEditText(await getDeckListText(deckId)); // reload canonical text
        router.refresh();
      }
    });

  const tabBtn = (t: Tab, label: string) => (
    <button
      type="button"
      onClick={() => switchTab(t)}
      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
        tab === t
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-muted flex w-fit items-center gap-1 rounded-lg p-1">
        {tabBtn("import", "Import (add cards)")}
        {tabBtn("edit", "Bulk edit (replace)")}
      </div>

      {tab === "import" ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            placeholder={
              "4 Cranial Plating\n4 Vault Skirge\nSIDEBOARD:\n3 Duress"
            }
            className="border-border bg-background rounded-md border px-3 py-2 font-mono text-sm"
          />
          <p className="text-muted-foreground text-xs">
            Adds to what&apos;s already in the deck. Lines after
            &quot;SIDEBOARD:&quot; (or prefixed &quot;SB:&quot;) go to the
            sideboard.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" disabled={pending || !text.trim()} onClick={runImport}>
              {pending ? "Importing…" : "Import list"}
            </Button>
            {result && (
              <span className="text-muted-foreground text-xs">{result}</span>
            )}
          </div>
        </>
      ) : (
        <>
          <textarea
            value={editText ?? ""}
            onChange={(e) => setEditText(e.target.value)}
            rows={12}
            placeholder={pending && editText === null ? "Loading current list…" : ""}
            disabled={editText === null}
            className="border-border bg-background rounded-md border px-3 py-2 font-mono text-sm"
          />
          <p className="text-muted-foreground text-xs">
            Your current main deck + sideboard as text. Edit freely — on save,
            the deck is updated to match: quantities changed, missing cards
            removed, new cards added. Kept cards keep their printing and
            commander status.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              disabled={pending || editText === null || !editText.trim()}
              onClick={runEdit}
            >
              {pending ? "Saving…" : "Save changes"}
            </Button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () =>
                  setEditText(await getDeckListText(deckId))
                )
              }
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Reload current list
            </button>
            {result && (
              <span className="text-muted-foreground text-xs">{result}</span>
            )}
          </div>
        </>
      )}

      {unmatched.length > 0 && (
        <p className="text-destructive text-xs">
          Not found: {unmatched.join(", ")}
        </p>
      )}
    </div>
  );
}
