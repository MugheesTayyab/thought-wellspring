import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, PencilLine } from "lucide-react";
import { ContentPage, ContentSection } from "@/client/components/bajihears/ContentPage";
import { promptLabel, REEL_PROMPTS, reelPromptByKey } from "@/shared/constants/reel-prompts";
import { SITE_URL } from "@/shared/constants/site";

const DESCRIPTION =
  "Write the thing you never got to say. Anonymous, no sign-up, and it only takes a line.";

export const Route = createFileRoute("/baji")({
  validateSearch: (search: Record<string, unknown>): { p?: string } =>
    typeof search["p"] === "string" ? { p: search["p"] } : {},
  head: () => ({
    meta: [
      { title: "Say what you never said | BajiHears" },
      { name: "description", content: DESCRIPTION },
      // A short landing page for people arriving from reels, not a page for search.
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "Say what you never said | BajiHears" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/baji` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/baji` }],
  }),
  component: BajiLandingPage,
});

function BajiLandingPage() {
  const { p } = Route.useSearch();
  const featured = reelPromptByKey(p);
  const others = REEL_PROMPTS.filter((prompt) => prompt.key !== featured?.key);

  return (
    <ContentPage
      title="Say what you never said."
      intro={
        <p>
          You saw this on Baji&apos;s reels. Write one line for the Wall. There&apos;s no sign-up,
          and other readers won&apos;t see a name attached.
        </p>
      }
    >
      {featured && (
        <a
          href={`/?write=${featured.key}`}
          className="mb-4 block rounded-3xl border-2 border-primary/50 bg-accent p-5 transition-colors hover:border-primary"
        >
          <span className="text-xs font-semibold text-primary">Finish this sentence</span>
          <span className="mt-2 block font-serif text-2xl font-bold leading-snug text-ink">
            {promptLabel(featured)}
          </span>
          <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            Write yours <ArrowRight className="size-4" aria-hidden />
          </span>
        </a>
      )}

      <a
        href="/?write=blank"
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
      >
        <PencilLine className="size-4" aria-hidden />
        Write your own
      </a>

      <ContentSection title="Or start with one of these">
        <ul className="grid gap-2">
          {others.map((prompt) => (
            <li key={prompt.key}>
              <a
                href={`/?write=${prompt.key}`}
                className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-border-card bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/50"
              >
                <span>{promptLabel(prompt)}</span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </ContentSection>

      <ContentSection title="Before you write">
        <ul className="list-disc space-y-2 pl-5">
          <li>Leave out names and details that could identify you or someone else.</li>
          <li>
            Your post goes on a public Wall. It only appears in a reel if you tick the box that
            says so.
          </li>
          <li>
            Anonymous means readers don&apos;t see who you are. We still store a device identifier
            for rate limits and moderation, as our{" "}
            <Link to="/privacy" className="text-primary underline">
              Privacy Policy
            </Link>{" "}
            explains.
          </li>
          <li>
            If you&apos;re struggling or not safe right now, please see our{" "}
            <Link to="/help" className="text-primary underline">
              help page
            </Link>
            . A public wall can&apos;t reach you, but these services can.
          </li>
        </ul>
      </ContentSection>

      <p className="mt-8 text-sm text-muted-foreground">
        Not ready to write?{" "}
        <Link to="/" className="font-semibold text-primary underline">
          Read the Wall
        </Link>{" "}
        first.
      </p>
    </ContentPage>
  );
}
