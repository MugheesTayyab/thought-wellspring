import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getServerEnv } from "@/server/lib/get-env";

const getDiagnostics = createServerFn({ method: "GET" }).handler(async () => {
  const env = getServerEnv();
  const nitroKeys = Object.keys((globalThis as any).__env__ || {});
  const procKeys = typeof process !== "undefined" ? Object.keys(process.env || {}) : [];
  const gThisKeys = Object.keys(globalThis).filter((k) =>
    k.includes("SUPABASE") || k.includes("VAPID") || k.includes("env")
  );

  return {
    hasServiceRoleKey: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
    serviceRoleKeyLength: env.SUPABASE_SERVICE_ROLE_KEY ? env.SUPABASE_SERVICE_ROLE_KEY.length : 0,
    hasUrl: Boolean(env.SUPABASE_URL),
    hasAnonKey: Boolean(env.SUPABASE_ANON_KEY),
    nitroEnvKeyNames: nitroKeys,
    globalThisMatchingKeys: gThisKeys,
    procEnvMatchingKeys: procKeys.filter((k) => k.includes("SUPABASE") || k.includes("VAPID")),
  };
});

export const Route = createFileRoute("/diagnostics")({
  loader: async () => {
    return await getDiagnostics();
  },
  component: DiagnosticsPage,
});

function DiagnosticsPage() {
  const data = Route.useLoaderData();
  return (
    <div style={{ padding: 24, color: "white", background: "#111", minHeight: "100vh", fontFamily: "monospace" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>BajiHears Diagnostic Info</h1>
      <pre style={{ background: "#222", padding: 16, borderRadius: 8, overflowX: "auto" }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
