// MarkdownImage now lives in article-body.tsx (an always-tracked file) so the
// mana-symbol feature can't be lost to an uncommitted new file. Re-export for
// any remaining imports.
export { MarkdownImage } from "@/components/articles/article-body";
