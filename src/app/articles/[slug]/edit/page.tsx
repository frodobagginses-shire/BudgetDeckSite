import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteArticle, updateArticle } from "@/app/articles/actions";
import { ArticleForm } from "@/components/articles/article-form";
import type { Article } from "@/lib/types";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) notFound();
  const article = data as Article;
  if (article.author_id !== user.id) redirect(`/articles/${slug}`);

  const updateBound = updateArticle.bind(null, article.id);
  const deleteBound = deleteArticle.bind(null, article.id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Edit article</h1>
      <ArticleForm
        action={updateBound}
        submitLabel="Save changes"
        defaults={{
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt ?? "",
          body_md: article.body_md,
          featured_cards: article.featured_cards.join(", "),
          published: !!article.published_at,
        }}
      />
      <form action={deleteBound} className="border-border border-t pt-4">
        <button
          type="submit"
          className="text-muted-foreground hover:text-destructive text-xs"
        >
          Delete article
        </button>
      </form>
    </main>
  );
}
