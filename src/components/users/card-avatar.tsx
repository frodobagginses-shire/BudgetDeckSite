/** Circle avatar rendered from card art + a stored transform (focal point %
 * and zoom). Pure CSS — same approach as the deck banner reposition. */
export function CardAvatar({
  artUrl,
  x = 50,
  y = 50,
  zoom = 1,
  fallback,
  className = "size-16",
}: {
  artUrl: string | null;
  x?: number;
  y?: number;
  zoom?: number;
  /** Shown when there's no art (first letter is used). */
  fallback?: string;
  className?: string;
}) {
  return (
    <div
      className={`border-border bg-muted relative shrink-0 overflow-hidden rounded-full border ${className}`}
    >
      {artUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={artUrl}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            objectPosition: `${x}% ${y}%`,
            transform: `scale(${zoom})`,
            transformOrigin: `${x}% ${y}%`,
          }}
        />
      ) : (
        <div className="text-muted-foreground flex h-full w-full items-center justify-center text-lg font-semibold uppercase">
          {(fallback ?? "?").slice(0, 1)}
        </div>
      )}
    </div>
  );
}
