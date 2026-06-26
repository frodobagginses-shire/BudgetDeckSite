"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Board, DeckTotals } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createDeck(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = String(formData.get("name") || "").trim() || "Untitled deck";
  const game_format = String(formData.get("game_format") || "commander");
  const thRaw = formData.get("threshold_amount");
  const threshold_amount =
    thRaw && String(thRaw).trim() !== "" ? Number(thRaw) : null;
  const visibility = String(formData.get("visibility") || "private");

  const { data, error } = await supabase
    .from("decks")
    .insert({
      owner_id: user.id,
      name,
      game_format,
      threshold_amount,
      visibility,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create deck");
  }
  redirect(`/decks/${data.id}`);
}

export async function updateDeckMeta(deckId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const name = String(formData.get("name") || "").trim() || "Untitled deck";
  const game_format = String(formData.get("game_format") || "commander");
  const thRaw = formData.get("threshold_amount");
  const threshold_amount =
    thRaw && String(thRaw).trim() !== "" ? Number(thRaw) : null;
  const visibility = String(formData.get("visibility") || "private");

  const { error } = await supabase
    .from("decks")
    .update({ name, game_format, threshold_amount, visibility })
    .eq("id", deckId);
  if (error) throw new Error(error.message);
  revalidatePath(`/decks/${deckId}`);
}

export async function deleteDeck(deckId: string) {
  const { supabase } = await requireUser();
  await supabase.from("decks").delete().eq("id", deckId);
  redirect("/decks");
}

/** Like or unlike a deck (toggle). */
export async function toggleLike(deckId: string) {
  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase
    .from("deck_likes")
    .select("deck_id")
    .eq("deck_id", deckId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("deck_likes")
      .delete()
      .eq("deck_id", deckId)
      .eq("user_id", user.id);
  } else {
    await supabase.from("deck_likes").insert({
      deck_id: deckId,
      user_id: user.id,
    });
  }
  revalidatePath(`/decks/${deckId}`);
}

/** Set (or clear, with "") the deck's banner card. */
export async function setBanner(deckId: string, scryfallId: string) {
  const { supabase } = await requireUser();
  await supabase
    .from("decks")
    .update({ banner_scryfall_id: scryfallId || null })
    .eq("id", deckId);
  revalidatePath(`/decks/${deckId}`);
}

/** Update a deck's primer (Markdown description). */
export async function updateDeckPrimer(deckId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const description_md = String(formData.get("description_md") || "");
  await supabase
    .from("decks")
    .update({ description_md: description_md || null })
    .eq("id", deckId);
  revalidatePath(`/decks/${deckId}`);
}

/** Fork/copy a deck into the current user's decks, optionally linking back. */
export async function forkDeck(deckId: string, linkBack: boolean) {
  const { supabase, user } = await requireUser();

  const { data: src } = await supabase
    .from("decks")
    .select("name, game_format, threshold_amount, threshold_currency, description_md")
    .eq("id", deckId)
    .maybeSingle();
  if (!src) return;

  const { data: created, error } = await supabase
    .from("decks")
    .insert({
      owner_id: user.id,
      name: src.name,
      game_format: src.game_format,
      threshold_amount: src.threshold_amount,
      threshold_currency: src.threshold_currency ?? "USD",
      visibility: "private",
      description_md: src.description_md,
      parent_deck_id: linkBack ? deckId : null,
      show_lineage: linkBack,
    })
    .select("id")
    .single();
  if (error || !created) {
    throw new Error(error?.message ?? "Could not copy deck");
  }

  const { data: srcCards } = await supabase
    .from("deck_cards")
    .select("scryfall_id, quantity, board, counts_toward_budget")
    .eq("deck_id", deckId);
  if (srcCards && srcCards.length) {
    await supabase.from("deck_cards").insert(
      srcCards.map((c) => ({
        deck_id: created.id,
        scryfall_id: c.scryfall_id,
        quantity: c.quantity,
        board: c.board,
        counts_toward_budget: c.counts_toward_budget,
      }))
    );
  }

  redirect(`/decks/${created.id}`);
}

export type AddResult = { ok: boolean; message?: string };

