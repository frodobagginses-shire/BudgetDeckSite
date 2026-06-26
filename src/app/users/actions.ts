"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Follow or unfollow a user (toggle). */
export async function toggleFollow(userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.id === userId) return; // can't follow yourself

  const { data: existing } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", userId);
  } else {
    await supabase
      .from("follows")
      .insert({ follower_id: user.id, following_id: userId });
  }
}
