import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import "@/styles.css";
import appCss from "@/styles.css?url";
import { reportLovableError } from "@/client/lib/lovable-error-reporting";
import { useWarmth, WarmthProvider, type WarmthContextType } from "@/client/stores/warmth-context";
import { AuthProvider } from "@/client/stores/auth-context";
import { getOrCreateIdentity, updateVisitStreak } from "@/client/lib/identity";
import { registerServiceWorker } from "@/client/lib/notifications";
import { Toaster } from "@/client/components/ui/sonner";
import { InstallAppPrompt } from "@/client/components/bajihears/InstallAppPrompt";

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

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
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
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
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
      { property: "og:url", content: "https://bajihears.app/" },
      { property: "og:title", content: "BajiHears | Say the Unsaid" },
      {
        property: "og:description",
        content: "Read the Wall, share a thought, and take part in a Duel.",
      },
      {
        property: "og:image",
        content: "https://bajihears.app/og-image.png",
      },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "BajiHears | Say the Unsaid" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "BajiHears | Say the Unsaid" },
      {
        name: "twitter:description",
        content: "Read the Wall, share a thought, and take part in a Duel.",
      },
      {
        name: "twitter:image",
        content: "https://bajihears.app/og-image.png",
      },
    ],
    links: [
      { rel: "canonical", href: "https://bajihears.app/" },
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
      { rel: "icon", href: "/brand.svg", type: "image/svg+xml" },
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    getOrCreateIdentity();
    updateVisitStreak();
    void registerServiceWorker();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WarmthProvider>
          <Outlet />
          <InstallAppPrompt />
          <Toaster position="top-center" />
        </WarmthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