/**
 * Add a card by oracle id; resolves to the cheapest printing as the default.
 * Enforces format legality (blocks cards not legal in the deck's game format,
 * unless the format is "casual"). Color-identity enforcement is deferred until
 * commander designation exists.
 */
export async function addCard(
  deckId: string,
  oracleId: string
): Promise<AddResult> {
  const { supabase } = await requireUser();

  const { data: deck } = await supabase
    .from("decks")
    .select("game_format")
    .eq("id", deckId)
    .maybeSingle();
  const format = (deck?.game_format ?? "casual") as string;

  // Resolve a printing (cheapest preferred) and pull name + legalities.
  const { data: cheap } = await supabase
    .from("card_cheapest")
    .select("cheapest_scryfall_id")
    .eq("oracle_id", oracleId)
    .maybeSingle();
  let scryfallId = cheap?.cheapest_scryfall_id as string | undefined;
  type CardInfo = {
    name: string;
    legalities: Record<string, string>;
    color_identity: string[];
  };
  let card: CardInfo | null = null;

  if (scryfallId) {
    const { data } = await supabase
      .from("cards")
      .select("name, legalities, color_identity")
      .eq("scryfall_id", scryfallId)
      .maybeSingle();
    if (data) card = data as CardInfo;
  }
  if (!scryfallId) {
    const { data } = await supabase
      .from("cards")
      .select("scryfall_id, name, legalities, color_identity")
      .eq("oracle_id", oracleId)
      .limit(1)
      .maybeSingle();
    scryfallId = data?.scryfall_id as string | undefined;
    if (data)
      card = {
        name: data.name as string,
        legalities: data.legalities as Record<string, string>,
        color_identity: (data.color_identity as string[]) ?? [],
      };
  }
  if (!scryfallId) return { ok: false, message: "Card not found." };

  if (format !== "casual" && card?.legalities) {
    const status = card.legalities[format];
    if (status && status !== "legal" && status !== "restricted") {
      return { ok: false, message: `${card.name} isn't legal in ${format}.` };
    }
  }

  if (format === "commander") {
    const { data: cmd } = await supabase
      .from("deck_cards")
      .select("scryfall_id")
      .eq("deck_id", deckId)
      .eq("is_commander", true);
    if (cmd && cmd.length) {
      const { data: cmdCards } = await supabase
        .from("cards")
        .select("color_identity")
        .in(
          "scryfall_id",
          cmd.map((r) => r.scryfall_id)
        );
      const identity = new Set<string>();
      for (const c of cmdCards ?? [])
        for (const col of (c.color_identity as string[]) ?? [])
          identity.add(col);
      const outside = (card?.color_identity ?? []).filter(
        (col) => !identity.has(col)
      );
      if (outside.length) {
        return {
          ok: false,
          message: `${card?.name} is outside your commander's color identity (${
            [...identity].join("") || "colorless"
          }).`,
        };
      }
    }
  }

  const { data: existing } = await supabase
    .from("deck_cards")
    .select("id, quantity")
    .eq("deck_id", deckId)
    .eq("scryfall_id", scryfallId)
    .eq("board", "main")
    .maybeSingle();

  if (existing) {
    await supabase
      .from("deck_cards")
      .update({ quantity: existing.quantity + 1 })
      .eq("id", existing.id);
  } else {
    await supabase.from("deck_cards").insert({
      deck_id: deckId,
      scryfall_id: scryfallId,
      quantity: 1,
      board: "main",
    });
  }
  revalidatePath(`/decks/${deckId}`);
  return { ok: true };
}

/** Move a card between boards, merging quantities if the target already has it. */
export async function moveCard(
  deckId: string,
  scryfallId: string,
  fromBoard: Board,
  toBoard: Board
) {
  if (fromBoard === toBoard) return;
  const { supabase } = await requireUser();

  const { data: src } = await supabase
    .from("deck_cards")
    .select("id, quantity")
    .eq("deck_id", deckId)
    .eq("scryfall_id", scryfallId)
    .eq("board", fromBoard)
    .maybeSingle();
  if (!src) return;

  const { data: target } = await supabase
    .from("deck_cards")
    .select("id, quantity")
    .eq("deck_id", deckId)
    .eq("scryfall_id", scryfallId)
    .eq("board", toBoard)
    .maybeSingle();

  if (target) {
    await supabase
      .from("deck_cards")
      .update({ quantity: target.quantity + src.quantity })
      .eq("id", target.id);
    await supabase.from("deck_cards").delete().eq("id", src.id);
  } else {
    await supabase.from("deck_cards").update({ board: toBoard }).eq("id", src.id);
  }
  revalidatePath(`/decks/${deckId}`);
}

