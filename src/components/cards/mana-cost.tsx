/** Renders a mana-cost string like "{1}{B}" (or split "{1}{R} // {1}{U}") as a
 * row of Scryfall mana symbols. Inline styles keep sizing purge-proof. */
export function ManaCost({ cost }: { cost: string | null | undefined }) {
  if (!cost || !cost.trim()) return null;
  const faces = cost.split(" // ");
  return (
    <span className="inline-flex items-center gap-0.5 align-[-0.125em]">
      {faces.map((face, fi) => (
        <span key={fi} className="inline-flex items-center gap-0.5">
          {fi > 0 && <span className="text-muted-foreground mx-0.5">//</span>}
          {(face.match(/\{[^}]+\}/g) ?? []).map((tok, i) => {
            const code = tok.slice(1, -1).toUpperCase().replace(/\//g, "");
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={`https://svgs.scryfall.io/card-symbols/${code}.svg`}
                alt={tok}
                style={{
                  display: "inline-block",
                  height: "0.95em",
                  width: "0.95em",
                }}
              />
            );
          })}
        </span>
      ))}
    </span>
  );
}
