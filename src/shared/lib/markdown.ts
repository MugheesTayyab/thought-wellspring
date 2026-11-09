// A deliberately small Markdown subset for guide articles. It produces plain data
// that React renders as text, so article files can never inject HTML.

export type InlineNode =
  | { type: "text"; text: string }
  | { type: "strong"; text: string }
  | { type: "em"; text: string }
  | { type: "link"; text: string; href: string };

export type Block =
  | { type: "h2" | "h3"; text: string }
  | { type: "p"; inline: InlineNode[] }
  | { type: "quote"; inline: InlineNode[] }
  | { type: "ul" | "ol"; items: InlineNode[][] };

const INLINE_PATTERN = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

function isSafeHref(href: string): boolean {
  return /^(https?:\/\/|mailto:|\/(?!\/))/i.test(href);
}

export function parseInline(source: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let cursor = 0;
  for (const match of source.matchAll(INLINE_PATTERN)) {
    const index = match.index;
    if (index > cursor) nodes.push({ type: "text", text: source.slice(cursor, index) });
    if (match[1] !== undefined) nodes.push({ type: "strong", text: match[1] });
    else if (match[2] !== undefined) nodes.push({ type: "em", text: match[2] });
    else if (match[3] !== undefined && match[4] !== undefined) {
      nodes.push(
        isSafeHref(match[4])
          ? { type: "link", text: match[3], href: match[4] }
          : { type: "text", text: match[3] },
      );
    }
    cursor = index + match[0].length;
  }
  if (cursor < source.length) nodes.push({ type: "text", text: source.slice(cursor) });
  return nodes;
}

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of source.replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    const lines = chunk
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;
    const first = lines[0]!;

    if (first.startsWith("### ")) blocks.push({ type: "h3", text: first.slice(4).trim() });
    else if (first.startsWith("## ")) blocks.push({ type: "h2", text: first.slice(3).trim() });
    else if (lines.every((line) => /^[-*] /.test(line)))
      blocks.push({ type: "ul", items: lines.map((line) => parseInline(line.slice(2).trim())) });
    else if (lines.every((line) => /^\d+\. /.test(line)))
      blocks.push({
        type: "ol",
        items: lines.map((line) => parseInline(line.replace(/^\d+\. /, "").trim())),
      });
    else if (lines.every((line) => line.startsWith(">")))
      blocks.push({
        type: "quote",
        inline: parseInline(lines.map((line) => line.replace(/^>\s?/, "")).join(" ")),
      });
    else blocks.push({ type: "p", inline: parseInline(lines.join(" ")) });
  }
  return blocks;
}

export function parseFrontmatter(raw: string): { fields: Record<string, string>; body: string } {
  const match = raw.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { fields: {}, body: raw };
  const fields: Record<string, string> = {};
  for (const line of match[1]!.split("\n")) {
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    fields[line.slice(0, separator).trim()] = line
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return { fields, body: match[2]! };
}