/**
 * Bulk import a pasted decklist ("1 Force of Will\n13 Island"). Resolves each
 * name to its cheapest printing, merges quantities into the main board, flags
 * basic lands as not-counting-toward-budget, and reports unmatched names.
 */
export async function importDeckList(
  deckId: string,
  text: string
): Promise<{ imported: number; unmatched: string[] }> {
  const { supabase } = await requireUser();

  const parsed: { qty: number; name: string }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;
    const m = line.match(/^(\d+)\s*x?\s+(.+)$/i);
    if (!m) continue;
    const name = m[2]
      .replace(/\s*\([A-Za-z0-9]{2,6}\)\s*[\w-]*\s*$/, "") // strip "(SET) 123"
      .replace(/\s*\*[FE]\*\s*$/, "") // strip foil/etched markers
      .trim();
    if (name) parsed.push({ qty: parseInt(m[1], 10), name });
  }
  if (parsed.length === 0) return { imported: 0, unmatched: [] };

  const uniqueNames = Array.from(new Set(parsed.map((p) => p.name)));
  const { data: matched } = await supabase
    .from("cards")
    .select("scryfall_id, name, oracle_id, type_line")
    .in("name", uniqueNames);
  const byName = new Map<
    string,
    { scryfall_id: string; oracle_id: string; type_line: string | null }
  >();
  for (const c of matched ?? []) {
    if (!byName.has(c.name))
      byName.set(c.name, {
        scryfall_id: c.scryfall_id,
        oracle_id: c.oracle_id,
        type_line: c.type_line,
      });
  }

  const oracleIds = Array.from(
    new Set([...byName.values()].map((v) => v.oracle_id))
  );
  const { data: cheap } = await supabase
    .from("card_cheapest")
    .select("oracle_id, cheapest_scryfall_id")
    .in("oracle_id", oracleIds);
  const cheapest = new Map<string, string>();
  for (const c of cheap ?? []) cheapest.set(c.oracle_id, c.cheapest_scryfall_id);

  const { data: existingRows } = await supabase
    .from("deck_cards")
    .select("scryfall_id, quantity")
    .eq("deck_id", deckId)
    .eq("board", "main");
  const existing = new Map<string, number>();
  for (const r of existingRows ?? []) existing.set(r.scryfall_id, r.quantity);

  const unmatched: string[] = [];
  const agg = new Map<string, { qty: number; counts: boolean }>();
  for (const p of parsed) {
    const card = byName.get(p.name);
    if (!card) {
      unmatched.push(p.name);
      continue;
    }
    const scryfallId = cheapest.get(card.oracle_id) ?? card.scryfall_id;
    const counts = !(card.type_line ?? "").includes("Basic");
    const cur = agg.get(scryfallId);
    if (cur) cur.qty += p.qty;
    else agg.set(scryfallId, { qty: p.qty, counts });
  }

  const rows = [...agg.entries()].map(([scryfall_id, v]) => ({
    deck_id: deckId,
    scryfall_id,
    board: "main",
    quantity: (existing.get(scryfall_id) ?? 0) + v.qty,
    counts_toward_budget: v.counts,
  }));
  if (rows.length) {
    await supabase
      .from("deck_cards")
      .upsert(rows, { onConflict: "deck_id,scryfall_id,board" });
  }
  revalidatePath(`/decks/${deckId}`);
  return { imported: rows.length, unmatched: Array.from(new Set(unmatched)) };
}

