import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Heart, Shield, Sparkles, Scale, Feather, MessageSquare } from "lucide-react";
import { Logo } from "@/client/components/bajihears/Logo";
import { SiteFooter } from "@/client/components/bajihears/SiteFooter";
import { COLLECTIONS } from "@/shared/constants/collections";
import { OPERATOR_NAME } from "@/shared/constants/site";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About BajiHears | A Quiet Space to Say the Unsaid" },
      {
        name: "description",
        content:
          "Learn about BajiHears: an intentional, anonymous thought wall designed for honest reflection, slow community connection, and quiet relief.",
      },
      { property: "og:title", content: "About BajiHears | Say the unsaid" },
      {
        property: "og:description",
        content:
          "An intentional sanctuary for unspoken thoughts, slow community interaction, and genuine human relief without performative algorithms.",
      },
      { property: "og:url", content: "https://bajihears.app/about" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://bajihears.app/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-accent selection:text-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl p-1.5 text-muted-foreground transition hover:text-foreground active:scale-95 cursor-pointer"
            aria-label="Back to The Wall"
          >
            <ArrowLeft className="size-4" />
            <span className="text-xs font-semibold">Back to Wall</span>
          </Link>
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="font-serif text-sm font-bold tracking-tight text-ink">BajiHears</span>
          </div>
          <Link
            to="/corner"
            className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary cursor-pointer"
          >
            Your Corner
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Hero Section */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-accent px-3 py-1 text-[11px] font-semibold text-primary">
            <Feather className="size-3" />
            <span>Our Philosophy</span>
          </div>
          <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            A quiet sanctuary for words left unsaid.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Modern social platforms demand performance, real names, and constant updates designed to
            provoke outrage. BajiHears exists for the opposite reason: to offer a safe, gentle,
            anonymous space where you can let go of the thoughts you never got to say.
          </p>
        </div>

        {/* The Core Pillars */}
        <section className="mt-10 space-y-4 sm:mt-14" aria-labelledby="how-it-works-heading">
          <h2
            id="how-it-works-heading"
            className="font-serif text-xl font-bold tracking-tight text-ink"
          >
            How BajiHears Works
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Pillar 1 */}
            <div className="rounded-3xl border border-border-card bg-card p-5 shadow-2xs">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-secondary text-primary">
                <MessageSquare className="size-4.5" />
              </div>
              <h3 className="mt-3 font-display text-sm font-bold text-ink">The Thought Wall</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Read honest thoughts from strangers, grouped into{" "}
                {COLLECTIONS.map((collection, index) => (
                  <span key={collection.slug}>
                    {index > 0 && (index === COLLECTIONS.length - 1 ? ", and " : ", ")}
                    <Link
                      to="/wall/$slug"
                      params={{ slug: collection.slug }}
                      className="text-primary hover:underline"
                    >
                      {collection.category}
                    </Link>
                  </span>
                ))}
                . Every thought is capped at 280 characters to keep it brief and focused.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="rounded-3xl border border-border-card bg-card p-5 shadow-2xs">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-secondary text-primary">
                <Sparkles className="size-4.5" />
              </div>
              <h3 className="mt-3 font-display text-sm font-bold text-ink">12-Hour Writing Cadence</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                To prevent spam and encourage intentional reflection, each visitor can post once
                every 12 hours. This deliberate pause preserves the dignity and emotional gravity of
                the feed.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="rounded-3xl border border-border-card bg-card p-5 shadow-2xs">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-secondary text-primary">
                <Scale className="size-4.5" />
              </div>
              <h3 className="mt-3 font-display text-sm font-bold text-ink">The Daily Duel</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Each day features a community duel pairing two contrasting thoughts. Readers vote
                anonymously for the thought that resonates most deeply, exploring shared human
                complexities.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="rounded-3xl border border-border-card bg-card p-5 shadow-2xs">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-secondary text-primary">
                <Heart className="size-4.5" />
              </div>
              <h3 className="mt-3 font-display text-sm font-bold text-ink">Quiet Reactions &amp; Echoes</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Connect without vanity metrics. Reply with gentle &ldquo;Echoes&rdquo; or subtle
                reactions like warmth, tears, or resonance—without noisy comment threads or public follower
                counts.
              </p>
            </div>
          </div>
        </section>

        {/* Intentional Privacy & Safety */}
        <section className="mt-10 sm:mt-14" aria-labelledby="privacy-ethos-heading">
          <div className="rounded-3xl border border-border/80 bg-secondary/50 p-6 sm:p-7">
            <div className="flex items-center gap-2.5">
              <Shield className="size-5 text-primary" />
              <h2
                id="privacy-ethos-heading"
                className="font-serif text-lg font-bold tracking-tight text-ink sm:text-xl"
              >
                Privacy by Architecture, Not Just Policy
              </h2>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              We believe true anonymity requires technical guarantees. In BajiHears:
            </p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground sm:text-sm list-disc pl-5">
              <li>
                <strong className="text-foreground">Anonymous by default:</strong> You do not need to
                sign up or disclose an email to read, react, vote, or post.
              </li>
              <li>
                <strong className="text-foreground">No selling your data:</strong> We do not sell
                personal profiles or send what you write to analytics or advertising services.
                Analytics only run if you accept them. Our{" "}
                <Link to="/privacy" hash="advertising" className="text-primary underline">
                  Privacy Policy
                </Link>{" "}
                explains how advertising and its cookies work on BajiHears.
              </li>
              <li>
                <strong className="text-foreground">Protected public projection:</strong> Even if you link a
                Google account to save your Corner across devices, your email and private tokens are
                never exposed on public posts.
              </li>
              <li>
                <strong className="text-foreground">Community safety:</strong> Anonymity is not a license for
                cruelty. Automated filters and reader reports help us remove harassment, doxxing, and
                hate speech. Read our{" "}
                <Link to="/guidelines" className="text-primary underline">
                  community guidelines
                </Link>
                .
              </li>
            </ul>
          </div>
        </section>

        {/* Who runs this */}
        <section className="mt-10 sm:mt-14" aria-labelledby="who-runs-heading">
          <h2
            id="who-runs-heading"
            className="font-serif text-xl font-bold tracking-tight text-ink"
          >
            Who runs BajiHears
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {OPERATOR_NAME
              ? `BajiHears is run by ${OPERATOR_NAME}. `
              : "BajiHears is an independently run project, not a company with a large team. "}
            Posts labelled &ldquo;BajiHears Original · Fictional&rdquo; are made-up scenarios that we
            write ourselves. Everything else was submitted through the Wall. To get in touch, visit
            our{" "}
            <Link to="/contact" className="text-primary underline">
              contact page
            </Link>
            . BajiHears is not a crisis service; if you need support, please see{" "}
            <Link to="/help" className="text-primary underline">
              where to get help
            </Link>
            .
          </p>
        </section>

        {/* Call to action */}
        <div className="mt-12 rounded-3xl border border-border-card bg-card p-6 text-center shadow-xs sm:p-8">
          <h3 className="font-serif text-xl font-bold text-ink">Have something on your mind?</h3>
          <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
            Leave it on the Wall, take a deep breath, and let it go.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-6 text-xs font-semibold text-white shadow-xs transition hover:bg-primary/90 active:scale-95 cursor-pointer"
            >
              Explore the Wall
            </Link>
            <Link
              to="/corner"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-secondary/80 px-6 text-xs font-semibold text-foreground transition hover:bg-secondary active:scale-95 cursor-pointer"
            >
              Open Your Corner
            </Link>
          </div>
        </div>

        <SiteFooter />
      </main>
    </div>
  );
}
