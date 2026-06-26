import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatUsd } from "@/lib/format";
import type { Deck } from "@/lib/types";

export default async function DecksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("decks")
    .select("*")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });
  const decks = (data ?? []) as Deck[];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Your decks</h1>
        <Link
          href="/decks/new"
          className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium hover:opacity-90"
        >
          New deck
        </Link>
      </div>

      {decks.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No decks yet. Create your first budget deck.
        </p>
      ) : (
        <ul className="divide-border divide-y">
          {decks.map((d) => (
            <li key={d.id}>
              <Link
                href={`/decks/${d.id}`}
                className="hover:bg-muted flex items-center justify-between gap-3 rounded-md px-2 py-3"
              >
                <span className="flex flex-col">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-muted-foreground text-xs capitalize">
                    {d.game_format}
                    {d.threshold_amount != null
                      ? ` · cap ${formatUsd(d.threshold_amount)}`
                      : ""}{" "}
                    · {d.visibility}
                  </span>
                </span>
                <span className="text-muted-foreground text-sm">Edit →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
