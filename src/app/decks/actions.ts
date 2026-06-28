"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Board, DeckTotals } from "@/lib/types";
import { ARCHETYPE_SET, MAX_ARCHETYPES } from "@/lib/archetypes";
import {
  canBeCommander,
  isBackground,
  partnersAllowed,
  unlimitedCopies,
  maxCopies,
  type RulesCard,
} from "@/lib/commander";

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

  const commanderOracle = String(
    formData.get("commander_oracle_id") || ""
  ).trim();
  if (commanderOracle && game_format === "commander") {
    const { data: cheap } = await supabase
      .from("card_cheapest")
      .select("cheapest_scryfall_id")
      .eq("oracle_id", commanderOracle)
      .maybeSingle();
    let scryfallId = cheap?.cheapest_scryfall_id as string | undefined;
    if (!scryfallId) {
      const { data: anyc } = await supabase
        .from("cards")
        .select("scryfall_id")
        .eq("oracle_id", commanderOracle)
        .limit(1)
        .maybeSingle();
      scryfallId = anyc?.scryfall_id as string | undefined;
    }
    if (scryfallId) {
      const { data: rules } = await supabase
        .from("cards")
        .select("name, type_line, oracle_text, keywords")
        .eq("scryfall_id", scryfallId)
        .maybeSingle();
      await supabase.from("deck_cards").insert({
        deck_id: data.id,
        scryfall_id: scryfallId,
        quantity: 1,
        board: "main",
        // Only flag it as commander if it's actually a legal commander.
        is_commander: rules ? canBeCommander(rules as RulesCard) : false,
      });
    }
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

/** Toggle whether a deck's match W/L record is public. */
export async function setRecordPublic(deckId: string, isPublic: boolean) {
  const { supabase } = await requireUser();
  await supabase
    .from("decks")
    .update({ record_public: isPublic })
    .eq("id", deckId);
  revalidatePath(`/decks/${deckId}`);
}

/** Set up to 3 archetype tags on a deck (validated against the known list). */
export async function setArchetypes(deckId: string, archetypes: string[]) {
  const { supabase } = await requireUser();
  const clean = Array.from(new Set(archetypes))
    .filter((a) => ARCHETYPE_SET.has(a))
    .slice(0, MAX_ARCHETYPES);
  await supabase.from("decks").update({ archetypes: clean }).eq("id", deckId);
  revalidatePath(`/decks/${deckId}`);
}

/** Set the banner focal position (object-position percentages, 0–100). */
export async function setBannerPosition(
  deckId: string,
  x: number,
  y: number
) {
  const { supabase } = await requireUser();
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  await supabase
    .from("decks")
    .update({ banner_pos_x: clamp(x), banner_pos_y: clamp(y) })
    .eq("id", deckId);
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
    type_line: string | null;
    oracle_text: string | null;
    keywords: string[] | null;
  };
  let card: CardInfo | null = null;
  const cardCols =
    "name, legalities, color_identity, type_line, oracle_text, keywords";

  if (scryfallId) {
    const { data } = await supabase
      .from("cards")
      .select(cardCols)
      .eq("scryfall_id", scryfallId)
      .maybeSingle();
    if (data) card = data as CardInfo;
  }
  if (!scryfallId) {
    const { data } = await supabase
      .from("cards")
      .select(`scryfall_id, ${cardCols}`)
      .eq("oracle_id", oracleId)
      .limit(1)
      .maybeSingle();
    scryfallId = data?.scryfall_id as string | undefined;
    if (data) card = data as unknown as CardInfo;
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

  // Copy limits: Commander is singleton; other constructed formats allow 4.
  // Basics and "any number of cards named …" are exempt.
  if (format !== "casual" && existing && card && !unlimitedCopies(card)) {
    const limit = maxCopies(format);
    if (existing.quantity >= limit) {
      return {
        ok: false,
        message:
          format === "commander"
            ? `${card.name}: Commander is singleton (one copy).`
            : `${card.name}: max ${limit} copies in ${format}.`,
      };
    }
  }

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
  // Resolve every name to a single (cheapest) printing in one shot. The RPC
  // returns at most one row per name — case-insensitive, with double-faced
  // front names handled — so results can't be truncated by the API row cap.
  const { data: matched } = await supabase.rpc("resolve_card_names", {
    p_names: uniqueNames,
  });
  const byName = new Map<
    string,
    { scryfall_id: string; type_line: string | null }
  >();
  for (const c of (matched ?? []) as {
    input_name: string;
    scryfall_id: string;
    type_line: string | null;
  }[]) {
    byName.set(c.input_name.toLowerCase(), {
      scryfall_id: c.scryfall_id,
      type_line: c.type_line,
    });
  }

  // Deck format + rules for the matched cards (for banlist + copy limits).
  const { data: deck } = await supabase
    .from("decks")
    .select("game_format")
    .eq("id", deckId)
    .maybeSingle();
  const format = (deck?.game_format ?? "casual") as string;

  const sids = [...new Set([...byName.values()].map((v) => v.scryfall_id))];
  type Rules = RulesCard & { legalities: Record<string, string> | null };
  const rulesById = new Map<string, Rules>();
  if (sids.length) {
    const { data: rulesRows } = await supabase
      .from("cards")
      .select("scryfall_id, legalities, name, type_line, oracle_text, keywords")
      .in("scryfall_id", sids);
    for (const r of (rulesRows ?? []) as (Rules & { scryfall_id: string })[])
      rulesById.set(r.scryfall_id, r);
  }

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
    const card = byName.get(p.name.toLowerCase());
    if (!card) {
      unmatched.push(p.name);
      continue;
    }
    const scryfallId = card.scryfall_id;
    const rules = rulesById.get(scryfallId);
    // Skip cards banned/illegal in this format.
    if (format !== "casual" && rules?.legalities) {
      const st = rules.legalities[format];
      if (st && st !== "legal" && st !== "restricted") {
        unmatched.push(`${p.name} (not legal in ${format})`);
        continue;
      }
    }
    const counts = !(card.type_line ?? "").includes("Basic");
    const cur = agg.get(scryfallId);
    if (cur) cur.qty += p.qty;
    else agg.set(scryfallId, { qty: p.qty, counts });
  }

  const rows = [...agg.entries()].map(([scryfall_id, v]) => {
    const rules = rulesById.get(scryfall_id);
    let quantity = (existing.get(scryfall_id) ?? 0) + v.qty;
    if (format !== "casual" && (!rules || !unlimitedCopies(rules))) {
      quantity = Math.min(quantity, maxCopies(format));
    }
    return {
      deck_id: deckId,
      scryfall_id,
      board: "main",
      quantity,
      counts_toward_budget: v.counts,
    };
  });
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
    revalidatePath(`/decks/${deckId}`);
    return;
  }

  // Clamp to the format's copy limit (Commander singleton; others 4), unless
  // the card is exempt (basics / "any number").
  if (quantity > 1 && board === "main") {
    const { data: deck } = await supabase
      .from("decks")
      .select("game_format")
      .eq("id", deckId)
      .maybeSingle();
    const format = (deck?.game_format ?? "casual") as string;
    if (format !== "casual") {
      const { data: c } = await supabase
        .from("cards")
        .select("name, type_line, oracle_text, keywords")
        .eq("scryfall_id", scryfallId)
        .maybeSingle();
      if (!c || !unlimitedCopies(c as RulesCard)) {
        quantity = Math.min(quantity, maxCopies(format));
      }
    }
  }

  await supabase
    .from("deck_cards")
    .update({ quantity })
    .eq("deck_id", deckId)
    .eq("scryfall_id", scryfallId)
    .eq("board", board);
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

