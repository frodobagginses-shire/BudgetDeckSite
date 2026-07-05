"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { manapoolCardUrl } from "@/lib/affiliate";
import { formatUsd } from "@/lib/format";

interface CardData {
  name: string;
  image_normal: string | null;
  cheapest_price_usd: number | null;
}

// Shared across the sticky pane and the mobile lightbox so a card is only
// fetched once per session.
const cache = new Map<string, CardData | null>();

/** Fetch + cache a card's image/price by name. */
function useCardData(name: string | null) {
  const [data, setData] = useState<CardData | null>(
    name ? (cache.get(name) ?? null) : null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!name) {
      setData(null);
      return;
    }
    const cached = cache.get(name);
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
        cache.set(name, c);
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

  return { data, loading };
}

interface PreviewApi {
  /** Hover (desktop): update the sticky pane only. */
  hover: (name: string) => void;
  /** Tap/click: update the pane, and on small screens open the lightbox. */
  tap: (name: string) => void;
}

const PreviewCtx = createContext<PreviewApi>({ hover: () => {}, tap: () => {} });
const NameCtx = createContext<string | null>(null);

export function usePreview() {
  return useContext(PreviewCtx);
}

export function PreviewProvider({
  initialName,
  children,
}: {
  initialName: string | null;
  children: ReactNode;
}) {
  const [name, setName] = useState<string | null>(initialName);
  const [modalName, setModalName] = useState<string | null>(null);

  const api: PreviewApi = {
    hover: (n) => setName(n),
    tap: (n) => {
      setName(n);
      // Only pop the lightbox when the sticky pane isn't on screen (below lg).
      const isDesktop =
        typeof window !== "undefined" &&
        window.matchMedia("(min-width: 1024px)").matches;
      if (!isDesktop) setModalName(n);
    },
  };

  return (
    <PreviewCtx.Provider value={api}>
      <NameCtx.Provider value={name}>{children}</NameCtx.Provider>
      <CardLightbox name={modalName} onClose={() => setModalName(null)} />
    </PreviewCtx.Provider>
  );
}

/** Sticky preview (desktop): image of the most recently hovered card + buy link. */
export function DeckPreviewPane() {
  const name = useContext(NameCtx);
  const { data, loading } = useCardData(name);

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
            href={manapoolCardUrl(name)}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className="bg-brand-600 rounded-md px-3 py-2 text-center text-sm font-medium text-white hover:opacity-90"
          >
            Buy on Mana Pool
          </a>
        </div>
      )}
    </div>
  );
}

/** Mobile/narrow lightbox: full card image on tap, with price + buy link. */
function CardLightbox({
  name,
  onClose,
}: {
  name: string | null;
  onClose: () => void;
}) {
  const { data, loading } = useCardData(name);

  useEffect(() => {
    if (!name) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [name, onClose]);

  if (!name) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${name} preview`}
    >
      <div
        className="flex w-full max-w-xs flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-muted/40 overflow-hidden rounded-xl">
          {data?.image_normal ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.image_normal}
              alt={data.name}
              className="block w-full"
            />
          ) : (
            <div className="text-muted-foreground flex aspect-[488/680] items-center justify-center px-4 text-center text-sm text-white/80">
              {loading ? "Loading…" : name}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-white">
              {data?.name ?? name}
            </div>
            {data?.cheapest_price_usd != null && (
              <div className="text-xs text-white/70">
                cheapest from {formatUsd(data.cheapest_price_usd)}
              </div>
            )}
          </div>
          <a
            href={manapoolCardUrl(name)}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className="bg-brand-600 shrink-0 rounded-md px-3 py-2 text-center text-sm font-medium text-white hover:opacity-90"
          >
            Buy
          </a>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="self-center rounded-md px-3 py-1.5 text-sm font-medium text-white/80 hover:text-white"
        >
          Close
        </button>
      </div>
    </div>
  );
}
