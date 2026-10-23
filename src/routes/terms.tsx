import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Clock, Mail, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Logo } from "@/client/components/bajihears/Logo";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service | BajiHears" },
      {
        name: "description",
        content:
          "Review the Terms of Service for BajiHears: acceptable use rules, content licensing, anonymous participation guidelines, and community safety standards.",
      },
      { property: "og:title", content: "Terms of Service | BajiHears" },
      {
        property: "og:description",
        content:
          "Clear, honest terms and community guidelines for participating in the BajiHears anonymous thought wall and duel.",
      },
      { property: "og:url", content: "https://bajihears.app/terms" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://bajihears.app/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  const lastUpdated = "October 24, 2026";

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-accent selection:text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
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
            to="/privacy"
            className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary cursor-pointer"
          >
            Privacy Policy
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Title */}
        <div className="border-b border-border pb-6 sm:pb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-accent px-3 py-1 text-[11px] font-semibold text-primary">
            <BookOpen className="size-3" />
            <span>Community Agreement</span>
          </div>
          <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Terms of Service
          </h1>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            <span>Effective date: {lastUpdated}</span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Welcome to BajiHears. By accessing or using{" "}
            <a href="https://bajihears.app" className="underline hover:text-primary">
              https://bajihears.app
            </a>
            , you agree to be bound by these Terms of Service. If you do not agree to these terms,
            please do not use the service.
          </p>
        </div>

        {/* Quick Summary Card */}
        <div className="my-6 rounded-2xl border border-border/80 bg-secondary/40 p-5">
          <h2 className="font-serif text-sm font-bold text-ink">The Spirit of BajiHears</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            BajiHears is an anonymous platform built on mutual respect and vulnerability. You own
            your thoughts, but you are responsible for what you write. Cruelty, harassment, and
            doxxing have no home here.
          </p>
        </div>

        {/* Terms Body */}
        <div className="space-y-8 text-xs leading-relaxed text-muted-foreground sm:text-sm sm:space-y-10">
          {/* Section 1 */}
          <section id="eligibility">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              1. Eligibility &amp; Acceptance
            </h2>
            <p className="mt-2">
              You must be at least 13 years of age (or 16 years of age in the European Economic Area)
              to use BajiHears. By using our platform, you represent and warrant that you meet this
              minimum age requirement and have the legal capacity to enter into these Terms.
            </p>
          </section>

          {/* Section 2 */}
          <section id="platform-scope">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              2. What BajiHears Provides
            </h2>
            <p className="mt-2">
              BajiHears provides an anonymous thought wall, interactive reactions, public echoes, and
              a daily community Duel. The platform is designed for creative expression, emotional
              venting, and shared human resonance. BajiHears is <strong>not</strong> a crisis
              intervention service or licensed therapy provider. If you are experiencing acute
              distress, please reach out to professional mental health resources or local emergency
              services.
            </p>
          </section>

          {/* Section 3 */}
          <section id="acceptable-use">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              3. Acceptable Use &amp; Prohibited Conduct
            </h2>
            <p className="mt-2">
              Anonymity gives people freedom to speak from the heart, but it does not grant license
              to harm others. You agree <strong>not</strong> to submit, post, or transmit content
              that:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5">
              <li>
                <strong>Harasses or bullies:</strong> Targets specific individuals with threats,
                intimidation, hate speech, or defamatory attacks.
              </li>
              <li>
                <strong>Violates personal privacy (Doxxing):</strong> Exposes full names, addresses,
                phone numbers, social handles, workplaces, or non-consensual personal information of
                any real person.
              </li>
              <li>
                <strong>Promotes self-harm or violence:</strong> Encourages, glorifies, or provides
                instruction regarding self-harm, suicide, or physical harm to others.
              </li>
              <li>
                <strong>Is sexually explicit or illegal:</strong> Involves non-consensual sexual
                content, exploitation, or any activity prohibited under applicable law.
              </li>
              <li>
                <strong>Contains commercial spam:</strong> Promotes commercial products, affiliate
                links, spam campaigns, or automated bot postings.
              </li>
              <li>
                <strong>Attempts to disrupt platform operations:</strong> Bypasses rate limits,
                injects malicious code, circumvents security controls, or floods the service.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section id="content-ownership">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              4. User Content &amp; Intellectual Property
            </h2>
            <div className="space-y-3">
              <p>
                <strong>You retain ownership of your words:</strong> You retain all intellectual
                property rights to the original text you author and submit to BajiHears.
              </p>
              <p>
                <strong>License to BajiHears:</strong> By submitting thoughts, echoes, or reactions to
                our platform, you grant BajiHears a worldwide, non-exclusive, royalty-free, perpetual
                license to host, store, cache, format, display, distribute, and promote your content
                solely in connection with operating and featuring the BajiHears service (such as on
                The Wall and in the daily Duel).
              </p>
              <p>
                <strong>Public Availability:</strong> Thoughts submitted to The Wall become public
                materials that other visitors can read, quote, and share. Do not submit content you
                wish to remain confidential.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section id="moderation">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              5. Content Moderation &amp; Removal
            </h2>
            <p className="mt-2">
              BajiHears maintains automated profanity filters and community reporting mechanisms:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5">
              <li>
                We reserve the right, but do not assume the ongoing obligation, to review, hide, or
                permanently delete any content that violates these Terms or our community ethos.
              </li>
              <li>
                Visitors can flag inappropriate material using the in-app report button. Flagged
                content is routed to moderation queues.
              </li>
              <li>
                <strong>No automated self-deletion:</strong> Because submissions are anonymous, the
                interface does not provide a self-service delete button. If you need a post you
                authored removed for privacy or safety reasons, email{" "}
                <a href="mailto:support@bajihears.app" className="text-primary underline">
                  support@bajihears.app
                </a>{" "}
                with the post link and context.
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section id="rate-limits">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              6. Rate Limits &amp; Service Restrictions
            </h2>
            <p className="mt-2">
              To ensure thoughtful community expression and prevent service degradation, BajiHears
              enforces technical rate limits:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Submission of thoughts is limited to one per 12 hours per device/account.</li>
              <li>Daily reactions, duel votes, and reporting are capped by automated guardrails.</li>
              <li>
                We reserve the right to throttle, temporarily suspend, or block devices and IP
                addresses that engage in automated abuse, scraping, or coordinated attacks.
              </li>
            </ul>
          </section>

          {/* Section 7 */}
          <section id="accounts">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              7. Optional Accounts &amp; Google Sign-In
            </h2>
            <p className="mt-2">
              You are responsible for maintaining the confidentiality of your Google account
              credentials used to access BajiHears. We are not liable for any loss resulting from
              unauthorized access to your personal Google account.
            </p>
          </section>

          {/* Section 8 */}
          <section id="disclaimer">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              8. Warranty Disclaimers
            </h2>
            <p className="mt-2 uppercase font-mono text-[11px] tracking-wide">
              BajiHears is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without
              warranties of any kind, whether express, implied, statutory, or otherwise. We
              disclaim all warranties of merchantability, fitness for a particular purpose, title,
              and non-infringement. We do not warrant that the service will be uninterrupted, error-free,
              or free of harmful code.
            </p>
          </section>

          {/* Section 9 */}
          <section id="liability">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              9. Limitation of Liability
            </h2>
            <p className="mt-2 uppercase font-mono text-[11px] tracking-wide">
              To the maximum extent permitted by applicable law, in no event shall BajiHears, its
              operators, contributors, or service providers be liable for any indirect, incidental,
              special, consequential, or punitive damages, or any loss of data, use, goodwill, or
              other intangible losses, resulting from: (a) your access to or inability to use the
              service; (b) any conduct or content of any third party on the service; or (c)
              unauthorized access, use, or alteration of your content.
            </p>
          </section>

          {/* Section 10 */}
          <section id="jurisdiction">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              10. Governing Law &amp; Dispute Resolution
            </h2>
            <p className="mt-2">
              These Terms shall be governed by and construed in accordance with applicable laws,
              without regard to its conflict of law principles. Any legal suit, action, or proceeding
              arising out of or related to these Terms or the service shall be resolved through good-faith
              negotiation before escalating to formal judicial bodies.
            </p>
          </section>

          {/* Section 11 */}
          <section id="modifications">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              11. Changes to Terms
            </h2>
            <p className="mt-2">
              We reserve the right to revise or replace these Terms at any time. When revisions take
              place, we will update the &ldquo;Effective date&rdquo; at the top of this document.
              Your continued use of BajiHears after any revision constitutes acceptance of the
              modified terms.
            </p>
          </section>

          {/* Section 12 */}
          <section id="contact">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              12. Contact Information
            </h2>
            <p className="mt-2">
              If you have questions regarding these Terms or need to report a violation, please
              contact us:
            </p>
            <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-ink">BajiHears Support &amp; Legal</p>
                <p className="text-xs text-muted-foreground">Direct email assistance</p>
              </div>
              <a
                href="mailto:support@bajihears.app"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90"
              >
                <Mail className="size-3.5" />
                <span>support@bajihears.app</span>
              </a>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          <p className="font-sans">
            &copy; {new Date().getFullYear()} BajiHears &middot; Designed for quiet relief.
          </p>
          <div className="mt-2 flex items-center justify-center gap-4 text-xs font-medium">
            <Link to="/about" className="hover:text-foreground transition">
              About
            </Link>
            <span>&middot;</span>
            <Link to="/privacy" className="hover:text-foreground transition">
              Privacy Policy
            </Link>
            <span>&middot;</span>
            <Link to="/terms" className="text-primary font-semibold">
              Terms of Service
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
