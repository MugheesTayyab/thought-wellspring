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
import { getOrCreateIdentity, updateVisitStreak } from "@/client/lib/identity";
import { claimDailyBonus, initializeWall } from "@/client/lib/local-storage";

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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "BajiHears" },
      { name: "description", content: "Say the unsaid." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500;1,600&family=Playfair+Display:ital,wght@1,600;1,700&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [dailyBonus, setDailyBonus] = useState<{ amount: number; streak: number } | null>(null);

  useEffect(() => {
    getOrCreateIdentity();
    const streakResult = updateVisitStreak();
    const bonusResult = claimDailyBonus();
    initializeWall();

    if (bonusResult.claimed) {
      setDailyBonus({ amount: bonusResult.amount, streak: streakResult.streak });
      const timer = window.setTimeout(() => setDailyBonus(null), 5000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WarmthProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />

        {/* Daily Return Bonus Toast */}
        {dailyBonus && (
          <div className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-[slideDown_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
            <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-primary/40 bg-[#170e0e]/95 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_25px_rgba(250,84,28,0.4)] backdrop-blur-md">
              <span className="text-base animate-bounce">🔥</span>
              <span>+{dailyBonus.amount} Warmth — welcome back!</span>
              <span className="rounded-full bg-primary/20 px-2 py-0.5 font-mono text-[11px] text-primary">
                {dailyBonus.streak}d streak
              </span>
            </div>
          </div>
        )}
      </WarmthProvider>
    </QueryClientProvider>
  );
}
