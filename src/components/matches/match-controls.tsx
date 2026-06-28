"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createMatch,
  joinMatch,
  respondInvite,
  setMatchDeck,
  submitResult,
  respondResult,
} from "@/app/matches/actions";

export type Deck = { id: string; name: string; locked_price: number };
export type SnapshotCard = {
  name: string;
  qty: number;
  board: string;
  commander: boolean;
};
export type Snapshot = { name?: string; cards: SnapshotCard[] } | null;
export type Player = {
  user_id: string;
  name: string;
  deck_id: string | null;
  deck_name: string | null;
  status: string;
  is_creator: boolean;
  snapshot?: Snapshot;
};
export type Pending = {
  result_id: string;
  winner_user_id: string | null;
  is_draw: boolean;
  submitted_by: string;
  my_response: boolean | null;
};
export type Match = {
  id: string;
  status: string;
  join_code: string;
  creator_id: string;
  price_limit: number | null;
  players: Player[];
  pending: Pending | null;
};

const field = "border-border bg-background rounded-md border px-2 py-1.5 text-sm";
const primary =
  "bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-50";
const ghost =
  "border-border hover:bg-muted rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-50";

function useAct() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? null : (r.message ?? "Something went wrong."));
      if (r.ok) router.refresh();
    });
  return { pending, msg, run };
}

