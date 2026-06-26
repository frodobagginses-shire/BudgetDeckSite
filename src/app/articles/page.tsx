import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ArticleSummary } from "@/lib/types";

export const metadata = {
  title: "Articles — Budget Deck Site",
  description:
    "Deep dives on underpriced, underplayed Magic cards and budget builds.",
};

export default async function ArticlesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("slug, title, excerpt, published_at")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });
  const articles = (data ?? []) as ArticleSummary[];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isAuthor = false;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("is_author")
      .eq("id", user.id)
      .maybeSingle();
    isAuthor = !!profile?.is_author;
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Articles</h1>
          <p className="text-muted-foreground text-sm">
            Underpriced cards and budget builds — what to play and why.
          </p>
        </div>
        {isAuthor && (
          <Link
            href="/articles/new"
            className="bg-primary text-primary-foreground shrink-0 rounded-md px-3 py-2 text-sm font-medium hover:opacity-90"
          >
            New article
          </Link>
        )}
      </div>

      {articles.length === 0 ? (
        <p className="text-muted-foreground text-sm">No articles yet.</p>
      ) : (
        <ul className="divide-border divide-y">
          {articles.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/articles/${a.slug}`}
                className="hover:bg-muted block rounded-md px-2 py-4"
              >
                <div className="font-semibold">{a.title}</div>
                {a.excerpt && (
                  <div className="text-muted-foreground mt-1 text-sm">
                    {a.excerpt}
                  </div>
                )}
                {a.published_at && (
                  <div className="text-muted-foreground mt-1 text-xs">
                    {new Date(a.published_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
