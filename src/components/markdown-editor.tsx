"use client";

import { useState } from "react";
import { ArticleBody } from "@/components/articles/article-body";

/**
 * Split Markdown editor: a textarea on the left, live-rendered preview on the
 * right (stacks on small screens). The textarea keeps `name`, so it still
 * submits inside the parent <form>. Used for article bodies and deck primers.
 */
export function MarkdownEditor({
  name,
  defaultValue,
  rows = 14,
  placeholder,
}: {
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <textarea
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="border-border bg-background rounded-md border px-3 py-2 font-mono text-sm"
      />
      <div className="border-border bg-card min-h-24 overflow-auto rounded-md border px-3 py-2">
        {value.trim() ? (
          <ArticleBody body={value} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Preview appears here as you type…
          </p>
        )}
      </div>
    </div>
  );
}
