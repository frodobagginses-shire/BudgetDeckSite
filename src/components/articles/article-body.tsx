import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { MarkdownAnchor } from "@/components/markdown-anchor";

/** Pre-process article Markdown:
 * - [[Card Name]] → a `card:` link the MarkdownAnchor turns into an interactive
 *   card chip (hover image, click for buy modal).
 * - a YouTube URL alone on a line → a `ytembed:` token rendered as an iframe. */
function preprocess(body: string): string {
  let out = body.replace(
    /\[\[([^\][]+)\]\]/g,
    (_, name: string) => `[${name.trim()}](card:${encodeURIComponent(name.trim())})`
  );
  out = out.replace(
    /^[ \t]*(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})\S*[ \t]*$/gim,
    (_, id: string) => `[YouTube video](ytembed:${id})`
  );
  return out;
}

/** Renders article/primer Markdown. react-markdown does not emit raw HTML, so
 * this is safe to render without a separate sanitizer. */
export function ArticleBody({ body }: { body: string }) {
  return (
    <div className="text-[0.95rem] leading-relaxed [&_a]:text-brand-600 [&_a]:underline [&_blockquote]:border-border [&_blockquote]:text-muted-foreground [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:font-semibold [&_img]:mx-auto [&_img]:my-4 [&_img]:max-h-[26rem] [&_img]:w-auto [&_img]:rounded-xl [&_img]:border [&_img]:border-border [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) =>
          url.startsWith("card:") || url.startsWith("ytembed:")
            ? url
            : defaultUrlTransform(url)
        }
        components={{ a: MarkdownAnchor }}
      >
        {preprocess(body)}
      </ReactMarkdown>
    </div>
  );
}
