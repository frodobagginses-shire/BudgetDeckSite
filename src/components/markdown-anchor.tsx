"use client";

import { type ReactNode } from "react";
import { CardHover } from "@/components/cards/card-hover";

/** Renders Markdown links. `card:Name` links become interactive card chips
 * (hover → image, click → modal with buy button); everything else is a normal
 * link. Wired in via ReactMarkdown's `components={{ a: MarkdownAnchor }}`. */
export function MarkdownAnchor({
  href,
  children,
}: {
  href?: string;
  children?: ReactNode;
}) {
  const url = href ?? "";
  if (!url.startsWith("card:")) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand-600 underline"
      >
        {children}
      </a>
    );
  }
  const name = decodeURIComponent(url.slice("card:".length));
  return (
    <CardHover
      name={name}
      className="text-brand-600 underline decoration-dotted underline-offset-2"
    >
      {children}
    </CardHover>
  );
}