export function CreateMatchForm({
  playgroups,
}: {
  playgroups: { id: string; name: string; members: { id: string; name: string }[] }[];
}) {
  const [gid, setGid] = useState(playgroups[0]?.id ?? "");
  const [invited, setInvited] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const { pending, msg, run } = useAct();
  const group = playgroups.find((g) => g.id === gid);

  if (playgroups.length === 0)
    return (
      <p className="text-muted-foreground text-sm">
        Create a playgroup first, then start a match here.
      </p>
    );

  const toggle = (id: string) =>
    setInvited((v) =>
      v.includes(id) ? v.filter((x) => x !== id) : v.length < 3 ? [...v, id] : v
    );

  return (
    <div className="flex flex-col gap-3">
      <select
        value={gid}
        onChange={(e) => {
          setGid(e.target.value);
          setInvited([]);
        }}
        className={field}
      >
        {playgroups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
      <div className="flex flex-wrap gap-1.5">
        {group?.members.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => toggle(m.id)}
            className={`rounded-full border px-2.5 py-1 text-xs ${
              invited.includes(m.id)
                ? "border-brand-600 bg-brand-50 text-brand-700 font-medium"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Price limit $</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="none"
          className={`${field} w-28`}
        />
        <span className="text-muted-foreground text-xs">
          players bring decks locked in at or below this
        </span>
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending || !gid}
          onClick={() =>
            run(() => createMatch(gid, invited, price ? Number(price) : null))
          }
          className={primary}
        >
          Create match ({invited.length + 1}/4)
        </button>
        {msg && <span className="text-destructive text-xs">{msg}</span>}
      </div>
    </div>
  );
}

export function JoinMatchForm({ myDecks }: { myDecks: Deck[] }) {
  const [code, setCode] = useState("");
  const [deck, setDeck] = useState("");
  const { pending, msg, run } = useAct();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Match code"
        className={`${field} w-32`}
      />
      <select value={deck} onChange={(e) => setDeck(e.target.value)} className={field}>
        <option value="">Pick a deck…</option>
        {myDecks.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending || !code}
        onClick={() => run(() => joinMatch(code, deck || null))}
        className={ghost}
      >
        Join
      </button>
      {msg && <span className="text-destructive text-xs">{msg}</span>}
    </div>
  );
}

function PlayerRows({ players, winnerId }: { players: Player[]; winnerId?: string | null }) {
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {players.map((p) => (
        <li key={p.user_id} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            {winnerId && p.user_id === winnerId && <span title="Winner">🏆</span>}
            {p.name}
            {p.is_creator && (
              <span className="text-muted-foreground text-xs">(host)</span>
            )}
          </span>
          <span className="text-muted-foreground text-xs">
            {p.deck_name ?? "no deck"}
            {p.status === "invited" && " · invited"}
            {p.status === "declined" && " · declined"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MatchCard({
  match,
  me,
  myDecks,
  assignable = {},
}: {
  match: Match;
  me: string;
  myDecks: Deck[];
  assignable?: Record<string, Deck[]>;
}) {
  const { pending, msg, run } = useAct();
  const mine = match.players.find((p) => p.user_id === me);
  const [deck, setDeck] = useState(mine?.deck_id ?? "");
  const [winner, setWinner] = useState("");
  const [showLists, setShowLists] = useState(false);

  const accepted = match.players.filter((p) => p.status === "accepted");
  const eligible =
    match.price_limit == null
      ? myDecks
      : myDecks.filter((d) => d.locked_price <= match.price_limit!);

  return (
    <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">
          {accepted.length} in · code{" "}
          <span className="bg-muted rounded px-1.5 py-0.5 font-mono">
            {match.join_code}
          </span>
          {match.price_limit != null && (
            <span className="ml-2">≤ ${match.price_limit}</span>
          )}
        </span>
        <span className="text-muted-foreground text-xs capitalize">{match.status}</span>
      </div>

      <PlayerRows players={match.players} winnerId={match.pending?.winner_user_id} />

      {/* OPEN: respond to invite / change my deck */}
      {match.status === "open" && mine?.status === "invited" && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <select value={deck} onChange={(e) => setDeck(e.target.value)} className={field}>
            <option value="">
              {eligible.length ? "Pick your deck…" : "No eligible locked-in decks"}
            </option>
            {eligible.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => respondInvite(match.id, true, deck || null))}
            className={primary}
          >
            Accept
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => respondInvite(match.id, false, null))}
            className={ghost}
          >
            Decline
          </button>
        </div>
      )}
      {match.status === "open" && mine?.status === "accepted" && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="text-muted-foreground text-xs">Your deck:</span>
          <select
            value={deck}
            onChange={(e) => {
              setDeck(e.target.value);
              run(() => setMatchDeck(match.id, me, e.target.value || null));
            }}
            className={field}
          >
            <option value="">No deck</option>
            {eligible.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <span className="text-muted-foreground text-xs">waiting for players…</span>
        </div>
      )}

      {/* OPEN + host: pre-assign decks to other players */}
      {match.status === "open" && match.creator_id === me && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <span className="text-muted-foreground text-xs">
            Assign decks (optional — players can change theirs until they accept)
          </span>
          {match.players
            .filter((p) => p.user_id !== me)
            .map((p) => (
              <div
                key={p.user_id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span>{p.name}</span>
                <select
                  defaultValue={p.deck_id ?? ""}
                  disabled={pending}
                  onChange={(e) =>
                    run(() =>
                      setMatchDeck(match.id, p.user_id, e.target.value || null)
                    )
                  }
                  className={field}
                >
                  <option value="">Let them pick</option>
                  {(assignable[p.user_id] ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
        </div>
      )}

      {/* ACTIVE: submit or respond to a result */}
      {match.status === "active" && !match.pending && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <select value={winner} onChange={(e) => setWinner(e.target.value)} className={field}>
            <option value="">Who won?</option>
            {accepted.map((p) => (
              <option key={p.user_id} value={p.user_id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending || !winner}
            onClick={() => run(() => submitResult(match.id, winner, false))}
            className={primary}
          >
            Submit result
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => submitResult(match.id, null, true))}
            className={ghost}
          >
            Record a draw
          </button>
        </div>
      )}
      {match.status === "active" && match.pending && (
        <div className="flex flex-col gap-2 border-t border-border pt-3 text-sm">
          <span>
            Proposed result:{" "}
            <strong>
              {match.pending.is_draw
                ? "Draw"
                : `${
                    match.players.find(
                      (p) => p.user_id === match.pending?.winner_user_id
                    )?.name ?? "?"
                  } wins`}
            </strong>
          </span>
          {match.pending.submitted_by === me ? (
            <span className="text-muted-foreground text-xs">
              You submitted this. Waiting on the other players (auto-confirms in 24h).
            </span>
          ) : match.pending.my_response == null ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => respondResult(match.pending!.result_id, true))}
                className={primary}
              >
                Accept
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => respondResult(match.pending!.result_id, false))}
                className={ghost}
              >
                Reject
              </button>
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">
              You {match.pending.my_response ? "accepted" : "rejected"} this.
            </span>
          )}
        </div>
      )}

      {match.status === "completed" && (
        <div className="border-border flex flex-col gap-2 border-t pt-2 text-sm">
          <div className="font-medium">
            {match.pending
              ? match.pending.is_draw
                ? "Draw recorded."
                : `${
                    match.players.find(
                      (p) => p.user_id === match.pending?.winner_user_id
                    )?.name ?? "Someone"
                  } won.`
              : "Final result recorded."}
          </div>
          {match.players.some((p) => p.snapshot) && (
            <>
              <button
                type="button"
                onClick={() => setShowLists((s) => !s)}
                className="text-brand-600 self-start text-xs"
              >
                {showLists ? "Hide decklists ▲" : "View decklists (frozen) ▼"}
              </button>
              {showLists && (
                <div className="flex flex-col gap-3">
                  {match.players.map((p) =>
                    p.snapshot ? (
                      <div key={p.user_id}>
                        <div className="text-xs font-semibold">
                          {p.name} — {p.snapshot.name ?? p.deck_name ?? "deck"}
                        </div>
                        <ul className="text-muted-foreground mt-0.5 text-xs sm:columns-2">
                          {p.snapshot.cards.map((c, i) => (
                            <li key={i}>
                              {c.qty}× {c.name}
                              {c.commander ? " (commander)" : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {msg && <span className="text-destructive text-xs">{msg}</span>}
    </div>
  );
}
