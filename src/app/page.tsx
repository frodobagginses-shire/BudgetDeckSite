import Link from "next/link";
import { Button } from "@/components/ui/button";

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

export default function Home() {
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
          <span className="text-foreground font-semibold">Lock In</span> a dated
          price you can prove later.
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
