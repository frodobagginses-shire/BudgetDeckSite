"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Update the signed-in user's handle + display name. Handles are unique and
 * URL-facing, so they are normalized to lowercase and format-checked. */
export async function updateProfile(
  handle: string,
  displayName: string
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You are not signed in." };

  const h = handle.trim().toLowerCase();
  if (!/^[a-z0-9_-]{3,30}$/.test(h)) {
    return {
      ok: false,
      message:
        "Handle must be 3 to 30 characters using letters, numbers, dashes, or underscores.",
    };
  }
  const name = displayName.trim().slice(0, 60);

  // Friendly pre-check (the unique index is the real guard).
  const { data: taken } = await supabase
    .from("users")
    .select("id")
    .eq("handle", h)
    .neq("id", user.id)
    .maybeSingle();
  if (taken) return { ok: false, message: "That handle is already taken." };

  const { error } = await supabase
    .from("users")
    .update({ handle: h, display_name: name || null })
    .eq("id", user.id);
  if (error) {
    if (error.code === "23505")
      return { ok: false, message: "That handle is already taken." };
    return { ok: false, message: error.message };
  }

  revalidatePath("/account");
  return { ok: true };
}

/** Resolve an oracle card to a printing with usable art for the avatar
 * editor. Prefers the cheapest printing; falls back to any with art. */
export async function getCardArt(oracleId: string): Promise<{
  scryfallId: string;
  artUrl: string;
  name: string;
} | null> {
  const supabase = await createClient();
  const { data: cheap } = await supabase
    .from("card_cheapest")
    .select("cheapest_scryfall_id")
    .eq("oracle_id", oracleId)
    .maybeSingle();
  if (cheap?.cheapest_scryfall_id) {
    const { data } = await supabase
      .from("cards")
      .select("scryfall_id, name, image_art_crop")
      .eq("scryfall_id", cheap.cheapest_scryfall_id)
      .maybeSingle();
    if (data?.image_art_crop) {
      return {
        scryfallId: data.scryfall_id,
        artUrl: data.image_art_crop,
        name: data.name,
      };
    }
  }
  const { data } = await supabase
    .from("cards")
    .select("scryfall_id, name, image_art_crop")
    .eq("oracle_id", oracleId)
    .not("image_art_crop", "is", null)
    .limit(1)
    .maybeSingle();
  if (!data?.image_art_crop) return null;
  return {
    scryfallId: data.scryfall_id,
    artUrl: data.image_art_crop,
    name: data.name,
  };
}

/** Save (or clear, with null cardId) the signed-in user's card-art avatar. */
export async function updateAvatar(
  cardId: string | null,
  x: number,
  y: number,
  zoom: number
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You are not signed in." };

  const clamp = (n: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));

  if (cardId) {
    const { data: card } = await supabase
      .from("cards")
      .select("scryfall_id")
      .eq("scryfall_id", cardId)
      .maybeSingle();
    if (!card) return { ok: false, message: "Card not found." };
  }

  const { error } = await supabase
    .from("users")
    .update({
      avatar_card_id: cardId,
      avatar_x: clamp(x, 0, 100),
      avatar_y: clamp(y, 0, 100),
      avatar_zoom: clamp(zoom, 1, 4),
    })
    .eq("id", user.id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/account");
  return { ok: true };
}
