"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { tcgplayerCardUrl } from "@/lib/affiliate";
import { formatUsd } from "@/lib/format";

interface CardData {
  name: string;
  image_normal: string | null;
  cheapest_price_usd: number | null;
}

const SetPreviewCtx = createContext<(name: string) => void>(() => {});
const NameCtx = createContext<string | null>(null);

/** Call setPreview(name) on hover/tap to drive the right-rail preview pane. */
export function usePreview() {
  return useContext(SetPreviewCtx);
}

export function PreviewProvider({
  initialName,
  children,
}: {
  initialName: string | null;
  children: ReactNode;
}) {
  const [name, setName] = useState<string | null>(initialName);
  return (
    <SetPreviewCtx.Provider value={setName}>
      <NameCtx.Provider value={name}>{children}</NameCtx.Provider>
    </SetPreviewCtx.Provider>
  );
}

/** Sticky preview: image of the most recently hovered card + a persistent buy link. */
export function DeckPreviewPane() {
  const name = useContext(NameCtx);
  const [data, setData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(false);
  const cache = useRef<Map<string, CardData | null>>(new Map());

  useEffect(() => {
    if (!name) {
      setData(null);
      return;
    }
    const cached = cache.current.get(name);
    if (cached !== undefined) {
      setData(cached);
      return;
    }
    let active = true;
    setLoading(true);
    fetch(`/api/cards/by-name?name=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((j) => {
        const c = (j.card as CardData | null) ?? null;
        cache.current.set(name, c);
        if (active) setData(c);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [name]);

  return (
    <div className="sticky top-20 flex flex-col gap-3">
      <div className="border-border bg-muted overflow-hidden rounded-xl border">
        {data?.image_normal ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.image_normal}
            alt={data.name}
            className="block w-full"
          />
        ) : (
          <div className="text-muted-foreground flex aspect-[488/680] items-center justify-center px-4 text-center text-xs">
            {loading ? "Loading…" : (name ?? "Hover a card to preview")}
          </div>
        )}
      </div>

      {name && (
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium">{data?.name ?? name}</div>
          {data?.cheapest_price_usd != null && (
            <div className="text-muted-foreground text-xs">
              cheapest from {formatUsd(data.cheapest_price_usd)}
            </div>
          )}
          <a
            href={tcgplayerCardUrl(name)}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className="bg-brand-600 rounded-md px-3 py-2 text-center text-sm font-medium text-white hover:opacity-90"
          >
            Buy on TCGplayer
          </a>
        </div>
      )}
    </div>
  );
}
