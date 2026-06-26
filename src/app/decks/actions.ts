"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Board } from "@/lib/types";

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

/** Add a card by oracle id; resolves to the cheapest printing as the default. */
export async function addCard(deckId: string, oracleId: string) {
  const { supabase } = await requireUser();

  const { data: cheap } = await supabase
    .from("card_cheapest")
    .select("cheapest_scryfall_id")
    .eq("oracle_id", oracleId)
    .maybeSingle();
  let scryfallId = cheap?.cheapest_scryfall_id as string | undefined;

  if (!scryfallId) {
    const { data: any1 } = await supabase
      .from("cards")
      .select("scryfall_id")
      .eq("oracle_id", oracleId)
      .limit(1)
      .maybeSingle();
    scryfallId = any1?.scryfall_id as string | undefined;
  }
  if (!scryfallId) return;

  const { data: existing } = await supabase
    .from("deck_cards")
    .select("id, quantity")
    .eq("deck_id", deckId)
    .eq("scryfall_id", scryfallId)
    .eq("board", "main")
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("deck_cards")
      .update({ quantity: existing.quantity + 1 })
      .eq("id", existing.id);
    if (error) console.error("[addCard] update error", error.message);
  } else {
    const { error } = await supabase.from("deck_cards").insert({
      deck_id: deckId,
      scryfall_id: scryfallId,
      quantity: 1,
      board: "main",
    });
    if (error) console.error("[addCard] insert error", error.message);
  }
  revalidatePath(`/decks/${deckId}`);
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
