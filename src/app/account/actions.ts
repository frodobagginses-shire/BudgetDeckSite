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
