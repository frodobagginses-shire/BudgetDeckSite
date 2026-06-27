"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/account/actions";

export function ProfileForm({
  handle,
  displayName,
}: {
  handle: string;
  displayName: string;
}) {
  const [h, setH] = useState(handle);
  const [name, setName] = useState(displayName);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const dirty = h !== handle || name !== displayName;

  const save = () =>
    start(async () => {
      const res = await updateProfile(h, name);
      setMsg(
        res.ok
          ? { ok: true, text: "Saved." }
          : { ok: false, text: res.message ?? "Couldn't save." }
      );
      if (res.ok) router.refresh();
    });

  const field =
    "border-border bg-background rounded-md border px-3 py-2 text-sm";

  return (
    <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-5">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Display name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="The name shown on your decks"
          className={field}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Handle</span>
        <span className="border-border bg-background flex items-center rounded-md border pl-3 text-sm">
          <span className="text-muted-foreground">@</span>
          <input
            value={h}
            onChange={(e) => setH(e.target.value)}
            placeholder="username"
            className="flex-1 bg-transparent px-1 py-2 outline-none"
          />
        </span>
        <span className="text-muted-foreground text-xs">
          Lowercase letters, numbers, dashes, or underscores. This is your public
          profile URL.
        </span>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        {msg && (
          <span
            className={`text-sm ${
              msg.ok ? "text-brand-600" : "text-destructive"
            }`}
          >
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
