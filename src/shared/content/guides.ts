import { parseFrontmatter, parseMarkdown, type Block } from "@/shared/lib/markdown";

export interface Guide {
  slug: string;
  title: string;
  description: string;
  author: string;
  published: string;
  updated: string;
  blocks: Block[];
  wordCount: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Returns null for drafts, and for files whose name starts with "_" such as the template. */
export function parseGuide(fileName: string, raw: string): Guide | null {
  const slug = fileName.replace(/^.*\//, "").replace(/\.md$/, "");
  if (slug.startsWith("_")) return null;
  const { fields, body } = parseFrontmatter(raw);
  if (fields["draft"] === "true") return null;

  const { title, description, author, published } = fields;
  if (!title || !description || !author || !published || !ISO_DATE.test(published)) {
    throw new Error(
      `Guide "${slug}" needs title, description, author and a published date (YYYY-MM-DD).`,
    );
  }
  const updated = fields["updated"] && ISO_DATE.test(fields["updated"]) ? fields["updated"] : published;
  return {
    slug,
    title,
    description,
    author,
    published,
    updated,
    blocks: parseMarkdown(body),
    wordCount: body.split(/\s+/).filter(Boolean).length,
  };
}

const files = import.meta.glob<string>("/src/content/guides/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

export const GUIDES: readonly Guide[] = Object.entries(files)
  .map(([path, raw]) => parseGuide(path, raw))
  .filter((guide): guide is Guide => guide !== null)
  .sort((a, b) => b.published.localeCompare(a.published));

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}
