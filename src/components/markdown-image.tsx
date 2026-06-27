import type { ComponentProps } from "react";

/** Custom image renderer for article/primer Markdown.
 * - `mana:CODE` → an inline MTG mana symbol (Scryfall symbol SVG), sized to the
 *   surrounding text. CODE is the brace token uppercased with slashes removed,
 *   e.g. {W} → W, {3} → 3, {T} → T, {W/U} → WU, {W/P} → WP.
 * - anything else → a normal block content image. */
export function MarkdownImage({ src, alt }: ComponentProps<"img">) {
  const url = typeof src === "string" ? src : "";

  if (url.startsWith("mana:")) {
    const code = url.slice("mana:".length);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://svgs.scryfall.io/card-symbols/${code}.svg`}
        alt={alt ?? code}
        className="mx-[0.05em] inline-block h-[1em] w-[1em] align-[-0.125em]"
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={url}
      alt={alt ?? ""}
      className="border-border mx-auto my-4 max-h-[26rem] w-auto rounded-xl border"
    />
  );
}
