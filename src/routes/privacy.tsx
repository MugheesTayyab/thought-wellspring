import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Shield, Clock, Mail, Lock, ExternalLink, FileText } from "lucide-react";
import { Logo } from "@/client/components/bajihears/Logo";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | BajiHears" },
      {
        name: "description",
        content:
          "Read the BajiHears Privacy Policy: an evidence-based explanation of how we handle anonymous thoughts, local data, authentication, and security.",
      },
      { property: "og:title", content: "Privacy Policy | BajiHears" },
      {
        property: "og:description",
        content:
          "Transparent, verifiable details on how BajiHears handles data, anonymous posting, browser storage, and privacy protection.",
      },
      { property: "og:url", content: "https://bajihears.app/privacy" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://bajihears.app/privacy" }],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
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
            to="/terms"
            className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary cursor-pointer"
          >
            Terms of Service
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Title & Badge */}
        <div className="border-b border-border pb-6 sm:pb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-accent px-3 py-1 text-[11px] font-semibold text-primary">
            <Shield className="size-3" />
            <span>Transparency &amp; Data Protection</span>
          </div>
          <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Privacy Policy
          </h1>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            <span>Effective date: {lastUpdated}</span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            This policy outlines precisely how BajiHears (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;)
            collects, manages, and protects information when you visit{" "}
            <a href="https://bajihears.app" className="underline hover:text-primary">
              https://bajihears.app
            </a>
            . We believe in privacy by architecture: gathering only what is required to keep the
            community safe, quiet, and functioning.
          </p>
        </div>

        {/* Quick Navigation / Table of Contents */}
        <nav
          aria-label="Privacy Policy Table of Contents"
          className="my-6 rounded-2xl border border-border/80 bg-secondary/40 p-4 sm:p-5"
        >
          <p className="font-serif text-xs font-bold text-ink uppercase tracking-wider">
            Contents at a Glance
          </p>
          <ol className="mt-3 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
            <li>
              <a href="#operator" className="hover:text-primary hover:underline">
                1. Platform Operator &amp; Scope
              </a>
            </li>
            <li>
              <a href="#collection" className="hover:text-primary hover:underline">
                2. Information We Collect Directly
              </a>
            </li>
            <li>
              <a href="#anonymity" className="hover:text-primary hover:underline">
                3. Anonymous Thoughts &amp; Projection
              </a>
            </li>
            <li>
              <a href="#auth" className="hover:text-primary hover:underline">
                4. Google Sign-In &amp; Supabase
              </a>
            </li>
            <li>
              <a href="#storage" className="hover:text-primary hover:underline">
                5. Local Storage &amp; Cookies
              </a>
            </li>
            <li>
              <a href="#technical-data" className="hover:text-primary hover:underline">
                6. IP Addresses &amp; Security Logs
              </a>
            </li>
            <li>
              <a href="#use-of-data" className="hover:text-primary hover:underline">
                7. How We Use Information
              </a>
            </li>
            <li>
              <a href="#third-parties" className="hover:text-primary hover:underline">
                8. Third-Party Service Providers
              </a>
            </li>
            <li>
              <a href="#public-nature" className="hover:text-primary hover:underline">
                9. Public Visibility &amp; Indexing
              </a>
            </li>
            <li>
              <a href="#retention" className="hover:text-primary hover:underline">
                10. Data Retention Practices
              </a>
            </li>
            <li>
              <a href="#rights" className="hover:text-primary hover:underline">
                11. Your Rights &amp; Content Removal
              </a>
            </li>
            <li>
              <a href="#security" className="hover:text-primary hover:underline">
                12. Technical Security Safeguards
              </a>
            </li>
            <li>
              <a href="#children" className="hover:text-primary hover:underline">
                13. Children&apos;s Privacy
              </a>
            </li>
            <li>
              <a href="#international" className="hover:text-primary hover:underline">
                14. International Transfers
              </a>
            </li>
            <li>
              <a href="#advertising" className="hover:text-primary hover:underline">
                15. Future Advertising &amp; AdSense
              </a>
            </li>
            <li>
              <a href="#updates" className="hover:text-primary hover:underline">
                16. Policy Updates &amp; Contact
              </a>
            </li>
          </ol>
        </nav>

        {/* Policy Body */}
        <div className="space-y-8 text-xs leading-relaxed text-muted-foreground sm:text-sm sm:space-y-10">
          {/* Section 1 */}
          <section id="operator" className="scroll-mt-20">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              1. Platform Operator &amp; Scope
            </h2>
            <p className="mt-2">
              BajiHears is an anonymous thought-sharing web application accessible via{" "}
              <strong>https://bajihears.app</strong>. This Privacy Policy applies exclusively to
              interactions, data processing, and user-generated content submitted on BajiHears. For
              any inquiries or data requests, you can contact our privacy administration team at{" "}
              <a href="mailto:privacy@bajihears.app" className="text-primary underline">
                privacy@bajihears.app
              </a>
              .
            </p>
          </section>

          {/* Section 2 */}
          <section id="collection" className="scroll-mt-20">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              2. Information We Collect Directly
            </h2>
            <p className="mt-2">Depending on how you use BajiHears, we collect the following:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5">
              <li>
                <strong>Thoughts and Echoes (User-Generated Content):</strong> Text content submitted
                to The Wall (maximum 280 characters), chosen category (e.g. regret, love, fear,
                gratitude, secret, unsent, general), optional handle, and creation timestamps.
              </li>
              <li>
                <strong>Community Interactions:</strong> Anonymous reactions (reactions like
                warmth, tears, hearts, bookmarks) and votes cast in the daily Duel.
              </li>
              <li>
                <strong>Safety Reports:</strong> Post and echo identifiers flagged for community
                moderation, along with a reason code or descriptive feedback.
              </li>
              <li>
                <strong>Optional Authentication Data:</strong> If you choose to link a Google
                account, we receive your email address, display name, and avatar URL provided by
                Google OAuth.
              </li>
              <li>
                <strong>Push Notification Tokens:</strong> If you explicitly opt in to daily winner
                announcements, your browser generates an anonymous Web Push subscription endpoint and
                cryptographic authentication keys.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="anonymity" className="scroll-mt-20">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              3. Anonymous Thoughts &amp; Protected Public Projection
            </h2>
            <p className="mt-2">
              BajiHears is architected with a strict separation between public content and private
              identifiers:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5">
              <li>
                <strong>No account required:</strong> You can read, vote, react, and post without
                creating an account or providing an email address.
              </li>
              <li>
                <strong>Protected database projection:</strong> Public Wall queries run through
                restricted server-side functions. Direct table access is completely denied to public
                visitors.
              </li>
              <li>
                <strong>Account decoupling:</strong> Even if you are signed in with Google to
                maintain your Corner across devices, public posts and echoes do not reveal your Google
                profile, email address, or internal user ID unless you explicitly type a public
                handle.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section id="auth" className="scroll-mt-20">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              4. Google Sign-In &amp; Supabase Integration
            </h2>
            <p className="mt-2">
              Authentication is provided via Supabase Auth using the Proof Key for Code Exchange
              (PKCE) protocol (RFC 7636). When you choose &ldquo;Continue with Google&rdquo;:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5">
              <li>
                Google authenticates your identity and shares your verified email address and basic
                profile.
              </li>
              <li>
                Supabase issues an encrypted JSON Web Token (JWT) verifying your session. The client
                stores this session in local browser storage.
              </li>
              <li>
                Authenticated calls to our server transmit this token in standard{" "}
                <code>Authorization: Bearer</code> headers. Tokens are never embedded in public URLs
                or cached server responses.
              </li>
              <li>
                Signing out clears account query caches and removes all stored session credentials
                from your browser immediately.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section id="storage" className="scroll-mt-20">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              5. Local Storage &amp; Cookies
            </h2>
            <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5">
              <h3 className="font-display text-sm font-bold text-ink">Storage Mechanisms &amp; Analytics Cookies</h3>
              <p className="mt-1">
                BajiHears prioritizes minimal, privacy-first data storage. The browser storage mechanisms employed on this site are:
              </p>
              <ul className="mt-2 list-disc pl-5 space-y-1.5">
                <li>
                  <code>localStorage</code>: Stores your pseudonymous device token (a 16-character
                  hex string used strictly for rate-limiting), your saved thought bookmarks, avatar
                  seed, local draft text, visit streaks, cosmetic warmth points, and your explicit analytics consent preference (<code>bh:analytics-consent</code>).
                </li>
                <li>
                  <code>sessionStorage</code>: Stores temporary routing preferences and transient UI state.
                </li>
                <li>
                  <strong>Google Analytics Cookies (Optional):</strong> When you consent to site analytics, Google Analytics 4 sets first-party measurement cookies (such as <code>_ga</code> and <code>_ga_YK9LL21171</code>) to distinguish unique sessions and calculate aggregate traffic trends. If you decline or have not granted consent, Google Consent Mode v2 enforces <code>analytics_storage: 'denied'</code>, and no persistent analytics cookies are set.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section id="technical-data" className="scroll-mt-20">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              6. IP Addresses, Rate Limiting &amp; Security Logs
            </h2>
            <p className="mt-2">
              To defend our community against automated scraping, denial-of-service (DoS), and abuse:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5">
              <li>
                <strong>Cloudflare Edge Processing:</strong> Like virtually all web applications,
                network requests pass through Cloudflare edge nodes, which inspect standard HTTP headers,
                user-agent, and IP addresses to mitigate malicious traffic.
              </li>
              <li>
                <strong>Privacy-Preserving Rate Limiting:</strong> Our backend computes a salted
                SHA-256 hash digest of the incoming client IP address combined with your device token.
                This allows us to enforce the 12-hour submission cooldown without permanently
                storing raw IP addresses in post records.
              </li>
              <li>
                <strong>Log Sanitization:</strong> Our server error reporting automatically masks
                bearer tokens, secrets, and database strings prior to logging.
              </li>
            </ul>
          </section>

          {/* Section 7 */}
          <section id="use-of-data" className="scroll-mt-20">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              7. How We Use Information
            </h2>
            <p className="mt-2">We process collected information strictly for:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Displaying and categorizing public thoughts, echoes, and duels.</li>
              <li>Enforcing our 12-hour submission rate limit and anti-spam controls.</li>
              <li>Processing community moderation reports to filter prohibited content.</li>
              <li>Syncing your Corner across devices when you authenticate with Google.</li>
              <li>Dispatching opted-in web push notifications for community duel winners.</li>
              <li>Maintaining system availability, uptime, and edge security.</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section id="third-parties" className="scroll-mt-20">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              8. Third-Party Service Providers
            </h2>
            <p className="mt-2">
              We rely on trusted enterprise infrastructure providers to operate BajiHears:
            </p>
            <div className="mt-3 space-y-2.5">
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="font-semibold text-ink">Cloudflare, Inc.</p>
                <p className="text-xs text-muted-foreground">
                  Edge routing, serverless Worker compute, CDN asset delivery, and DDoS mitigation.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="font-semibold text-ink">Supabase, Inc.</p>
                <p className="text-xs text-muted-foreground">
                  Managed PostgreSQL database, row-level security enforcement, and Google OAuth
                  session brokering.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="font-semibold text-ink">Google LLC (Google Sign-In &amp; Google Analytics 4)</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Optional OAuth 2.0 single sign-on provider. When analytics tracking is consented to by the user, BajiHears utilizes Google Analytics 4 (Measurement ID: <code>G-YK9LL21171</code>) to measure aggregated readership trends, page visits across client-side transitions, and device archetypes.
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  <strong>Zero Personal Data / Zero Content Exposure:</strong> In accordance with our core privacy architecture, BajiHears enforces IP anonymization and strictly bars transmission of confession text, unsaid secrets, handles, email addresses, or device tokens to Google Analytics. You may withdraw or grant analytics consent at any time in Settings or utilize the{" "}
                  <a
                    href="https://tools.google.com/dlpage/gaoptout"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline"
                  >
                    Google Analytics Opt-Out Browser Add-on <ExternalLink className="size-3" />
                  </a>
                  .
                </p>
              </div>
            </div>
          </section>

          {/* Section 9 */}
          <section id="public-nature" className="scroll-mt-20">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              9. Public Visibility &amp; Search Engine Indexing
            </h2>
            <p className="mt-2">
              Thoughts and echoes posted to The Wall are public communications. They can be read by
              any visitor, shared via unique URLs, and indexed by search engine web crawlers. Never
              include passwords, telephone numbers, home addresses, financial details, or personal
              identifiable information (PII) belonging to yourself or any third party in your posts.
            </p>
          </section>

          {/* Section 10 */}
          <section id="retention" className="scroll-mt-20">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              10. Data Retention Practices
            </h2>
            <ul className="mt-2 list-disc pl-5 space-y-1.5">
              <li>
                <strong>Public Posts &amp; Echoes:</strong> Retained indefinitely in our database to
                preserve the integrity of the thought wall, unless removed following a safety report
                or verified deletion request.
              </li>
              <li>
                <strong>Rate-Limit Logs:</strong> Temporary anti-abuse tracking records expire
                automatically after their active cooldown window.
              </li>
              <li>
                <strong>Device Storage:</strong> Local preferences and saved thoughts remain on your
                device until you clear your browser storage or delete the saved note.
              </li>
            </ul>
          </section>

          {/* Section 11 */}
          <section id="rights" className="scroll-mt-20">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              11. Your Rights &amp; Content Removal Requests
            </h2>
            <p className="mt-2">
              Because BajiHears is built around public anonymity, there is no self-service post
              deletion button in the client interface. However, we respect your privacy rights and
              offer two straightforward removal mechanisms:
            </p>
            <ol className="mt-2 list-decimal pl-5 space-y-1.5">
              <li>
                <strong>In-App Community Reporting:</strong> Click the flag icon on any thought or
                echo to file a moderation report. Flagged content is evaluated by platform
                moderators.
              </li>
              <li>
                <strong>Manual Deletion &amp; Data Requests:</strong> To request the permanent
                removal of a thought you authored or to exercise your rights under GDPR/CCPA, email{" "}
                <a href="mailto:privacy@bajihears.app" className="text-primary underline">
                  privacy@bajihears.app
                </a>{" "}
                with the specific post URL or content details. We will review and act upon verified
                requests within 30 days.
              </li>
            </ol>
          </section>

          {/* Section 12 */}
          <section id="security" className="scroll-mt-20">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              12. Technical Security Safeguards
            </h2>
            <p className="mt-2">
              We implement defense-in-depth measures to safeguard our application:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5">
              <li>
                <strong>Strict Content Security Policy (CSP):</strong> Cryptographic nonces generated
                per request prevent Cross-Site Scripting (XSS).
              </li>
              <li>
                <strong>Encrypted Communication:</strong> End-to-end TLS encryption with
                Strict-Transport-Security (HSTS) preloading.
              </li>
              <li>
                <strong>Request Guardrails:</strong> Strict 64 KiB request body limits and
                cross-origin CSRF protections.
              </li>
              <li>
                <strong>Database Security:</strong> Direct table permissions revoked from anonymous
                and authenticated roles; mutations execute solely through verified stored functions.
              </li>
            </ul>
            <p className="mt-2 text-xs italic">
              Please note: while we adhere to industry-standard security architectures, no system
              transmitting data over the public internet can promise 100% invulnerability.
            </p>
          </section>

          {/* Section 13 */}
          <section id="children" className="scroll-mt-20">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              13. Children&apos;s Privacy
            </h2>
            <p className="mt-2">
              BajiHears is intended for general audiences aged 13 and older (or 16 in the European
              Economic Area). We do not knowingly solicit or collect personal information from
              children under these ages. If you believe a child has provided us with personal data,
              please contact us immediately at{" "}
              <a href="mailto:privacy@bajihears.app" className="text-primary underline">
                privacy@bajihears.app
              </a>
              , and we will delete the corresponding information.
            </p>
          </section>

          {/* Section 14 */}
          <section id="international" className="scroll-mt-20">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              14. International Data Transfers
            </h2>
            <p className="mt-2">
              Our infrastructure is globally distributed via Cloudflare edge locations, with database
              servers managed by Supabase in compliant cloud regions. By using BajiHears, you
              acknowledge that your data may be processed in jurisdictions that may have different data
              protection standards than your country of residence.
            </p>
          </section>

          {/* Section 15 */}
          <section id="advertising" className="scroll-mt-20">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              15. Future Advertising &amp; Google AdSense Disclosures
            </h2>
            <div className="rounded-2xl border border-primary/20 bg-accent/40 p-5">
              <h3 className="font-display text-sm font-bold text-ink">
                Prospective Advertising Notice
              </h3>
              <p className="mt-1">
                <strong>Current State:</strong> BajiHears is currently free of third-party
                advertisements and commercial tracking scripts.
              </p>
              <p className="mt-2">
                <strong>Future State (Google AdSense):</strong> In the future, BajiHears may partner
                with Google AdSense to serve online advertisements to sustain operational costs. When
                advertising is activated:
              </p>
              <ul className="mt-2 list-disc pl-5 space-y-1.5">
                <li>
                  Third-party vendors, including Google, will use cookies to serve ads based on your
                  prior visits to BajiHears or other websites.
                </li>
                <li>
                  Google&apos;s use of advertising cookies enables it and its partners to serve ads
                  based on your browsing patterns.
                </li>
                <li>
                  You can opt out of personalized advertising by visiting{" "}
                  <a
                    href="https://adssettings.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline"
                  >
                    Google Ads Settings <ExternalLink className="size-3" />
                  </a>
                  , or opt out of third-party vendor cookies by visiting{" "}
                  <a
                    href="https://www.aboutads.info/choices/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline"
                  >
                    aboutads.info <ExternalLink className="size-3" />
                  </a>
                  .
                </li>
                <li>
                  <strong>EEA, UK, and Swiss Visitors:</strong> Prior to serving ads in these
                  jurisdictions, BajiHears will implement a certified Consent Management Platform
                  (CMP) adhering to the IAB Europe Transparency and Consent Framework (TCF v2.2) to
                  collect user consent.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 16 */}
          <section id="updates" className="scroll-mt-20">
            <h2 className="font-serif text-lg font-bold text-ink sm:text-xl">
              16. Policy Updates &amp; Contact Information
            </h2>
            <p className="mt-2">
              We may periodically update this Privacy Policy to reflect technical enhancements or
              regulatory updates. When updates occur, the &ldquo;Effective date&rdquo; at the top of
              this page will be revised.
            </p>
            <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-ink">Have privacy questions or requests?</p>
                <p className="text-xs text-muted-foreground">
                  Our privacy team is available to help.
                </p>
              </div>
              <a
                href="mailto:privacy@bajihears.app"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90"
              >
                <Mail className="size-3.5" />
                <span>privacy@bajihears.app</span>
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
            <Link to="/privacy" className="text-primary font-semibold">
              Privacy Policy
            </Link>
            <span>&middot;</span>
            <Link to="/terms" className="hover:text-foreground transition">
              Terms of Service
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
