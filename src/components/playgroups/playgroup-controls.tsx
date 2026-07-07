"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPlaygroup,
  joinPlaygroup,
  addToPlaygroup,
  removeFromPlaygroup,
  setPlaygroupFormat,
} from "@/app/playgroups/actions";
import { GAME_FORMATS, isMultiplayerFormat } from "@/lib/types";

const field = "border-border bg-background rounded-md border px-3 py-2 text-sm";
const btn =
  "bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50";

export function CreateJoinPlaygroup() {
  const [format, setFormat] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const create = () =>
    start(async () => {
      const r = await createPlaygroup(name, format);
      setMsg(r.ok ? null : (r.message ?? "Failed."));
      if (r.ok) {
        setName("");
        setFormat("");
        router.refresh();
      }
    });
  const join = () =>
    start(async () => {
      const r = await joinPlaygroup(code);
      setMsg(r.ok ? null : (r.message ?? "Failed."));
      if (r.ok) {
        setCode("");
        router.refresh();
      }
    });

  const maxSeats = format ? (isMultiplayerFormat(format) ? 5 : 2) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className={`${field} capitalize`}
        >
          <option value="">Pick a format first…</option>
          {GAME_FORMATS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        {maxSeats != null && (
          <p className="text-muted-foreground text-xs">
            {maxSeats === 2
              ? "1-vs-1 format — a playgroup is you plus one opponent."
              : "Multiplayer — 2 to 5 players (pods play best at 3–4)."}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New playgroup name"
            className={`${field} flex-1`}
            disabled={!format}
          />
          <button
            type="button"
            onClick={create}
            disabled={pending || !format}
            className={btn}
          >
            Create
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Join with a code"
          className={`${field} flex-1`}
        />
        <button
          type="button"
          onClick={join}
          disabled={pending}
          className="border-border hover:bg-muted rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          Join
        </button>
      </div>
      {msg && <p className="text-destructive text-xs">{msg}</p>}
    </div>
  );
}

export function AddToPlaygroupButton({
  userId,
  groups,
}: {
  userId: string;
  groups: { id: string; name: string }[];
}) {
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (groups.length === 0) return null;

  const add = () =>
    start(async () => {
      const r = await addToPlaygroup(groupId, userId);
      setMsg(r.ok ? "Added!" : (r.message ?? "Failed."));
      if (r.ok) router.refresh();
      setTimeout(() => setMsg(null), 2000);
    });

  return (
    <div className="flex items-center gap-2">
      {groups.length > 1 && (
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="border-border bg-background h-8 rounded-md border px-2 text-xs"
        >
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={add}
        disabled={pending}
        className="border-border hover:bg-muted rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
      >
        Add to Playgroup
      </button>
      {msg && <span className="text-muted-foreground text-xs">{msg}</span>}
    </div>
  );
}

/** Format badge on a playgroup card; owners get a select to change it (the
 * server rejects changes the current member count doesn't fit). */
export function PlaygroupFormatControl({
  groupId,
  format,
  isOwner,
}: {
  groupId: string;
  format: string;
  isOwner: boolean;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!isOwner) {
    return (
      <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs capitalize">
        {format}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <select
        value={format}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            const r = await setPlaygroupFormat(groupId, e.target.value);
            setMsg(r.ok ? null : (r.message ?? "Couldn't change format."));
            if (r.ok) router.refresh();
          })
        }
        className="border-border bg-background h-7 rounded-md border px-1.5 text-xs capitalize"
        aria-label="Playgroup format"
      >
        {GAME_FORMATS.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
      {msg && <span className="text-destructive text-xs">{msg}</span>}
    </span>
  );
}

export function RemoveMemberButton({
  groupId,
  userId,
}: {
  groupId: string;
  userId: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() =>
        start(async () => {
          await removeFromPlaygroup(groupId, userId);
          router.refresh();
        })
      }
      disabled={pending}
      className="text-muted-foreground hover:text-destructive text-xs"
      aria-label="Remove"
    >
      ✕
    </button>
  );
}
