import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import "@/styles.css";
import appCss from "@/styles.css?url";
import { reportLovableError } from "@/client/lib/lovable-error-reporting";
import { useWarmth, WarmthProvider, type WarmthContextType } from "@/client/stores/warmth-context";
import { AuthProvider } from "@/client/stores/auth-context";
import { getOrCreateIdentity, updateVisitStreak } from "@/client/lib/identity";
import { claimDailyBonus } from "@/client/lib/local-storage";
import { useWarmthSync } from "@/client/hooks/use-warmth-sync";
import { registerServiceWorker } from "@/client/lib/notifications";

export { useWarmth, WarmthProvider, type WarmthContextType };

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
      },
      { title: "BajiHears | Say the Unsaid" },
      {
        name: "description",
        content: "A place to share a thought, find a familiar feeling, or just read for a bit.",
      },
      { name: "theme-color", content: "#FAF7F3" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "BajiHears" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://bajihears.mugheestayyab4.workers.dev/" },
      { property: "og:title", content: "BajiHears | Say the Unsaid" },
      {
        property: "og:description",
        content: "An intimate sanctuary for anonymous confessions, hot takes, and real connection.",
      },
      {
        property: "og:image",
        content: "https://bajihears.mugheestayyab4.workers.dev/og-image.jpg",
      },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "675" },
      { property: "og:image:alt", content: "BajiHears | Say the Unsaid" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "BajiHears | Say the Unsaid" },
      {
        name: "twitter:description",
        content: "An intimate sanctuary for anonymous confessions, hot takes, and real connection.",
      },
      {
        name: "twitter:image",
        content: "https://bajihears.mugheestayyab4.workers.dev/og-image.jpg",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="light-foundation">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function WarmthSyncWatcher() {
  useWarmthSync();
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [dailyBonus, setDailyBonus] = useState<{ amount: number; streak: number } | null>(null);

  useEffect(() => {
    getOrCreateIdentity();
    const streakResult = updateVisitStreak();
    const bonusResult = claimDailyBonus();
    registerServiceWorker();

    if (bonusResult.claimed) {
      setDailyBonus({ amount: bonusResult.amount, streak: streakResult.streak });
      const timer = window.setTimeout(() => setDailyBonus(null), 5000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WarmthProvider>
          <WarmthSyncWatcher />
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />

          {/* Daily Return Bonus Toast */}
          {dailyBonus && (
            <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none">
              <div className="flex items-center gap-2 rounded-full border border-border-card bg-card px-4 py-2 text-xs text-foreground shadow-[0_8px_24px_-8px_rgba(62,43,38,0.18)] font-sans animate-[slideDown_0.25s_cubic-bezier(0.16,1,0.3,1)]">
                <span className="text-xs shrink-0 select-none">🔥</span>
                <span className="font-bold tabular-nums text-primary">
                  +{dailyBonus.amount}
                </span>
                <span className="text-muted-foreground text-[12px] font-medium truncate max-w-[200px]">
                  Welcome back · Day {dailyBonus.streak} visit
                </span>
              </div>
            </div>
          )}
        </WarmthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
