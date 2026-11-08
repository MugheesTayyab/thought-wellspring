// Short-TTL Cloudflare edge caching for responses that are identical for every
// visitor (no per-device/per-profile personalization). Uses the Workers Cache API
// directly so it works without any dashboard Cache Rule and without depending on
// the opaque, per-build content-hashed _serverFn URL. Never wire this onto a
// response that embeds per-viewer state (reaction/vote status, auth, etc.) — a
// cache hit is served to every visitor who shares the same key.
//
// Do not use this for src/routes/api/wall.ts's apiFetchFeed: its reaction counts
// are optimistically patched client-side and the mutation's onSettled calls
// invalidateQueries({ queryKey: ["posts"] }), which would re-fetch a stale cached
// feed snapshot and visibly revert the viewer's own just-applied reaction.

const CACHE_ORIGIN = "https://edge-cache.internal";

// `caches.default` is a Cloudflare Workers extension not present in lib.dom's
// CacheStorage type.
function cacheStore(): Cache | undefined {
  return (globalThis as { caches?: CacheStorage & { default?: Cache } }).caches?.default;
}

export async function cachedPublicRead<T>(
  cacheKey: string,
  ttlSeconds: number,
  compute: () => Promise<T>,
): Promise<T> {
  const cache = cacheStore();
  if (!cache) return compute();

  const request = new Request(`${CACHE_ORIGIN}/${cacheKey}`);
  try {
    const hit = await cache.match(request);
    if (hit) return (await hit.json()) as T;
  } catch {
    // A cache read failure must fall through to a live compute, never block it.
  }

  const data = await compute();
  try {
    await cache.put(
      request,
      new Response(JSON.stringify(data), {
        headers: {
          "content-type": "application/json",
          "Cache-Control": `public, max-age=${ttlSeconds}`,
        },
      }),
    );
  } catch {
    // Caching is a performance optimization; a write failure must not surface.
  }
  return data;
}