export async function setQuantity(
  deckId: string,
  scryfallId: string,
  board: Board,
  quantity: number
) {
  const { supabase } = await requireUser();
  if (quantity <= 0) {
    await supabase
      .from("deck_cards")
      .delete()
      .eq("deck_id", deckId)
      .eq("scryfall_id", scryfallId)
      .eq("board", board);
  } else {
    await supabase
      .from("deck_cards")
      .update({ quantity })
      .eq("deck_id", deckId)
      .eq("scryfall_id", scryfallId)
      .eq("board", board);
  }
  revalidatePath(`/decks/${deckId}`);
}

export async function removeCard(
  deckId: string,
  scryfallId: string,
  board: Board
) {
  const { supabase } = await requireUser();
  await supabase
    .from("deck_cards")
    .delete()
    .eq("deck_id", deckId)
    .eq("scryfall_id", scryfallId)
    .eq("board", board);
  revalidatePath(`/decks/${deckId}`);
}

/** Creator Lock In: snapshot the deck's current prices with today's date. */
export async function lockInDeck(deckId: string) {
  const { supabase, user } = await requireUser();
  const { data: totalsData } = await supabase.rpc("deck_totals", {
    p_deck_id: deckId,
  });
  const t = (totalsData as DeckTotals[] | null)?.[0];
  if (!t) return;
  await supabase.from("lock_ins").insert({
    deck_id: deckId,
    user_id: user.id,
    budget_price: t.budget_price,
    bling_price: t.bling_price,
    currency: "USD",
    kind: "creator",
  });
  revalidatePath(`/decks/${deckId}`);
}

/** Visitor Lock In: a logged-in non-owner stamps the deck to their profile. */
export async function visitorLockIn(deckId: string) {
  const { supabase, user } = await requireUser();
  const { data: totalsData } = await supabase.rpc("deck_totals", {
    p_deck_id: deckId,
  });
  const t = (totalsData as DeckTotals[] | null)?.[0];
  if (!t) return;

  const { data: existing } = await supabase
    .from("lock_ins")
    .select("id")
    .eq("deck_id", deckId)
    .eq("user_id", user.id)
    .eq("kind", "visitor")
    .maybeSingle();
  if (existing) return; // already locked in

  await supabase.from("lock_ins").insert({
    deck_id: deckId,
    user_id: user.id,
    budget_price: t.budget_price,
    bling_price: t.bling_price,
    currency: "USD",
    kind: "visitor",
  });
  revalidatePath(`/decks/${deckId}`);
}

/** Remove the current user's visitor Lock In stamp from a deck. */
export async function removeVisitorLockIn(deckId: string) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("lock_ins")
    .delete()
    .eq("deck_id", deckId)
    .eq("user_id", user.id)
    .eq("kind", "visitor");
  revalidatePath(`/decks/${deckId}`);
}

/** Designate (or clear) a card as the deck's commander. */
export async function toggleCommander(deckId: string, scryfallId: string) {
  const { supabase } = await requireUser();
  const { data: existing } = await supabase
    .from("deck_cards")
    .select("is_commander")
    .eq("deck_id", deckId)
    .eq("scryfall_id", scryfallId)
    .eq("board", "main")
    .maybeSingle();

  if (existing?.is_commander) {
    await supabase
      .from("deck_cards")
      .update({ is_commander: false })
      .eq("deck_id", deckId)
      .eq("scryfall_id", scryfallId)
      .eq("board", "main");
  } else {
    // For now a single commander: clear others, then set this one (on main).
    await supabase
      .from("deck_cards")
      .update({ is_commander: false })
      .eq("deck_id", deckId)
      .eq("is_commander", true);
    await supabase
      .from("deck_cards")
      .update({ is_commander: true, board: "main" })
      .eq("deck_id", deckId)
      .eq("scryfall_id", scryfallId);
  }
  revalidatePath(`/decks/${deckId}`);
}

export async function setCountsTowardBudget(
  deckId: string,
  scryfallId: string,
  board: Board,
  value: boolean
) {
  const { supabase } = await requireUser();
  await supabase
    .from("deck_cards")
    .update({ counts_toward_budget: value })
    .eq("deck_id", deckId)
    .eq("scryfall_id", scryfallId)
    .eq("board", board);
  revalidatePath(`/decks/${deckId}`);
}
