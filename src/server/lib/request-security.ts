export function isCrossOriginMutation(request: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return false;
  const origin = request.headers.get("origin");
  return (
    request.headers.get("sec-fetch-site") === "cross-site" ||
    Boolean(origin && origin !== new URL(request.url).origin)
  );
}

export function secureResponse(response: Response): Response {
  const result = new Response(response.body, response);
  result.headers.set("X-Content-Type-Options", "nosniff");
  result.headers.set("X-Frame-Options", "DENY");
  result.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  result.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  result.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  );
  if (
    result.headers.get("content-type")?.includes("text/html") ||
    result.headers.get("content-type")?.includes("json")
  )
    result.headers.set("Cache-Control", "no-store");
  return result;
}
