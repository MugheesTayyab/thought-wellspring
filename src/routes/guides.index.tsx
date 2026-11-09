import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ContentPage } from "@/client/components/bajihears/ContentPage";
import { SITE_URL } from "@/shared/constants/site";
import { GUIDES } from "@/shared/content/guides";

const TITLE = "Guides on writing, letting go and saying the unsaid | BajiHears";
const DESCRIPTION =
  "Articles from BajiHears on anonymous writing, unsent letters, journaling and the things people find hard to say.";

export const Route = createFileRoute("/guides/")({
  // Until the first article is published this page does not exist, rather than
  // showing an empty "coming soon" section.
  beforeLoad: () => {
    if (GUIDES.length === 0) throw notFound();
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/guides` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/guides` }],
  }),
  component: GuidesIndex,
});

function GuidesIndex() {
  return (
    <ContentPage title="Guides" intro={<p>{DESCRIPTION}</p>}>
      <ul className="space-y-4">
        {GUIDES.map((guide) => (
          <li key={guide.slug} className="paper-card p-5">
            <Link
              to="/guides/$slug"
              params={{ slug: guide.slug }}
              className="font-serif text-xl font-bold text-ink hover:text-primary"
            >
              {guide.title}
            </Link>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{guide.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              By {guide.author} · {guide.published}
            </p>
          </li>
        ))}
      </ul>
    </ContentPage>
  );
}
