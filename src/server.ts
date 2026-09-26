import "./server/lib/error-capture";

import { consumeLastCapturedError } from "./server/lib/error-capture";
import { renderErrorPage } from "./server/lib/error-page";
import { setWorkerEnv } from "./server/lib/get-env";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;
  return (
    origin === "https://bajihears.com" ||
    origin.endsWith(".pages.dev") ||
    origin === "http://localhost:3000" ||
    origin === "http://localhost:5173"
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    setWorkerEnv(env);

    const origin = request.headers.get("origin") || "";
    const allowed = isOriginAllowed(origin);

    // Handle CORS preflight OPTIONS request
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": allowed ? origin : "https://bajihears.com",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Device-Token, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);

      if (allowed && origin) {
        normalized.headers.set("Access-Control-Allow-Origin", origin);
        normalized.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        normalized.headers.set("Access-Control-Allow-Headers", "Content-Type, X-Device-Token, Authorization");
      }

      return normalized;
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },

  async scheduled(event: unknown, env: unknown, ctx: { waitUntil?: (p: Promise<unknown>) => void }) {
    setWorkerEnv(env);
    try {
      const { getServerEnv } = await import("./server/lib/get-env");
      const { executeWinnerSelection } = await import("./server/jobs/winner-selection");
      const dbEnv = getServerEnv();
      const task = executeWinnerSelection(dbEnv, { triggeredBy: "cron" })
        .then((res) => console.log("[Scheduled Cron] Winner selection result:", res))
        .catch((err) => console.error("[Scheduled Cron] Winner selection error:", err));

      if (ctx && typeof ctx.waitUntil === "function") {
        ctx.waitUntil(task);
      } else {
        await task;
      }
    } catch (err) {
      console.error("[Scheduled Cron] Fatal execution error:", err);
    }
  },
};
