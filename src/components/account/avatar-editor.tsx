"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getCardArt, updateAvatar } from "@/app/account/actions";
import { useCardSearch } from "@/lib/use-card-search";
import { CardAvatar } from "@/components/users/card-avatar";

interface AvatarState {
  cardId: string;
  artUrl: string;
  cardName: string | null;
}

/** Pick a card, then drag the art and zoom to frame it inside the circle. */
export function AvatarEditor({
  handle,
  initial,
  initialX,
  initialY,
  initialZoom,
}: {
  handle: string;
  initial: AvatarState | null;
  initialX: number;
  initialY: number;
  initialZoom: number;
}) {
  const [card, setCard] = useState<AvatarState | null>(initial);
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [zoom, setZoom] = useState(initialZoom);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { q, setQ, results, open, reset } = useCardSearch(8);

  const circleRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(pos);
  const drag = useRef<{ sx: number; sy: number; spx: number; spy: number; w: number } | null>(null);
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const apply = (x: number, y: number) => {
    const c = (n: number) => Math.max(0, Math.min(100, n));
    const v = { x: c(x), y: c(y) };
    posRef.current = v;
    setPos(v);
  };

  const onDown = (e: React.MouseEvent) => {
    if (!card || !circleRef.current) return;
    drag.current = {
      sx: e.clientX,
      sy: e.clientY,
      spx: posRef.current.x,
      spy: posRef.current.y,
      w: circleRef.current.getBoundingClientRect().width,
    };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = drag.current;
      if (!d) return;
      // Dragging the art moves the focal point the opposite way; higher zoom
      // means the same pixel drag covers less of the art.
      const k = 100 / (d.w * zoomRef.current);
      apply(d.spx - (e.clientX - d.sx) * k, d.spy - (e.clientY - d.sy) * k);
    };
    const onUp = () => {
      drag.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const pick = (oracleId: string) =>
    start(async () => {
      const art = await getCardArt(oracleId);
      reset();
      if (!art) {
        setMsg({ ok: false, text: "No art available for that card." });
        return;
      }
      setMsg(null);
      setCard({ cardId: art.scryfallId, artUrl: art.artUrl, cardName: art.name });
      apply(50, 50);
      setZoom(1);
    });

  const save = () =>
    start(async () => {
      const res = await updateAvatar(
        card?.cardId ?? null,
        posRef.current.x,
        posRef.current.y,
        zoomRef.current
      );
      setMsg(
        res.ok
          ? { ok: true, text: "Saved." }
          : { ok: false, text: res.message ?? "Couldn't save." }
      );
      if (res.ok) router.refresh();
    });

  const remove = () =>
    start(async () => {
      const res = await updateAvatar(null, 50, 50, 1);
      if (res.ok) {
        setCard(null);
        apply(50, 50);
        setZoom(1);
        setMsg({ ok: true, text: "Removed." });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.message ?? "Couldn't remove." });
      }
    });

  return (
    <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-5">
      <span className="text-sm font-medium">Profile picture</span>

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex flex-col items-center gap-2">
          <div
            ref={circleRef}
            onMouseDown={onDown}
            className={`size-32 ${card ? "cursor-move select-none" : ""}`}
          >
            <CardAvatar
              artUrl={card?.artUrl ?? null}
              x={pos.x}
              y={pos.y}
              zoom={zoom}
              fallback={handle}
              className="size-32"
            />
          </div>
          {card && (
            <span className="text-muted-foreground text-xs">
              Drag to reposition
            </span>
          )}
        </div>

        <div className="flex min-w-56 flex-1 flex-col gap-3">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search a card…"
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
            />
            {open && results.length > 0 && (
              <ul className="border-border bg-card absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border shadow-lg">
                {results.map((r) => (
                  <li key={r.oracle_id}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => pick(r.oracle_id)}
                      className="hover:bg-muted block w-full px-3 py-2 text-left text-sm disabled:opacity-50"
                    >
                      {r.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {card && (
            <>
              <span className="text-muted-foreground truncate text-xs">
                {card.cardName}
              </span>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground text-xs">Zoom</span>
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1"
                />
              </label>
            </>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={pending || !card}
              className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save picture"}
            </button>
            {(card || initial) && (
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className="text-muted-foreground hover:text-destructive text-sm"
              >
                Remove
              </button>
            )}
            {msg && (
              <span
                className={`text-sm ${
                  msg.ok ? "text-brand-600" : "text-destructive"
                }`}
              >
                {msg.text}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
