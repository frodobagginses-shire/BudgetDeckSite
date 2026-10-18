"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

const MARGIN = 8; // keep this far from the viewport edges
const GAP = 4; // space between the trigger and the panel
const MOBILE_QUERY = "(max-width: 639px)";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

/**
 * A dropdown panel rendered in a portal on <body> with fixed positioning, so
 * it is never clipped or split by its surroundings (the deck list is a CSS
 * multi-column layout, which Safari clips popups at the bottom of a column).
 *
 * Desktop: anchored under the trigger, flipped above it when there isn't room
 * below, height capped to the viewport with its own scrollbar.
 * Mobile (`sheet`): a bottom sheet over a dimmed backdrop.
 *
 * Closes on outside pointer down, Escape, and (sheet) backdrop tap.
 */
export function FloatingPanel({
  anchorRef,
  open,
  onClose,
  children,
  width = 224,
  align = "end",
  sheet = false,
  title,
  label,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Panel width in px on desktop. */
  width?: number;
  /** Which trigger edge the panel lines up with. */
  align?: "start" | "end";
  /** Use a bottom sheet on small screens. */
  sheet?: boolean;
  /** Heading shown at the top of the mobile sheet. */
  title?: string;
  /** Accessible name for the panel. */
  label?: string;
}) {
  const isMobile = useIsMobile();
  const asSheet = sheet && isMobile;
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    maxHeight: number;
  } | null>(null);

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const a = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(width, vw - MARGIN * 2);
    // Natural height (content + borders), regardless of the current cap.
    const natural =
      panel.scrollHeight + (panel.offsetHeight - panel.clientHeight);
    const below = vh - a.bottom - GAP - MARGIN;
    const above = a.top - GAP - MARGIN;
    const openBelow = natural <= below || below >= above;
    const room = Math.max(120, openBelow ? below : above);
    const h = Math.min(natural, room);
    const top = openBelow
      ? Math.min(a.bottom + GAP, vh - MARGIN - h)
      : Math.max(MARGIN, a.top - GAP - h);
    const rawLeft = align === "end" ? a.right - w : a.left;
    const left = Math.min(Math.max(MARGIN, rawLeft), vw - MARGIN - w);
    setPos({ top, left, maxHeight: room });
  }, [anchorRef, width, align]);

  // Position before paint, and again whenever the content changes size
  // (expanding sections, async lists) or the page moves.
  useLayoutEffect(() => {
    if (!open || asSheet) return;
    place();
    const panel = panelRef.current;
    const ro = new ResizeObserver(() => place());
    if (panel?.firstElementChild) ro.observe(panel.firstElementChild);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, asSheet, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      // The sheet closes via its backdrop's click instead: closing on
      // pointerdown would let the same tap land on whatever is underneath.
      if (asSheet) return;
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return; // trigger toggles itself
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        anchorRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef, asSheet]);

  // Lock page scroll behind the mobile sheet.
  useEffect(() => {
    if (!open || !asSheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, asSheet]);

  if (!open || typeof document === "undefined") return null;

  if (asSheet) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex flex-col justify-end">
        <div
          className="absolute inset-0 bg-black/40"
          aria-hidden="true"
          onClick={onClose}
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={label ?? title}
          className="bg-card animate-in slide-in-from-bottom-4 relative max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-2xl pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl"
        >
          <div className="bg-card sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-4 py-3">
            <span className="min-w-0 truncate text-sm font-semibold">
              {title}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground -mr-2 rounded-md px-2 py-1 text-sm"
            >
              Close
            </button>
          </div>
          <div className="text-base [&_button]:min-h-11">{children}</div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={label ?? title}
      style={{
        position: "fixed",
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: `min(${width}px, calc(100vw - ${MARGIN * 2}px))`,
        maxHeight: pos?.maxHeight,
        visibility: pos ? "visible" : "hidden",
      }}
      className="border-border bg-card z-[100] overflow-y-auto overscroll-contain rounded-md border shadow-lg"
    >
      <div>{children}</div>
    </div>,
    document.body
  );
}
