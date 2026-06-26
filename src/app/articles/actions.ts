"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAuthor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("users")
    .select("is_author")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_author) redirect("/articles");
  return { supabase, user };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseForm(formData: FormData) {
  const title = String(formData.get("title") || "").trim() || "Untitled";
  const slugInput = String(formData.get("slug") || "").trim();
  const slug = (slugInput ? slugify(slugInput) : slugify(title)) || `article-${Date.now()}`;
  const excerpt = String(formData.get("excerpt") || "").trim() || null;
  const body_md = String(formData.get("body_md") || "");
  const featured_cards = String(formData.get("featured_cards") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const publish = formData.get("publish") === "on";
  return { title, slug, excerpt, body_md, featured_cards, publish };
}

export async function createArticle(formData: FormData) {
  const { supabase, user } = await requireAuthor();
  const f = parseForm(formData);
  const { data, error } = await supabase
    .from("articles")
    .insert({
      slug: f.slug,
      title: f.title,
      excerpt: f.excerpt,
      body_md: f.body_md,
      featured_cards: f.featured_cards,
      author_id: user.id,
      published_at: f.publish ? new Date().toISOString() : null,
    })
    .select("slug")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Could not create article");
  }
  redirect(`/articles/${data.slug}`);
}

export async function updateArticle(articleId: string, formData: FormData) {
  const { supabase } = await requireAuthor();
  const f = parseForm(formData);

  const { data: existing } = await supabase
    .from("articles")
    .select("published_at")
    .eq("id", articleId)
    .maybeSingle();
  // Preserve the original publish date; only stamp when first published.
  let published_at: string | null = null;
  if (f.publish) {
    published_at =
      (existing?.published_at as string | null) ?? new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("articles")
    .update({
      slug: f.slug,
      title: f.title,
      excerpt: f.excerpt,
      body_md: f.body_md,
      featured_cards: f.featured_cards,
      published_at,
    })
    .eq("id", articleId)
    .select("slug")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Could not update article");
  }
  redirect(`/articles/${data.slug}`);
}

export async function deleteArticle(articleId: string) {
  const { supabase } = await requireAuthor();
  await supabase.from("articles").delete().eq("id", articleId);
  redirect("/articles");
}
