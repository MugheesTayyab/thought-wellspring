import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Feather, UserRound } from "lucide-react";
import { ContentPage } from "@/client/components/bajihears/ContentPage";
import { apiFetchCollection } from "@/routes/api/wall";
import { COLLECTIONS, COLLECTION_MIN_POSTS, collectionBySlug } from "@/shared/constants/collections";
import { SITE_URL } from "@/shared/constants/site";
import { relativeTime, stripHandle } from "@/shared/utils";
import type { Unsaid } from "@/shared/types/unsaid";

export const Route = createFileRoute("/wall/$slug")({
  loader: async ({ params }) => {
    const collection = collectionBySlug(params.slug);
    if (!collection) throw notFound();
    const result = await apiFetchCollection({ data: { category: collection.category } });
    // A failed read must not look like an empty collection that gets indexed as such.
    if (!result.ok) throw new Error(result.error.message);
    return { collection, posts: result.data.posts };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { collection, posts } = loaderData;
    const url = `${SITE_URL}/wall/${collection.slug}`;
    return {
      meta: [
        { title: `${collection.title} | BajiHears` },
        { name: "description", content: collection.description },
        ...(posts.length < COLLECTION_MIN_POSTS
          ? [{ name: "robots", content: "noindex, follow" }]
          : []),
        { property: "og:title", content: `${collection.title} | BajiHears` },
        { property: "og:description", content: collection.description },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: CollectionPage,
});

function Thought({ post }: { post: Unsaid }) {
  const editorial = post.sourceType === "editorial";
  return (
    <article className="paper-card p-5">
      <p className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {editorial ? (
          <>
            <Feather className="size-3.5" aria-hidden /> BajiHears Original · Fictional
          </>
        ) : (
          <>
            <UserRound className="size-3.5" aria-hidden />
            {post.handle ? `@${stripHandle(post.handle)}` : "Anonymous"}
            <span aria-hidden>·</span>
            <span suppressHydrationWarning>{relativeTime(post.createdAt)}</span>
          </>
        )}
      </p>
      <p className="text-[17px] leading-relaxed text-foreground">{post.text}</p>
      <a
        href={`/?unsaid=${post.id}`}
        className="mt-3 inline-flex min-h-9 items-center text-xs font-semibold text-primary hover:underline"
      >
        React, reply or report on the Wall
      </a>
    </article>
  );
}

function CollectionPage() {
  const { collection, posts } = Route.useLoaderData();
  const others = COLLECTIONS.filter((other) => other.slug !== collection.slug);

  return (
    <ContentPage
      title={collection.title}
      intro={
        <div className="space-y-3">
          {collection.intro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      }
    >
      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No thoughts here yet.{" "}
          <Link to="/" className="font-semibold text-primary hover:underline">
            Visit the Wall
          </Link>{" "}
          to read or write one.
        </p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Thought key={post.id} post={post} />
          ))}
        </div>
      )}

      <section className="mt-10" aria-labelledby="other-themes">
        <h2 id="other-themes" className="font-serif text-xl font-bold text-ink">
          Other themes
        </h2>
        <ul className="mt-3 space-y-2">
          {others.map((other) => (
            <li key={other.slug}>
              <Link
                to="/wall/$slug"
                params={{ slug: other.slug }}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {other.category}
              </Link>
              <p className="text-xs leading-5 text-muted-foreground">{other.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </ContentPage>
  );
}
