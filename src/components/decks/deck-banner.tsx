"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBanner, setBannerPosition } from "@/app/decks/actions";

export function DeckBanner({
  deckId,
  imageUrl,
  canEdit,
  choices,
  currentBannerId,
  posX,
  posY,
}: {
  deckId: string;
  imageUrl: string | null;
  canEdit: boolean;
  choices: { scryfall_id: string; name: string }[];
  currentBannerId: string | null;
  posX: number;
  posY: number;
}) {
  const [, startTransition] = useTransition();
  const router = useRouter();
  const [pos, setPos] = useState({ x: posX, y: posY });
  const posRef = useRef({ x: posX, y: posY });
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    sx: number;
    sy: number;
    spx: number;
    spy: number;
    w: number;
    h: number;
  } | null>(null);

  const apply = (x: number, y: number) => {
    const c = (n: number) => Math.max(0, Math.min(100, n));
    const v = { x: c(x), y: c(y) };
    posRef.current = v;
    setPos(v);
  };
  const change = (val: string) =>
    startTransition(async () => {
      await setBanner(deckId, val);
      router.refresh();
    });
  const persist = () =>
    startTransition(() =>
      setBannerPosition(deckId, posRef.current.x, posRef.current.y)
    );

  const onDown = (e: React.MouseEvent) => {
    if (!canEdit || !imageUrl || !boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    drag.current = {
      sx: e.clientX,
      sy: e.clientY,
      spx: posRef.current.x,
      spy: posRef.current.y,
      w: rect.width,
      h: rect.height,
    };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = drag.current;
      if (!d) return;
      apply(
        d.spx - ((e.clientX - d.sx) / d.w) * 100,
        d.spy - ((e.clientY - d.sy) / d.h) * 100
      );
    };
    const onUp = () => {
      if (drag.current) {
        drag.current = null;
        persist();
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-32 w-full sm:h-44">
      <div
        ref={boxRef}
        onMouseDown={onDown}
        className={`border-border bg-muted absolute inset-0 overflow-hidden rounded-xl border ${
          canEdit && imageUrl ? "cursor-move select-none" : ""
        }`}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
          />
        ) : (
          <div className="from-brand-400/40 to-brand-700/30 absolute inset-0 bg-gradient-to-br" />
        )}
      </div>

      {canEdit && (
        <details className="absolute right-2 top-2 z-20">
          <summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full bg-black/45 text-sm text-white hover:bg-black/65">
            ✎
          </summary>
          <div className="border-border bg-card absolute right-0 mt-1 flex w-72 flex-col gap-3 rounded-md border p-4 shadow-xl">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs font-medium">
                Banner card
              </label>
              <select
                defaultValue={currentBannerId ?? ""}
                onChange={(e) => change(e.target.value)}
                className="border-border bg-background w-full rounded-md border px-2 py-1.5 text-sm"
              >
                <option value="">Auto (commander / most popular)</option>
                {choices.map((c) => (
                  <option key={c.scryfall_id} value={c.scryfall_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {imageUrl && (
              <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="5 9 2 12 5 15" />
                    <polyline points="9 5 12 2 15 5" />
                    <polyline points="15 19 12 22 9 19" />
                    <polyline points="19 9 22 12 19 15" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <line x1="12" y1="2" x2="12" y2="22" />
                  </svg>
                  Drag the banner to reposition
                </span>
                <button
                  type="button"
                  onClick={() => {
                    apply(50, 50);
                    persist();
                  }}
                  className="hover:text-foreground underline"
                >
                  Recenter
                </button>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
