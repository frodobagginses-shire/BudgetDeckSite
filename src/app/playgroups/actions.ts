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

export async function createPlaygroup(name: string): Promise<Result> {
  const { supabase, user } = await requireUser();
  const n = name.trim().slice(0, 40);
  if (!n) return { ok: false, message: "Give your playgroup a name." };
  const { data, error } = await supabase
    .from("playgroups")
    .insert({ owner_id: user.id, name: n })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: error?.message ?? "Failed." };
  await supabase
    .from("playgroup_members")
    .insert({ playgroup_id: data.id, user_id: user.id });
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
