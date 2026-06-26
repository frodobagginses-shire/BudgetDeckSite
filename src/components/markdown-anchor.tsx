"use client";

import { useCallback, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { tcgplayerCardUrl } from "@/lib/affiliate";
import { formatUsd } from "@/lib/format";

interface CardData {
  name: string;
  image_normal: string | null;
  image_small: string | null;
  cheapest_price_usd: number | null;
}

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
  return <CardLink name={name}>{children}</CardLink>;
}

function CardLink({ name, children }: { name: string; children: ReactNode }) {
  const [data, setData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);

  const ensure = useCallback(async () => {
    if (data || loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/cards/by-name?name=${encodeURIComponent(name)}`
      );
      const json = await res.json();
      setData((json.card as CardData | null) ?? null);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [data, loading, name]);

  return (
    <span className="relative inline-block">
      <button
        type="button"
        className="text-brand-600 underline decoration-dotted underline-offset-2"
        onMouseEnter={() => {
          setHover(true);
          void ensure();
        }}
        onMouseLeave={() => setHover(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
          void ensure();
        }}
      >
        {children}
      </button>

      {hover && data?.image_normal && (
        <span className="pointer-events-none absolute bottom-full left-0 z-50 mb-1 block w-44">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.image_normal}
            alt={name}
            className="rounded-xl shadow-xl"
          />
        </span>
      )}

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
            onClick={() => setOpen(false)}
          >
            <div
              className="border-border bg-card flex w-full max-w-xs flex-col items-center gap-3 rounded-xl border p-4"
              onClick={(e) => e.stopPropagation()}
            >
              {data?.image_normal ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.image_normal}
                  alt={name}
                  className="w-full rounded-xl"
                />
              ) : (
                <div className="text-muted-foreground py-8 text-sm">
                  {loading ? "Loading…" : "No image found"}
                </div>
              )}
              <div className="text-center font-semibold">{name}</div>
              {data?.cheapest_price_usd != null && (
                <div className="text-muted-foreground text-sm">
                  from {formatUsd(data.cheapest_price_usd)}
                </div>
              )}
              <a
                href={tcgplayerCardUrl(name)}
                target="_blank"
                rel="noopener noreferrer nofollow sponsored"
                className="bg-brand-600 w-full rounded-md px-4 py-2 text-center text-sm font-medium text-white hover:opacity-90"
              >
                Buy on TCGplayer
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Close
              </button>
            </div>
          </div>,
          document.body
        )}
    </span>
  );
}
