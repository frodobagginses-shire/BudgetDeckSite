"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importDeckList } from "@/app/decks/actions";
import { Button } from "@/components/ui/button";

export function BulkImport({ deckId }: { deckId: string }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{
    imported: number;
    unmatched: string[];
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = () =>
    startTransition(async () => {
      const res = await importDeckList(deckId, text);
      setResult(res);
      if (res.imported > 0) {
        setText("");
        router.refresh();
      }
    });

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        placeholder={"1 Force of Will\n13 Island\n1 Brainstorm"}
        className="border-border bg-background rounded-md border px-3 py-2 font-mono text-sm"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          disabled={pending || !text.trim()}
          onClick={run}
        >
          {pending ? "Importing…" : "Import list"}
        </Button>
        {result && (
          <span className="text-muted-foreground text-xs">
            Imported {result.imported} card{result.imported === 1 ? "" : "s"}
            {result.unmatched.length
              ? ` · not found: ${result.unmatched.join(", ")}`
              : "."}
          </span>
        )}
      </div>
    </div>
  );
}
