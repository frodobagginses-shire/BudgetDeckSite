import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatUsd } from "@/lib/format";
import { GAME_FORMATS, type BrowseDeck } from "@/lib/types";

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "recent", label: "Recently updated" },
  { value: "locked", label: "Recently locked in" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "likes", label: "Most liked" },
  { value: "views", label: "Most viewed" },
  { value: "name", label: "Name" },
];
const LIMIT = 24;
// The grouped landing pulls a bigger page since it spans every format.
const GROUPED_LIMIT = 60;

export const metadata = {
  title: "Browse budget decks | Budget Deck Site",
  description:
    "Find Magic decks under a price cap. Filter by format and max budget, sort by price.",
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const format = typeof sp.format === "string" && sp.format ? sp.format : "";
  const maxBudgetRaw = typeof sp.maxBudget === "string" ? sp.maxBudget : "";
  const maxBudget =
    maxBudgetRaw && !Number.isNaN(Number(maxBudgetRaw))
      ? Number(maxBudgetRaw)
      : null;
  const sortParam =
    typeof sp.sort === "string" && SORTS.some((s) => s.value === sp.sort)
      ? sp.sort
      : "";
  const sort = sortParam || "recent";
  const page = Math.max(
    1,
    Number(typeof sp.page === "string" ? sp.page : "1") || 1
  );

  // No filters, no sort, first page → the organized landing view: decks
  // grouped under format headers with budget-cap subheaders.
  const grouped = !format && !sortParam && maxBudget == null && page === 1;
  const offset = (page - 1) * LIMIT;

  const supabase = await createClient();
  const { data } = await supabase.rpc("browse_decks", {
    p_format: format || null,
    p_max_budget: maxBudget,
    p_sort: sort,
    p_limit: grouped ? GROUPED_LIMIT : LIMIT,
    p_offset: grouped ? 0 : offset,
  });
  const decks = (data ?? []) as BrowseDeck[];

  const makeUrl = (overrides: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    if (format) params.set("format", format);
    if (maxBudget != null) params.set("maxBudget", String(maxBudget));
    if (sortParam) params.set("sort", sortParam);
    if (page !== 1) params.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, String(v));
    }
    const qs = params.toString();
    return `/browse${qs ? `?${qs}` : ""}`;
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Browse budget decks</h1>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Format</span>
          <select
            name="format"
            defaultValue={format}
            className="border-border bg-background rounded-md border px-2 py-2 capitalize"
          >
            <option value="">All formats</option>
            {GAME_FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-32 flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Max budget $</span>
          <input
            name="maxBudget"
            type="number"
            step="0.01"
            min="0"
            defaultValue={maxBudgetRaw}
            placeholder="15"
            className="border-border bg-background rounded-md border px-2 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Sort</span>
          <select
            name="sort"
            defaultValue={sortParam || "recent"}
            className="border-border bg-background rounded-md border px-2 py-2"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium hover:opacity-90"
        >
          Apply
        </button>
        {!grouped && (
          <Link
            href="/browse"
            className="text-muted-foreground hover:text-foreground pb-2 text-xs"
          >
            Clear
          </Link>
        )}
      </form>

      {decks.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No public decks match these filters yet.
        </p>
      ) : grouped ? (
        <GroupedDecks decks={decks} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {decks.map((d) => (
            <DeckCard key={d.id} deck={d} showLock={sort === "locked"} />
          ))}
        </ul>
      )}

      {!grouped && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={makeUrl({ page: page - 1 === 1 ? undefined : page - 1 })}
              className="text-muted-foreground hover:text-foreground"
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          {decks.length === LIMIT ? (
            <Link
              href={makeUrl({ page: page + 1 })}
              className="text-muted-foreground hover:text-foreground"
            >
              Next
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </main>
  );
}

/** Landing view: format headers, budget-cap subheaders, newest-updated first
 * within each bucket (the query already sorts by updated_at). */
function GroupedDecks({ decks }: { decks: BrowseDeck[] }) {
  const formats = GAME_FORMATS.filter((f) =>
    decks.some((d) => d.game_format === f)
  );
  // Formats outside the known list (defensive) go last.
  const other = [...new Set(decks.map((d) => d.game_format))].filter(
    (f) => !(GAME_FORMATS as readonly string[]).includes(f)
  );

  return (
    <div className="flex flex-col gap-8">
      {[...formats, ...other].map((f) => {
        const inFormat = decks.filter((d) => d.game_format === f);
        // Subgroup by budget cap, ascending; uncapped last.
        const caps = [
          ...new Set(inFormat.map((d) => d.threshold_amount)),
        ].sort((a, b) => {
          if (a == null) return 1;
          if (b == null) return -1;
          return a - b;
        });
        return (
          <section key={f} className="flex flex-col gap-4">
            <h2 className="border-border border-b pb-1 text-lg font-semibold capitalize">
              {f}
              <Link
                href={`/browse?format=${encodeURIComponent(f)}`}
                className="text-muted-foreground hover:text-foreground ml-3 text-xs font-normal normal-case"
              >
                view all →
              </Link>
            </h2>
            {caps.map((cap) => {
              const bucket = inFormat.filter(
                (d) => d.threshold_amount === cap
              );
              return (
                <div key={cap ?? "none"} className="flex flex-col gap-2">
                  <h3 className="text-muted-foreground text-sm font-medium">
                    {cap != null ? `${formatUsd(cap)} budget` : "No price cap"}
                  </h3>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {bucket.map((d) => (
                      <DeckCard key={d.id} deck={d} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

function DeckCard({
  deck: d,
  showLock = false,
}: {
  deck: BrowseDeck;
  showLock?: boolean;
}) {
  const over =
    d.threshold_amount != null && d.budget_price > d.threshold_amount;
  return (
    <li>
      <Link
        href={`/decks/${d.id}`}
        className="border-border bg-card block rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold">{d.name}</span>
          <span className="shrink-0 text-lg font-bold">
            {formatUsd(d.budget_price)}
          </span>
        </div>
        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 text-xs capitalize">
          <span>{d.game_format}</span>
          {d.owner_handle && <span>· @{d.owner_handle}</span>}
          <span>· {d.card_count} cards</span>
          <span>· ♥ {d.like_count}</span>
          <span>· {d.view_count.toLocaleString()} views</span>
          {showLock && d.last_locked_at && (
            <span>
              · locked{" "}
              {new Date(d.last_locked_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
          {d.threshold_amount != null && (
            <span
              className={`rounded-full px-2 py-0.5 ${
                over
                  ? "bg-destructive/10 text-destructive"
                  : "bg-brand-50 text-brand-700"
              }`}
            >
              {over
                ? `over ${formatUsd(d.threshold_amount)}`
                : `under ${formatUsd(d.threshold_amount)}`}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}
