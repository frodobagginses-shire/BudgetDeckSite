import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createArticle } from "@/app/articles/actions";
import { ArticleForm } from "@/components/articles/article-form";

export default async function NewArticlePage() {
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

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">New article</h1>
      <ArticleForm action={createArticle} submitLabel="Create article" />
    </main>
  );
}
