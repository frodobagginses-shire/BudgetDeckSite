import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

const FORMATS = [
  {
    name: "$15 Commander",
    note: "Singleton Commander built to a $15 cap.",
    href: "/articles/15-commander",
  },
  {
    name: "$30 Value Vintage",
    note: "Vintage's banlist on a $30 budget.",
    href: "/articles/30-value-vintage",
  },
  {
    name: "$50 Modern",
    note: "The Modern card pool, capped at $50.",
    href: "/articles/50-modern",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: featured } = await supabase
    .from("articles")
    .select("slug, title, excerpt, featured_cards")
    .eq("is_featured", true)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const featuredThumb = featured?.featured_cards?.[0]
    ? `https://api.scryfall.com/cards/named?format=image&version=art_crop&exact=${encodeURIComponent(
        featured.featured_cards[0] as string
      )}`
    : null;

  return (
    <main className="from-brand-50 to-background flex flex-1 flex-col items-center justify-center gap-12 bg-gradient-to-b px-6 py-20">
      <section className="flex max-w-2xl flex-col items-center gap-6 text-center">
        <span className="border-brand-100 bg-brand-50 text-brand-700 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium">
          <span className="bg-brand-500 size-2 rounded-full" />
          Budget Deck Site
        </span>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Build Magic decks to a{" "}
          <span className="text-brand-600">price you set</span>.
        </h1>

        <p className="text-muted-foreground text-lg text-balance">
          Validate every list on the cheapest printing, bling it out with the
          printings you love, and{" "}
          <span className="text-foreground font-semibold">Lock In</span> a
          timestamped price you can prove later.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/decks/new">
            <Button size="lg">Start a deck</Button>
          </Link>
          <Link href="/decks">
            <Button size="lg" variant="outline">
              Your budget decks
            </Button>
          </Link>
        </div>
      </section>

      {featured && (
        <Link
          href={`/articles/${featured.slug}`}
          className="border-border bg-card hover:border-brand-300 group flex w-full max-w-3xl items-center gap-4 overflow-hidden rounded-xl border p-3 text-left shadow-sm transition hover:shadow-md"
        >
          {featuredThumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={featuredThumb}
              alt=""
              className="hidden h-16 w-28 shrink-0 rounded-lg object-cover sm:block"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-brand-600 text-xs font-semibold uppercase tracking-wide">
              Featured read
            </div>
            <div className="truncate font-semibold">{featured.title}</div>
            {featured.excerpt && (
              <div className="text-muted-foreground line-clamp-1 text-sm">
                {featured.excerpt}
              </div>
            )}
          </div>
          <span className="text-brand-600 shrink-0 text-sm font-medium group-hover:underline">
            Read →
          </span>
        </Link>
      )}

      <section className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        {FORMATS.map((f) => (
          <Link
            key={f.name}
            href={f.href}
            className="border-border bg-card hover:border-brand-300 group rounded-xl border p-5 text-left shadow-sm transition hover:shadow-md"
          >
            <div className="text-base font-semibold">{f.name}</div>
            <div className="text-muted-foreground mt-1 text-sm">{f.note}</div>
            <div className="text-brand-600 mt-3 text-xs font-medium group-hover:underline">
              Read the format guide →
            </div>
          </Link>
        ))}
      </section>

    </main>
  );
}
