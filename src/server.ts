import "./server/lib/error-capture";

import { consumeLastCapturedError } from "./server/lib/error-capture";
import { renderErrorPage } from "./server/lib/error-page";
import { setWorkerEnv } from "./server/lib/get-env";
import {
  enforceRequestBodyLimit,
  isCrossOriginMutation,
  secureResponse,
} from "./server/lib/request-security";

type ServerEntry = {
  fetch: (
    request: Request,
    options?: { context?: { nonce?: string } },
  ) => Promise<Response> | Response;
};

function createCspNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
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
  async fetch(request: Request, env: unknown, _ctx: unknown) {
    setWorkerEnv(env);

    const nonce = createCspNonce();
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-csp-nonce", nonce);
    try {
      request = new Request(request.url, {
        method: request.method,
        headers: requestHeaders,
        body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
        // @ts-expect-error duplex is required in Node fetch when body is a stream
        duplex: request.body ? "half" : undefined,
      });
    } catch {
      request = new Request(request, { headers: requestHeaders });
    }

    const origin = request.headers.get("origin") || "";
    const allowed = origin === new URL(request.url).origin;
    if (isCrossOriginMutation(request))
      return secureResponse(new Response("Forbidden", { status: 403 }), nonce);

    try {
      request = await enforceRequestBodyLimit(request);
    } catch (error) {
      if (error instanceof RangeError && error.message === "REQUEST_BODY_TOO_LARGE") {
        return secureResponse(new Response("Payload Too Large", { status: 413 }), nonce);
      }
      console.error("Request body could not be read", error);
      return secureResponse(new Response("Bad Request", { status: 400 }), nonce);
    }

    // Handle CORS preflight OPTIONS request
    if (request.method === "OPTIONS") {
      if (origin && !allowed) return secureResponse(new Response(null, { status: 403 }), nonce);
      return secureResponse(
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": allowed ? origin : new URL(request.url).origin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-Device-Token, Authorization",
            "Access-Control-Max-Age": "86400",
          },
        }),
        nonce,
      );
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, { context: { nonce } });
      const normalized = await normalizeCatastrophicSsrResponse(response);

      if (allowed && origin) {
        normalized.headers.set("Access-Control-Allow-Origin", origin);
        normalized.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        normalized.headers.set(
          "Access-Control-Allow-Headers",
          "Content-Type, X-Device-Token, Authorization",
        );
      }

      return secureResponse(normalized, nonce);
    } catch (error) {
      console.error(error);
      return secureResponse(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
        nonce,
      );
    }
  },

  async scheduled(
    _event: unknown,
    env: unknown,
    ctx: { waitUntil?: (p: Promise<unknown>) => void },
  ) {
    setWorkerEnv(env);
    const { runScheduledTasks } = await import("./server/jobs/scheduled");
    const task = runScheduledTasks(env).catch((error) => {
      console.error("[Scheduled Cron] Fatal execution error:", error);
    });
    if (ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil(task);
    } else {
      await task;
    }
  },
};
