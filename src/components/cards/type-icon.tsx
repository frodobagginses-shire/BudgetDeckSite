import type { ReactElement } from "react";

/** Monochromatic card-type glyphs (inherit currentColor). Inline SVG so there's
 * no font/dependency, and they stay crisp at ~1em. Keyed by the type buckets
 * from getTypeBucket(). */
const GLYPH: Record<string, ReactElement> = {
  Creature: (
    <g fill="currentColor">
      <circle cx="6.5" cy="10" r="2" />
      <circle cx="10" cy="6.5" r="2" />
      <circle cx="14" cy="6.5" r="2" />
      <circle cx="17.5" cy="10" r="2" />
      <path d="M12 11.5c-2.8 0-4.7 2.1-4.7 4.3 0 1.6 1.3 2.7 2.8 2.7.9 0 1.3-.4 1.9-.4s1 .4 1.9.4c1.5 0 2.8-1.1 2.8-2.7 0-2.2-1.9-4.3-4.7-4.3z" />
    </g>
  ),
  Instant: <path fill="currentColor" d="M13 2 4 14h6l-1 8 9-12h-6z" />,
  Sorcery: (
    <path
      fill="currentColor"
      d="M12 2c.6 5 4 8.4 9 9-5 .6-8.4 4-9 9-.6-5-4-8.4-9-9 5-.6 8.4-4 9-9z"
    />
  ),
  Artifact: <path fill="currentColor" d="M6 3h12l3 5-9 13L3 8z" />,
  Enchantment: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.2 5.2 7 7M17 17l1.8 1.8M18.8 5.2 17 7M7 17l-1.8 1.8" />
    </g>
  ),
  Land: <path fill="currentColor" d="M3 20l6-11 3.5 6 2-3L21 20z" />,
  Planeswalker: (
    <path
      fill="currentColor"
      d="M12 2l2.9 6.2 6.6.6-5 4.4 1.5 6.4L12 17.8 6 20.3l1.5-6.4-5-4.4 6.6-.6z"
    />
  ),
  Battle: (
    <path
      fill="currentColor"
      d="M12 2l8 3v6c0 5-3.5 8.6-8 11-4.5-2.4-8-6-8-11V5z"
    />
  ),
  Other: (
    <rect
      x="5"
      y="3.5"
      width="14"
      height="17"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  ),
};

export function TypeIcon({ type }: { type: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ display: "inline-block", height: "1em", width: "1em" }}
    >
      {GLYPH[type] ?? GLYPH.Other}
    </svg>
  );
}
