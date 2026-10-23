export const MAX_REQUEST_BODY_BYTES = 64 * 1024;

function getSupabaseOrigin(): string {
  const fallback = "https://qsloqqvdunfuyqqdmgil.supabase.co";
  try {
    const g = typeof globalThis !== "undefined" ? (globalThis as Record<string, unknown>) : null;
    const workerEnv =
      g && typeof g["__worker_env__"] === "object" && g["__worker_env__"] !== null
        ? (g["__worker_env__"] as Record<string, unknown>)
        : null;
    const nitroEnv =
      g && typeof g["__env__"] === "object" && g["__env__"] !== null
        ? (g["__env__"] as Record<string, unknown>)
        : null;
    const raw =
      (typeof process !== "undefined" &&
        (process.env?.["SUPABASE_URL"] || process.env?.["VITE_SUPABASE_URL"])) ||
      (typeof workerEnv?.["SUPABASE_URL"] === "string" ? workerEnv["SUPABASE_URL"] : undefined) ||
      (typeof nitroEnv?.["SUPABASE_URL"] === "string" ? nitroEnv["SUPABASE_URL"] : undefined);
    if (raw) {
      const parsed = new URL(raw);
      if (parsed.protocol === "https:") {
        return parsed.origin;
      }
    }
  } catch {
    // fallback
  }
  return fallback;
}

export function contentSecurityPolicy(nonce?: string): string {
  const scripts = nonce
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
    : "script-src 'self'";
  const supabaseOrigin = getSupabaseOrigin();
  const wssOrigin = supabaseOrigin.replace(/^http/, "ws");
  return `default-src 'self'; ${scripts}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' ${supabaseOrigin} ${wssOrigin}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`;
}

export function isCrossOriginMutation(request: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return false;
  const origin = request.headers.get("origin");
  return (
    request.headers.get("sec-fetch-site") === "cross-site" ||
    Boolean(origin && origin !== new URL(request.url).origin)
  );
}

export async function enforceRequestBodyLimit(
  request: Request,
  maxBytes = MAX_REQUEST_BODY_BYTES,
): Promise<Request> {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method) || !request.body) return request;

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RangeError("REQUEST_BODY_TOO_LARGE");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel("Request body limit exceeded");
      throw new RangeError("REQUEST_BODY_TOO_LARGE");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Request(request, { body });
}

export function secureResponse(response: Response, nonce?: string): Response {
  const result = new Response(response.body, response);
  result.headers.set("X-Content-Type-Options", "nosniff");
  result.headers.set("X-Frame-Options", "DENY");
  result.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  result.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  result.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  result.headers.set("Content-Security-Policy", contentSecurityPolicy(nonce));
  if (
    result.headers.get("content-type")?.includes("text/html") ||
    result.headers.get("content-type")?.includes("json")
  )
    result.headers.set("Cache-Control", "no-store");
  return result;
}
