import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatUsd } from "@/lib/format";
import { GAME_FORMATS, type BrowseDeck } from "@/lib/types";

const SORTS = [
  { value: "recent", label: "Recently updated" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "likes", label: "Most liked" },
  { value: "name", label: "Name" },
];
const LIMIT = 24;

export const metadata = {
  title: "Browse budget decks — Budget Deck Site",
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
  const sort =
    typeof sp.sort === "string" && SORTS.some((s) => s.value === sp.sort)
      ? sp.sort
      : "recent";
  const page = Math.max(
    1,
    Number(typeof sp.page === "string" ? sp.page : "1") || 1
  );
  const offset = (page - 1) * LIMIT;

  const supabase = await createClient();
  const { data } = await supabase.rpc("browse_decks", {
    p_format: format || null,
    p_max_budget: maxBudget,
    p_sort: sort,
    p_limit: LIMIT,
    p_offset: offset,
  });
  const decks = (data ?? []) as BrowseDeck[];

  const makeUrl = (overrides: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    if (format) params.set("format", format);
    if (maxBudget != null) params.set("maxBudget", String(maxBudget));
    if (sort !== "recent") params.set("sort", sort);
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
            defaultValue={sort}
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
      </form>

      {decks.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No public decks match these filters yet.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {decks.map((d) => {
            const over =
              d.threshold_amount != null && d.budget_price > d.threshold_amount;
            return (
              <li key={d.id}>
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
          })}
        </ul>
      )}

      <div className="flex items-center justify-between text-sm">
        {page > 1 ? (
          <Link
            href={makeUrl({ page: page - 1 === 1 ? undefined : page - 1 })}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Prev
          </Link>
        ) : (
          <span />
        )}
        {decks.length === LIMIT ? (
          <Link
            href={makeUrl({ page: page + 1 })}
            className="text-muted-foreground hover:text-foreground"
          >
            Next →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </main>
  );
}
