import Link from "next/link";

export interface LineageParent {
  id: string;
  name: string;
  handle: string | null;
}

export function DeckLineage({
  parent,
  forkCount,
}: {
  parent: LineageParent | null;
  forkCount: number;
}) {
  if (!parent && !forkCount) return null;
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
      {parent && (
        <span>
          Forked from{" "}
          <Link
            href={`/decks/${parent.id}`}
            className="hover:text-foreground underline"
          >
            {parent.name}
          </Link>
          {parent.handle ? ` by @${parent.handle}` : ""}
        </span>
      )}
      {forkCount > 0 && (
        <span>
          {parent ? "· " : ""}
          {forkCount} fork{forkCount === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}
