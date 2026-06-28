import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatUsd } from "@/lib/format";
import { FollowButton } from "@/components/users/follow-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  return {
    title: `@${handle} — Budget Deck Site`,
    description: `Budget Magic decks by @${handle}.`,
  };
}

interface ProfileDeck {
  id: string;
  name: string;
  game_format: string;
  threshold_amount: number | null;
  visibility: string;
}

interface LockRow {
  budget_price: number;
  locked_at: string;
  deck_id: string;
  decks: { name: string; visibility: string } | { name: string; visibility: string }[] | null;
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("users")
    .select("id, handle, display_name, created_at")
    .eq("handle", handle)
    .maybeSingle();
  if (!profile) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwnProfile = !!user && user.id === profile.id;

  const { count: followerCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", profile.id);
  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", profile.id);
  let isFollowing = false;
  if (user && !isOwnProfile) {
    const { data: f } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", profile.id)
      .maybeSingle();
    isFollowing = !!f;
  }

  let deckQuery = supabase
    .from("decks")
    .select("id, name, game_format, threshold_amount, visibility")
    .eq("owner_id", profile.id)
    .order("updated_at", { ascending: false });
  if (!isOwnProfile) deckQuery = deckQuery.eq("visibility", "public");
  const { data: deckData } = await deckQuery;
  const decks = (deckData ?? []) as ProfileDeck[];

  const { data: lockData } = await supabase
    .from("lock_ins")
    .select("budget_price, locked_at, deck_id, decks(name, visibility)")
    .eq("user_id", profile.id)
    .order("locked_at", { ascending: false });
  // Latest lock-in per deck (creator or visitor), most-recent first.
  const seenDecks = new Set<string>();
  const locks = ((lockData ?? []) as LockRow[]).filter((l) => {
    if (seenDecks.has(l.deck_id)) return false;
    seenDecks.add(l.deck_id);
    return true;
  });

  const joined = new Date(profile.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            @{profile.handle}
          </h1>
          {user && !isOwnProfile && (
            <FollowButton userId={profile.id} following={isFollowing} />
          )}
          {isOwnProfile && (
            <Link
              href="/account"
              className="border-border hover:bg-muted shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium"
            >
              Account settings
            </Link>
          )}
        </div>
        {profile.display_name && (
          <span className="text-muted-foreground">{profile.display_name}</span>
        )}
        <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
          <span>
            <strong className="text-foreground">{followerCount ?? 0}</strong>{" "}
            followers
          </span>
          <span>
            <strong className="text-foreground">{followingCount ?? 0}</strong>{" "}
            following
          </span>
          <span>Joined {joined}</span>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Decks</h2>
        {decks.length === 0 ? (
          <p className="text-muted-foreground text-sm">No public decks yet.</p>
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
                        : ""}
                      {isOwnProfile && d.visibility !== "public"
                        ? ` · ${d.visibility}`
                        : ""}
                    </span>
                  </span>
                  <span className="text-muted-foreground text-sm">View →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Price Locks</h2>
        {locks.length === 0 ? (
          <p className="text-muted-foreground text-sm">No price locks yet.</p>
        ) : (
          <ul className="divide-border divide-y">
            {locks.map((l) => {
              const deck = Array.isArray(l.decks) ? l.decks[0] : l.decks;
              if (!deck) return null; // deck no longer visible
              return (
                <li key={`${l.deck_id}-${l.locked_at}`}>
                  <Link
                    href={`/decks/${l.deck_id}`}
                    className="hover:bg-muted flex items-center justify-between gap-3 rounded-md px-2 py-3"
                  >
                    <span className="font-medium">{deck.name}</span>
                    <span className="text-muted-foreground text-sm">
                      🔒 Locked at {formatUsd(l.budget_price)} ·{" "}
                      {fmtDate(l.locked_at)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
