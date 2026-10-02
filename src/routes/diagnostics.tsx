import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getServerEnv } from "@/server/lib/get-env";

const getDiagnostics = createServerFn({ method: "GET" }).handler(async () => {
  const env = getServerEnv();

  return {
    database: Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
    server: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
    notifications: Boolean(env.VAPID_PUBLIC_KEY),
  };
});

export const Route = createFileRoute("/diagnostics")({
  head: () => ({
    meta: [
      { title: "Service status | BajiHears" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: async () => {
    return await getDiagnostics();
  },
  component: DiagnosticsPage,
});

function DiagnosticsPage() {
  const data = Route.useLoaderData();
  const checks = [
    ["Wall data", data.database],
    ["Secure actions", data.server],
    ["Notifications", data.notifications],
  ] as const;

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-20">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">BajiHears</p>
      <h1 className="mt-2 font-display text-4xl font-medium">Service status</h1>
      <p className="mt-3 max-w-lg text-muted-foreground">
        A private view of the services this app needs. No credentials or environment details are
        shown.
      </p>
      <ul className="mt-10 divide-y divide-border border-y border-border">
        {checks.map(([label, ready]) => (
          <li key={label} className="flex min-h-16 items-center justify-between gap-4">
            <span className="font-semibold">{label}</span>
            <span className={ready ? "text-[#7fb8a9]" : "text-warn"}>
              {ready ? "Available" : "Not configured"}
            </span>
          </li>
        ))}
      </ul>
      <a
        href="/"
        className="mt-8 inline-flex min-h-11 items-center text-sm font-bold text-primary hover:underline"
      >
        Return to the wall
      </a>
    </main>
  );
}
