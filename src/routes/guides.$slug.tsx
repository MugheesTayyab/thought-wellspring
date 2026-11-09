import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AdSlot } from "@/client/components/bajihears/AdSlot";
import { ContentPage } from "@/client/components/bajihears/ContentPage";
import { GuideBody } from "@/client/components/bajihears/GuideBody";
import { ADSENSE, SITE_URL } from "@/shared/constants/site";
import { GUIDES, guideBySlug } from "@/shared/content/guides";

export const Route = createFileRoute("/guides/$slug")({
  beforeLoad: ({ params }) => {
    if (!guideBySlug(params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const guide = guideBySlug(params.slug);
    if (!guide) return {};
    const url = `${SITE_URL}/guides/${guide.slug}`;
    return {
      meta: [
        { title: `${guide.title} | BajiHears` },
        { name: "description", content: guide.description },
        { name: "author", content: guide.author },
        { property: "og:title", content: guide.title },
        { property: "og:description", content: guide.description },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { property: "article:published_time", content: guide.published },
        { property: "article:modified_time", content: guide.updated },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: GuidePage,
});

function GuidePage() {
  const { slug } = Route.useParams();
  const guide = guideBySlug(slug);
  if (!guide) return null;
  const more = GUIDES.filter((other) => other.slug !== guide.slug).slice(0, 3);

  return (
    <ContentPage
      title={guide.title}
      intro={
        <p>
          By {guide.author} · Published {guide.published}
          {guide.updated !== guide.published ? ` · Updated ${guide.updated}` : ""}
        </p>
      }
    >
      <article>
        <GuideBody blocks={guide.blocks} />
      </article>

      <AdSlot slot={ADSENSE.guideSlot} />

      {more.length > 0 && (
        <section className="mt-10" aria-labelledby="more-guides">
          <h2 id="more-guides" className="font-serif text-xl font-bold text-ink">
            Keep reading
          </h2>
          <ul className="mt-3 space-y-2">
            {more.map((other) => (
              <li key={other.slug}>
                <Link
                  to="/guides/$slug"
                  params={{ slug: other.slug }}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  {other.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </ContentPage>
  );
}
