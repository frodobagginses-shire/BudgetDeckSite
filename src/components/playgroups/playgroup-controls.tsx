"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPlaygroup,
  joinPlaygroup,
  addToPlaygroup,
  removeFromPlaygroup,
} from "@/app/playgroups/actions";

const field = "border-border bg-background rounded-md border px-3 py-2 text-sm";
const btn =
  "bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50";

export function CreateJoinPlaygroup() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const create = () =>
    start(async () => {
      const r = await createPlaygroup(name);
      setMsg(r.ok ? null : (r.message ?? "Failed."));
      if (r.ok) {
        setName("");
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New playgroup name"
          className={`${field} flex-1`}
        />
        <button type="button" onClick={create} disabled={pending} className={btn}>
          Create
        </button>
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
