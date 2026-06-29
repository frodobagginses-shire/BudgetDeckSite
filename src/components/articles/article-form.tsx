import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/markdown-editor";

export interface ArticleFormDefaults {
  title?: string;
  slug?: string;
  excerpt?: string;
  body_md?: string;
  featured_cards?: string;
  published?: boolean;
  featured?: boolean;
}

export function ArticleForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults?: ArticleFormDefaults;
  submitLabel: string;
}) {
  const d = defaults ?? {};
  const field =
    "border-border bg-background rounded-md border px-3 py-2 text-sm";
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Title</span>
        <input name="title" defaultValue={d.title} required className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Slug</span>
        <input
          name="slug"
          defaultValue={d.slug}
          placeholder="auto-generated from title"
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Excerpt</span>
        <input name="excerpt" defaultValue={d.excerpt} className={field} />
      </label>
      <div className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Body (Markdown)</span>
        <MarkdownEditor
          name="body_md"
          defaultValue={d.body_md}
          rows={18}
          placeholder="Write your article in Markdown…"
        />
        <span className="text-muted-foreground text-xs">
          Tip: wrap card names in [[double brackets]] to auto-link them — e.g.
          [[Lightning Bolt]] — for hover images and a buy button.
        </span>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Featured cards (comma-separated)</span>
        <input
          name="featured_cards"
          defaultValue={d.featured_cards}
          placeholder="Unexplained Absence, Dismantling Wave"
          className={field}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="publish" defaultChecked={d.published} />
        Published
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" defaultChecked={d.featured} />
        Feature on homepage (replaces the current featured article)
      </label>
      <Button type="submit" className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