/** Admin retroactive Lock In: stamp a backdated creator Lock-In on any deck
 * (attributed to that deck's owner). Gated to admins by the SQL function. */
export async function adminLockIn(
  deckId: string,
  lockedAtISO: string,
  budget: number,
  bling: number | null
): Promise<{ ok: boolean; message?: string }> {
  const { supabase, user } = await requireUser();
  const { data: prof } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!prof?.is_admin) return { ok: false, message: "Admins only." };

  const { error } = await supabase.rpc("admin_lock_in", {
    p_deck_id: deckId,
    p_locked_at: lockedAtISO,
    p_budget: budget,
    p_bling: bling,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/decks/${deckId}`);
  return { ok: true };
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

/** Designate (or clear) a card as the deck's commander, enforcing commander
 * legality and partner rules. Returns a message when a choice is rejected. */
export async function toggleCommander(
  deckId: string,
  scryfallId: string
): Promise<{ ok: boolean; message?: string }> {
  const { supabase } = await requireUser();
  const { data: existing } = await supabase
    .from("deck_cards")
    .select("is_commander")
    .eq("deck_id", deckId)
    .eq("scryfall_id", scryfallId)
    .eq("board", "main")
    .maybeSingle();

  // Unsetting is always allowed.
  if (existing?.is_commander) {
    await supabase
      .from("deck_cards")
      .update({ is_commander: false })
      .eq("deck_id", deckId)
      .eq("scryfall_id", scryfallId)
      .eq("board", "main");
    revalidatePath(`/decks/${deckId}`);
    return { ok: true };
  }

  const { data: candData } = await supabase
    .from("cards")
    .select("name, type_line, oracle_text, keywords")
    .eq("scryfall_id", scryfallId)
    .maybeSingle();
  if (!candData) return { ok: false, message: "Card not found." };
  const candidate = candData as RulesCard;

  const { data: cmdRows } = await supabase
    .from("deck_cards")
    .select("scryfall_id")
    .eq("deck_id", deckId)
    .eq("is_commander", true);
  const cmdIds = (cmdRows ?? []).map((r) => r.scryfall_id as string);
  let currentCmds: RulesCard[] = [];
  if (cmdIds.length) {
    const { data } = await supabase
      .from("cards")
      .select("name, type_line, oracle_text, keywords")
      .in("scryfall_id", cmdIds);
    currentCmds = (data ?? []) as RulesCard[];
  }

  const setIt = async () => {
    await supabase
      .from("deck_cards")
      .update({ is_commander: true, board: "main" })
      .eq("deck_id", deckId)
      .eq("scryfall_id", scryfallId);
  };

  if (currentCmds.length === 0) {
    if (!canBeCommander(candidate)) {
      return {
        ok: false,
        message: `${candidate.name} can't be a commander. Use a legendary creature or a card that says it can be your commander.`,
      };
    }
    await setIt();
  } else if (currentCmds.length === 1) {
    const pairOk =
      partnersAllowed(currentCmds[0], candidate) &&
      (canBeCommander(candidate) || isBackground(candidate));
    if (pairOk) {
      await setIt();
    } else if (canBeCommander(candidate)) {
      // Not a legal pair, but a valid sole commander → swap.
      await supabase
        .from("deck_cards")
        .update({ is_commander: false })
        .eq("deck_id", deckId)
        .eq("is_commander", true);
      await setIt();
    } else {
      return {
        ok: false,
        message: `${candidate.name} can't pair with your current commander (needs Partner, Choose a Background, etc.).`,
      };
    }
  } else {
    return {
      ok: false,
      message: "You already have two commanders. Unset one first.",
    };
  }
  revalidatePath(`/decks/${deckId}`);
  return { ok: true };
}

/** Swap the chosen printing of a card (affects Bling price + image). */
export async function setPrinting(
  deckId: string,
  fromScryfallId: string,
  toScryfallId: string,
  board: Board
) {
  if (fromScryfallId === toScryfallId) return;
  const { supabase } = await requireUser();
  await supabase
    .from("deck_cards")
    .update({ scryfall_id: toScryfallId })
    .eq("deck_id", deckId)
    .eq("scryfall_id", fromScryfallId)
    .eq("board", board);
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
