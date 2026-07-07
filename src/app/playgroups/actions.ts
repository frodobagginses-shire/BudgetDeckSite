"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { GAME_FORMATS } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

type Result = { ok: boolean; message?: string };

export async function createPlaygroup(
  name: string,
  format: string
): Promise<Result> {
  const { supabase, user } = await requireUser();
  const n = name.trim().slice(0, 40);
  if (!n) return { ok: false, message: "Give your playgroup a name." };
  if (!(GAME_FORMATS as readonly string[]).includes(format)) {
    return { ok: false, message: "Pick a format first." };
  }
  const { data, error } = await supabase
    .from("playgroups")
    .insert({ owner_id: user.id, name: n, game_format: format })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: error?.message ?? "Failed." };
  await supabase
    .from("playgroup_members")
    .insert({ playgroup_id: data.id, user_id: user.id });
  revalidatePath("/playgroups");
  return { ok: true };
}

/** Owner-only format change; the DB trigger blocks it if the current member
 * count doesn't fit the new format. */
export async function setPlaygroupFormat(
  groupId: string,
  format: string
): Promise<Result> {
  const { supabase } = await requireUser();
  if (!(GAME_FORMATS as readonly string[]).includes(format)) {
    return { ok: false, message: "Unknown format." };
  }
  const { error } = await supabase
    .from("playgroups")
    .update({ game_format: format })
    .eq("id", groupId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/playgroups");
  return { ok: true };
}

export async function addToPlaygroup(
  groupId: string,
  userId: string
): Promise<Result> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("playgroup_members")
    .insert({ playgroup_id: groupId, user_id: userId });
  if (error) {
    if (error.code === "23505")
      return { ok: false, message: "Already in that playgroup." };
    return { ok: false, message: error.message };
  }
  revalidatePath("/playgroups");
  return { ok: true };
}

export async function removeFromPlaygroup(
  groupId: string,
  userId: string
): Promise<Result> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("playgroup_members")
    .delete()
    .eq("playgroup_id", groupId)
    .eq("user_id", userId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/playgroups");
  return { ok: true };
}

export async function joinPlaygroup(code: string): Promise<Result> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("join_playgroup", {
    p_code: code.trim(),
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/playgroups");
  return { ok: true };
}
