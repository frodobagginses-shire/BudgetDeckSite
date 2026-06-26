import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArticleBody } from "@/components/articles/article-body";
import { tcgplayerCardUrl } from "@/lib/affiliate";
import type { Article } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("title, excerpt")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return { title: "Article — Budget Deck Site" };
  return {
    title: `${data.title} — Budget Deck Site`,
    description: data.excerpt ?? undefined,
    openGraph: { title: data.title as string },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) notFound();
  const article = data as Article;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthorOfThis = !!user && user.id === article.author_id;
  let authorHandle: string | null = null;
  if (article.author_id) {
    const { data: a } = await supabase
      .from("users")
      .select("handle")
      .eq("id", article.author_id)
      .maybeSingle();
    authorHandle = (a?.handle as string) ?? null;
  }

  const date = article.published_at
    ? new Date(article.published_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <Link
        href="/articles"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← All articles
      </Link>

      <article className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{article.title}</h1>
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          {authorHandle && (
            <Link
              href={`/users/${authorHandle}`}
              className="hover:text-foreground"
            >
              @{authorHandle}
            </Link>
          )}
          {date && <span>{authorHandle ? "· " : ""}{date}</span>}
          {isAuthorOfThis && (
            <Link
              href={`/articles/${article.slug}/edit`}
              className="hover:text-foreground ml-auto underline"
            >
              Edit
            </Link>
          )}
        </div>
        <div className="mt-2">
          <ArticleBody body={article.body_md} />
        </div>
      </article>

      {article.featured_cards.length > 0 && (
        <section className="border-border rounded-xl border p-4">
          <div className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
            Cards in this article
          </div>
          <ul className="flex flex-col gap-2">
            {article.featured_cards.map((name) => (
              <li key={name} className="flex items-center justify-between gap-3">
                <span className="text-sm">{name}</span>
                <a
                  href={tcgplayerCardUrl(name)}
                  target="_blank"
                  rel="noopener noreferrer nofollow sponsored"
                  className="bg-brand-600 rounded-md px-3 py-1 text-xs font-medium text-white hover:opacity-90"
                >
                  Buy on TCGplayer
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
