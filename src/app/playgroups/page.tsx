import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  CreateJoinPlaygroup,
  AddToPlaygroupButton,
  RemoveMemberButton,
  PlaygroupFormatControl,
} from "@/components/playgroups/playgroup-controls";
import { formatMaxPlayers, isMultiplayerFormat } from "@/lib/types";

export const metadata = { title: "Playgroups | Budget Deck Site" };

type UserRef = { handle: string | null; display_name: string | null } | null;

export default async function PlaygroupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: groupRows } = await supabase
    .from("playgroups")
    .select("id, name, owner_id, invite_code, game_format")
    .order("created_at", { ascending: true });
  const groups = (groupRows ?? []) as {
    id: string;
    name: string;
    owner_id: string;
    invite_code: string;
    game_format: string;
  }[];

  const groupIds = groups.map((g) => g.id);
  const membersByGroup = new Map<
    string,
    { user_id: string; user: UserRef }[]
  >();
  if (groupIds.length) {
    const { data: memberRows } = await supabase
      .from("playgroup_members")
      .select("playgroup_id, user_id, users:user_id(handle, display_name)")
      .in("playgroup_id", groupIds);
    for (const m of (memberRows ?? []) as unknown as {
      playgroup_id: string;
      user_id: string;
      users: UserRef;
    }[]) {
      const arr = membersByGroup.get(m.playgroup_id) ?? [];
      arr.push({ user_id: m.user_id, user: m.users });
      membersByGroup.set(m.playgroup_id, arr);
    }
  }

  const { data: followRows } = await supabase
    .from("follows")
    .select("following_id, users:following_id(handle, display_name)")
    .eq("follower_id", user.id);
  const following = ((followRows ?? []) as unknown as {
    following_id: string;
    users: UserRef;
  }[]).map((f) => ({ id: f.following_id, user: f.users }));

  const ownedGroups = groups
    .filter((g) => g.owner_id === user.id)
    .map((g) => ({ id: g.id, name: g.name }));

  const label = (u: UserRef, fallback = "player") =>
    u?.display_name || (u?.handle ? `@${u.handle}` : fallback);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Playgroups</h1>
        <p className="text-muted-foreground text-sm">
          Group up with the people you play with. Pick a format first: 1-vs-1
          formats pair you with one opponent, Commander pods seat 2–5.
        </p>
      </div>

      <section className="border-border bg-card rounded-xl border p-5">
        <CreateJoinPlaygroup />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your playgroups
        </h2>
        {groups.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No playgroups yet. Create one above, or join with a code.
          </p>
        ) : (
          groups.map((g) => {
            const members = membersByGroup.get(g.id) ?? [];
            const isOwner = g.owner_id === user.id;
            const max = formatMaxPlayers(g.game_format);
            const multi = isMultiplayerFormat(g.game_format);
            const podNote =
              multi && members.length === 2
                ? "Duel-sized pod — Commander plays best with 3–4."
                : multi && members.length === 5
                  ? "Full house — five-player pods can drag; 3–4 is the sweet spot."
                  : null;
            return (
              <div
                key={g.id}
                className="border-border bg-card rounded-xl border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{g.name}</span>
                    <PlaygroupFormatControl
                      groupId={g.id}
                      format={g.game_format}
                      isOwner={isOwner}
                    />
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Invite code:{" "}
                    <span className="bg-muted rounded px-1.5 py-0.5 font-mono">
                      {g.invite_code}
                    </span>
                    <span className="ml-2">
                      {members.length}/{max} {isOwner ? "· you own this" : ""}
                    </span>
                  </div>
                </div>
                {podNote && (
                  <p className="text-muted-foreground mt-2 text-xs">
                    ⚠️ {podNote}
                  </p>
                )}
                <ul className="mt-3 flex flex-wrap gap-2">
                  {members.map((m) => (
                    <li
                      key={m.user_id}
                      className="border-border flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
                    >
                      {m.user?.handle ? (
                        <Link
                          href={`/users/${m.user.handle}`}
                          className="hover:underline"
                        >
                          {label(m.user)}
                        </Link>
                      ) : (
                        <span>{label(m.user)}</span>
                      )}
                      {(isOwner || m.user_id === user.id) && (
                        <RemoveMemberButton groupId={g.id} userId={m.user_id} />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          People you follow
        </h2>
        {following.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You aren&apos;t following anyone yet. Visit a profile to follow them.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {following.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                {f.user?.handle ? (
                  <Link
                    href={`/users/${f.user.handle}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {label(f.user)}
                  </Link>
                ) : (
                  <span className="text-sm font-medium">{label(f.user)}</span>
                )}
                <AddToPlaygroupButton userId={f.id} groups={ownedGroups} />
              </li>
            ))}
          </ul>
        )}
        {ownedGroups.length === 0 && following.length > 0 && (
          <p className="text-muted-foreground text-xs">
            Create a playgroup above to start adding people.
          </p>
        )}
      </section>
    </main>
  );
}
