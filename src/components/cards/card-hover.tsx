"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { manapoolCardUrl } from "@/lib/affiliate";
import { formatUsd } from "@/lib/format";

interface CardData {
  name: string;
  image_normal: string | null;
  image_small: string | null;
  cheapest_price_usd: number | null;
}

/**
 * Card name with a live image preview on hover. Clicking pins the preview into
 * a floating menu (image + price + buy button) that stays until you click away.
 * Lazily fetches /api/cards/by-name. Reused by article/primer [[card]] links
 * and deck card lists.
 */
export function CardHover({
  name,
  children,
  className,
}: {
  name: string;
  children?: ReactNode;
  className?: string;
}) {
  const [data, setData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

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

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const show = hover || open;

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        className={className ?? "text-left hover:underline"}
        onMouseEnter={() => {
          setHover(true);
          void ensure();
        }}
        onMouseLeave={() => setHover(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
          void ensure();
        }}
      >
        {children ?? name}
      </button>

      {show && (
        <span
          className={`absolute bottom-full left-0 z-50 mb-1 block w-48 ${
            open ? "" : "pointer-events-none"
          }`}
        >
          <span className="border-border bg-card block overflow-hidden rounded-xl border shadow-xl">
            {data?.image_normal ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.image_normal} alt={name} className="block w-full" />
            ) : (
              <span className="text-muted-foreground block px-3 py-8 text-center text-xs">
                {loading ? "Loading…" : name}
              </span>
            )}
            {open && (
              <span className="flex flex-col gap-2 p-3">
                {data?.cheapest_price_usd != null && (
                  <span className="text-muted-foreground text-xs">
                    cheapest from {formatUsd(data.cheapest_price_usd)}
                  </span>
                )}
                <a
                  href={manapoolCardUrl(name)}
                  target="_blank"
                  rel="noopener noreferrer nofollow sponsored"
                  className="bg-brand-600 rounded-md px-3 py-1.5 text-center text-xs font-medium text-white hover:opacity-90"
                >
                  Buy on Mana Pool
                </a>
              </span>
            )}
          </span>
        </span>
      )}
    </span>
  );
}
