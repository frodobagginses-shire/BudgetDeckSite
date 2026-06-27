"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminLockIn } from "@/app/decks/actions";

export function AdminLockIn({
  deckId,
  defaultBudget,
}: {
  deckId: string;
  defaultBudget: number;
}) {
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState(
    defaultBudget ? String(defaultBudget) : ""
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const apply = () => {
    if (!date) {
      setMsg("Pick a date first.");
      return;
    }
    start(async () => {
      // Noon UTC avoids the date shifting a day across time zones.
      const iso = new Date(`${date}T12:00:00Z`).toISOString();
      const res = await adminLockIn(deckId, iso, Number(amount) || 0, null);
      setMsg(res.ok ? "Retroactive Lock-In applied." : (res.message ?? "Failed."));
      if (res.ok) router.refresh();
    });
  };

  const field =
    "border-amber-300 bg-white rounded-md border px-2 py-1.5 text-sm text-amber-950";

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <div className="text-sm font-semibold text-amber-900">
        Admin · retroactive Lock-In
      </div>
      <p className="mt-1 text-xs text-amber-800/80">
        Stamp this deck with a backdated Lock-In on the owner&apos;s behalf —
        for decks built before the site existed.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-amber-900">
          Lock-In date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-amber-900">
          Budget $
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${field} w-28`}
          />
        </label>
        <button
          type="button"
          onClick={apply}
          disabled={pending}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Apply
        </button>
      </div>
      {msg && <p className="mt-2 text-xs font-medium text-amber-900">{msg}</p>}
    </section>
  );
}
