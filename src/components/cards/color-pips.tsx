const COLOR_HEX: Record<string, string> = {
  W: "#f9faf4",
  U: "#9fd3e0",
  B: "#a69f9d",
  R: "#e5816a",
  G: "#8fc09a",
};
const ORDER = ["W", "U", "B", "R", "G"];

export function ColorPips({ identity }: { identity: string[] }) {
  if (!identity.length) {
    return <span className="text-muted-foreground text-xs">Colorless</span>;
  }
  const sorted = ORDER.filter((c) => identity.includes(c));
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {sorted.map((c) => (
        <span
          key={c}
          title={c}
          className="inline-block size-3.5 rounded-full border border-black/15"
          style={{ background: COLOR_HEX[c] }}
        />
      ))}
    </span>
  );
}
