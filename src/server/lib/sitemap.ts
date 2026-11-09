import { COLLECTIONS, COLLECTION_MIN_POSTS } from "@/shared/constants/collections";
import { SITE_URL } from "@/shared/constants/site";
import { GUIDES } from "@/shared/content/guides";

export interface SitemapEntry {
  path: string;
  lastmod?: string;
}

// /corner is personal to each visitor and deliberately left out.
const STATIC_PATHS = ["/", "/duel", "/about", "/guidelines", "/help", "/contact", "/privacy", "/terms"];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Only pages that are indexable go in; thin collections are left out until they fill up. */
export function sitemapEntries(collectionPostCounts: Record<string, number>): SitemapEntry[] {
  return [
    ...STATIC_PATHS.map((path) => ({ path })),
    ...COLLECTIONS.filter(
      (collection) => (collectionPostCounts[collection.slug] ?? 0) >= COLLECTION_MIN_POSTS,
    ).map((collection) => ({ path: `/wall/${collection.slug}` })),
    ...(GUIDES.length > 0 ? [{ path: "/guides" }] : []),
    ...GUIDES.map((guide) => ({ path: `/guides/${guide.slug}`, lastmod: guide.updated })),
  ];
}

export function renderSitemap(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : "";
      return `  <url><loc>${escapeXml(`${SITE_URL}${entry.path}`)}</loc>${lastmod}</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
