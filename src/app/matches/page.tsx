import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  CreateMatchForm,
  JoinMatchForm,
  MatchCard,
  type Match,
} from "@/components/matches/match-controls";

export const metadata = { title: "Matches — Budget Deck Site" };

type UserRef = { handle: string | null; display_name: string | null } | null;
const label = (u: UserRef) =>
  u?.display_name || (u?.handle ? `@${u.handle}` : "player");

export default async function MatchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Apply time-based transitions (24h auto-accept, 72h expiry) lazily.
  await supabase.rpc("reconcile_matches");

  const { data: mpIds } = await supabase
    .from("match_players")
    .select("match_id")
    .eq("user_id", user.id);
  const matchIds = (mpIds ?? []).map((r) => r.match_id as string);

  const matches: Match[] = [];
  if (matchIds.length) {
    const { data: matchRows } = await supabase
      .from("matches")
      .select("id, status, join_code, creator_id, price_limit, created_at")
      .in("id", matchIds)
      .order("created_at", { ascending: false });

    const { data: playerRows } = await supabase
      .from("match_players")
      .select(
        "match_id, user_id, deck_id, status, is_creator, deck_snapshot, users:user_id(handle, display_name), decks:deck_id(name)"
      )
      .in("match_id", matchIds);

    const { data: resultRows } = await supabase
      .from("match_results")
      .select("id, match_id, winner_user_id, is_draw, submitted_by, status")
      .in("match_id", matchIds)
      .in("status", ["pending", "accepted"]);

    const pendingIds = (resultRows ?? [])
      .filter((r) => r.status === "pending")
      .map((r) => r.id as string);
    const { data: myResp } = pendingIds.length
      ? await supabase
          .from("match_result_responses")
          .select("result_id, accepted")
          .eq("user_id", user.id)
          .in("result_id", pendingIds)
      : { data: [] as { result_id: string; accepted: boolean }[] };
    const respByResult = new Map(
      (myResp ?? []).map((r) => [r.result_id, r.accepted])
    );

    const playersByMatch = new Map<string, Match["players"]>();
    for (const p of (playerRows ?? []) as unknown as {
      match_id: string;
      user_id: string;
      deck_id: string | null;
      status: string;
      is_creator: boolean;
      deck_snapshot: {
        name?: string;
        cards: { name: string; qty: number; board: string; commander: boolean }[];
      } | null;
      users: UserRef;
      decks: { name: string } | null;
    }[]) {
      const arr = playersByMatch.get(p.match_id) ?? [];
      arr.push({
        user_id: p.user_id,
        name: label(p.users),
        deck_id: p.deck_id,
        deck_name: p.decks?.name ?? null,
        status: p.status,
        is_creator: p.is_creator,
        snapshot: p.deck_snapshot ?? null,
      });
      playersByMatch.set(p.match_id, arr);
    }

    for (const m of (matchRows ?? []) as {
      id: string;
      status: string;
      join_code: string;
      creator_id: string;
      price_limit: number | null;
    }[]) {
      const results = (resultRows ?? []).filter((r) => r.match_id === m.id);
      const decisive =
        results.find((r) => r.status === "pending") ??
        results.find((r) => r.status === "accepted") ??
        null;
      matches.push({
        id: m.id,
        status: m.status,
        join_code: m.join_code,
        creator_id: m.creator_id,
        price_limit: m.price_limit ?? null,
        players: playersByMatch.get(m.id) ?? [],
        pending: decisive
          ? {
              result_id: decisive.id as string,
              winner_user_id: (decisive.winner_user_id as string) ?? null,
              is_draw: decisive.is_draw as boolean,
              submitted_by: decisive.submitted_by as string,
              my_response: respByResult.has(decisive.id as string)
                ? (respByResult.get(decisive.id as string) as boolean)
                : null,
            }
          : null,
      });
    }
  }

  // The player's locked-in decks (with their cheapest creator Lock-In price),
  // so the match deck pickers can restrict to decks within the price limit.
  const { data: deckRows } = await supabase
    .from("decks")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });
  const ownedDecks = (deckRows ?? []) as { id: string; name: string }[];
  const minLockByDeck = new Map<string, number>();
  if (ownedDecks.length) {
    const { data: lockRows } = await supabase
      .from("lock_ins")
      .select("deck_id, budget_price")
      .eq("kind", "creator")
      .in(
        "deck_id",
        ownedDecks.map((d) => d.id)
      );
    for (const l of (lockRows ?? []) as {
      deck_id: string;
      budget_price: number;
    }[]) {
      const cur = minLockByDeck.get(l.deck_id);
      if (cur == null || l.budget_price < cur)
        minLockByDeck.set(l.deck_id, l.budget_price);
    }
  }
  const lockedDecks = ownedDecks
    .filter((d) => minLockByDeck.has(d.id))
    .map((d) => ({
      id: d.id,
      name: d.name,
      locked_price: minLockByDeck.get(d.id) as number,
    }));

  const { data: groupRows } = await supabase
    .from("playgroups")
    .select("id, name");
  const groups = (groupRows ?? []) as { id: string; name: string }[];
  const groupIds = groups.map((g) => g.id);
  const membersByGroup = new Map<string, { id: string; name: string }[]>();
  if (groupIds.length) {
    const { data: gm } = await supabase
      .from("playgroup_members")
      .select("playgroup_id, user_id, users:user_id(handle, display_name)")
      .in("playgroup_id", groupIds);
    for (const m of (gm ?? []) as unknown as {
      playgroup_id: string;
      user_id: string;
      users: UserRef;
    }[]) {
      if (m.user_id === user.id) continue;
      const arr = membersByGroup.get(m.playgroup_id) ?? [];
      arr.push({ id: m.user_id, name: label(m.users) });
      membersByGroup.set(m.playgroup_id, arr);
    }
  }
  const playgroups = groups.map((g) => ({
    id: g.id,
    name: g.name,
    members: membersByGroup.get(g.id) ?? [],
  }));

  // For open matches I host, fetch each player's eligible locked-in decks so I
  // can pre-assign them (SECURITY DEFINER RPC, gated to the creator).
  const assignableByMatch: Record<
    string,
    Record<string, { id: string; name: string; locked_price: number }[]>
  > = {};
  for (const m of matches) {
    if (m.creator_id === user.id && m.status === "open") {
      const { data: rows } = await supabase.rpc("match_assignable_decks", {
        p_match: m.id,
      });
      const byUser: Record<
        string,
        { id: string; name: string; locked_price: number }[]
      > = {};
      for (const r of (rows ?? []) as {
        user_id: string;
        deck_id: string;
        name: string;
        locked_price: number;
      }[]) {
        (byUser[r.user_id] ??= []).push({
          id: r.deck_id,
          name: r.name,
          locked_price: Number(r.locked_price),
        });
      }
      assignableByMatch[m.id] = byUser;
    }
  }

  const invitations = matches.filter((m) => m.status === "open");
  const active = matches.filter((m) => m.status === "active");
  const completed = matches.filter((m) => m.status === "completed");

  const Section = ({
    title,
    list,
    empty,
  }: {
    title: string;
    list: Match[];
    empty: string;
  }) => (
    <section className="flex flex-col gap-3">
      <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-wide">
        {title}
      </h2>
      {list.length === 0 ? (
        <p className="text-muted-foreground text-sm">{empty}</p>
      ) : (
        list.map((m) => (
          <MatchCard
            key={m.id}
            match={m}
            me={user.id}
            myDecks={lockedDecks}
            assignable={assignableByMatch[m.id] ?? {}}
          />
        ))
      )}
    </section>
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Match tracking</h1>
        <p className="text-muted-foreground text-sm">
          Run a four-player match with your playgroup and record the results.
        </p>
      </div>

      <section className="border-border bg-card flex flex-col gap-4 rounded-xl border p-5">
        <h2 className="text-sm font-semibold">Start a match</h2>
        <CreateMatchForm playgroups={playgroups} />
        <div className="border-border border-t pt-4">
          <div className="mb-2 text-sm font-semibold">Join a match</div>
          <JoinMatchForm myDecks={lockedDecks} />
        </div>
      </section>

      <Section
        title="Invitations"
        list={invitations}
        empty="No open invitations."
      />
      <Section title="Active matches" list={active} empty="No active matches." />
      <Section
        title="Completed matches"
        list={completed}
        empty="No completed matches yet."
      />
    </main>
  );
}
