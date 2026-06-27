import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import type { ComponentProps } from "react";
import remarkGfm from "remark-gfm";
import { MarkdownAnchor } from "@/components/markdown-anchor";

/** Pre-process article Markdown:
 * - [[Card Name]] → a `card:` link the MarkdownAnchor turns into an interactive
 *   card chip (hover image, click for buy modal).
 * - a YouTube URL alone on a line → a `ytembed:` token rendered as an iframe.
 * - mana tokens like {3}{W}, {T}, {W/U} → inline mana symbol images. */
function preprocess(body: string): string {
  let out = body.replace(
    /\[\[([^\][]+)\]\]/g,
    (_, name: string) => `[${name.trim()}](card:${encodeURIComponent(name.trim())})`
  );
  out = out.replace(
    /^[ \t]*(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})\S*[ \t]*$/gim,
    (_, id: string) => `[YouTube video](ytembed:${id})`
  );
  out = out.replace(
    /\{([0-9WUBRGCSXYZPTQ]+(?:\/[0-9WUBRGCSXYZPTQ]+)*)\}/gi,
    (_, token: string) =>
      `![{${token}}](mana:${token.toUpperCase().replace(/\//g, "")})`
  );
  return out;
}

/** Image renderer. `mana:CODE` → an inline MTG mana symbol (Scryfall symbol
 * SVG), sized to the text; anything else → a normal block content image.
 * Inline styles are used for the symbol so it never depends on a purgeable
 * utility class. */
export function MarkdownImage({ src, alt }: ComponentProps<"img">) {
  const url = typeof src === "string" ? src : "";

  if (url.startsWith("mana:")) {
    const code = url.slice("mana:".length);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://svgs.scryfall.io/card-symbols/${code}.svg`}
        alt={alt ?? code}
        style={{
          display: "inline-block",
          height: "1em",
          width: "1em",
          verticalAlign: "-0.125em",
          margin: "0 0.05em",
        }}
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={url}
      alt={alt ?? ""}
      className="border-border mx-auto my-4 max-h-[26rem] w-auto rounded-xl border"
    />
  );
}

/** Renders article/primer Markdown. react-markdown does not emit raw HTML, so
 * this is safe to render without a separate sanitizer. */
export function ArticleBody({ body }: { body: string }) {
  return (
    <div className="text-[0.95rem] leading-relaxed [&_a]:text-brand-600 [&_a]:underline [&_blockquote]:border-border [&_blockquote]:text-muted-foreground [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) =>
          url.startsWith("card:") ||
          url.startsWith("ytembed:") ||
          url.startsWith("mana:")
            ? url
            : defaultUrlTransform(url)
        }
        components={{ a: MarkdownAnchor, img: MarkdownImage }}
      >
        {preprocess(body)}
      </ReactMarkdown>
    </div>
  );
}
