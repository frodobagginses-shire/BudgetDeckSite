"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

type Result = { ok: boolean; message?: string };

export async function createMatch(
  playgroupId: string,
  inviteeIds: string[],
  priceLimit: number | null
): Promise<Result> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("create_match", {
    p_playgroup: playgroupId,
    p_invitees: inviteeIds,
    p_price_limit: priceLimit,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/matches");
  return { ok: true };
}

export async function setMatchDeck(
  matchId: string,
  userId: string,
  deckId: string | null
): Promise<Result> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("set_match_deck", {
    p_match: matchId,
    p_user: userId,
    p_deck: deckId,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/matches");
  return { ok: true };
}

export async function respondInvite(
  matchId: string,
  accept: boolean,
  deckId: string | null
): Promise<Result> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("respond_invite", {
    p_match: matchId,
    p_accept: accept,
    p_deck: deckId,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/matches");
  return { ok: true };
}

export async function joinMatch(
  code: string,
  deckId: string | null
): Promise<Result> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("join_match", {
    p_code: code.trim(),
    p_deck: deckId,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/matches");
  return { ok: true };
}

export async function submitResult(
  matchId: string,
  winnerId: string | null,
  isDraw: boolean
): Promise<Result> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("submit_result", {
    p_match: matchId,
    p_winner: winnerId,
    p_draw: isDraw,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/matches");
  return { ok: true };
}

export async function respondResult(
  resultId: string,
  accept: boolean
): Promise<Result> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("respond_result", {
    p_result: resultId,
    p_accept: accept,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/matches");
  return { ok: true };
}
