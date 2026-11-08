import { afterEach, describe, expect, it, vi } from "vitest";
import { cachedPublicRead } from "../lib/edge-cache";

const originalCaches = (globalThis as { caches?: unknown }).caches;

afterEach(() => {
  (globalThis as { caches?: unknown }).caches = originalCaches;
});

function installFakeCacheApi() {
  const store = new Map<string, Response>();
  const fakeCache = {
    match: vi.fn(async (req: Request) => {
      const hit = store.get(req.url);
      return hit ? hit.clone() : undefined;
    }),
    put: vi.fn(async (req: Request, res: Response) => {
      store.set(req.url, res.clone());
    }),
  };
  (globalThis as { caches?: unknown }).caches = { default: fakeCache };
  return { fakeCache, store };
}

describe("cachedPublicRead", () => {
  it("computes once and serves the cached value on a hit", async () => {
    installFakeCacheApi();
    const compute = vi.fn().mockResolvedValue({ winner: "a" });

    const first = await cachedPublicRead("winner", 20, compute);
    const second = await cachedPublicRead("winner", 20, compute);

    expect(first).toEqual({ winner: "a" });
    expect(second).toEqual({ winner: "a" });
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("keys different cache entries independently", async () => {
    installFakeCacheApi();
    const computeA = vi.fn().mockResolvedValue({ v: "a" });
    const computeB = vi.fn().mockResolvedValue({ v: "b" });

    await cachedPublicRead("feed/all/0/20", 5, computeA);
    await cachedPublicRead("feed/all/1/20", 5, computeB);
    await cachedPublicRead("feed/all/0/20", 5, computeA);

    expect(computeA).toHaveBeenCalledTimes(1);
    expect(computeB).toHaveBeenCalledTimes(1);
  });

  it("falls back to a live compute when the Cache API is unavailable (local/dev/test)", async () => {
    (globalThis as { caches?: unknown }).caches = undefined;
    const compute = vi.fn().mockResolvedValue({ winner: "a" });

    await cachedPublicRead("winner", 20, compute);
    await cachedPublicRead("winner", 20, compute);

    expect(compute).toHaveBeenCalledTimes(2);
  });

  it("still returns live data if the cache read throws", async () => {
    const { fakeCache } = installFakeCacheApi();
    fakeCache.match.mockRejectedValueOnce(new Error("edge cache unavailable"));
    const compute = vi.fn().mockResolvedValue({ winner: "a" });

    await expect(cachedPublicRead("winner", 20, compute)).resolves.toEqual({ winner: "a" });
  });

  it("still returns live data if the cache write throws", async () => {
    const { fakeCache } = installFakeCacheApi();
    fakeCache.put.mockRejectedValueOnce(new Error("edge cache unavailable"));
    const compute = vi.fn().mockResolvedValue({ winner: "a" });

    await expect(cachedPublicRead("winner", 20, compute)).resolves.toEqual({ winner: "a" });
  });
});
