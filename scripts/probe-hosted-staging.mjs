import { chromium } from "@playwright/test";
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const base = "https://bajihears-launch-staging.mugheestayyab4.workers.dev";
const resolver = readdirSync(".output/server").find((v) =>
  v.includes("tanstack-start-server-fn-resolver"),
);
const source = readFileSync(`.output/server/${resolver}`, "utf8");
const names = new Map(
  [...source.matchAll(/"([a-f0-9]{64})":\s*\{\s*functionName:\s*"([^"]+)"/g)].map(
    ([, id, name]) => [id, name.replace(/_createServerFn_handler$/, "")],
  ),
);
const requests = new Map();
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--disable-quic"],
});
try {
  const context = await browser.newContext({ serviceWorkers: "block" });
  await context.route("**/*", (route) => {
    const hostname = new URL(route.request().url()).hostname;
    if (
      [
        "bajihears.app",
        "qsloqqvdunfuyqqdmgil.supabase.co",
        "bajihears.mugheestayyab4.workers.dev",
      ].includes(hostname)
    )
      return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== base || !url.pathname.startsWith("/_serverFn/")) return;
    const name = names.get(url.pathname.split("/").pop());
    if (name && !requests.has(name))
      requests.set(name, {
        name,
        url: request.url(),
        method: request.method(),
        body: request.postData(),
      });
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  const id = "11111111-1111-4111-8111-000000000001";
  const card = page.locator(`#thought-${id}`);
  await card.getByRole("button", { name: /^Relate(?: \d+)? to this thought$/ }).click();
  await page.waitForFunction(
    (postId) =>
      document
        .querySelector(`#thought-${postId} [aria-label^='Relate']`)
        ?.getAttribute("aria-pressed") === "true",
    id,
  );
  await card.getByRole("button", { name: "Echo", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Want to leave an Echo?" })
    .fill("Synthetic staging response for launch testing.");
  await page.getByRole("button", { name: "Send Echo", exact: true }).click();
  await page
    .getByRole("paragraph")
    .filter({ hasText: /^Synthetic staging response for launch testing\.$/ })
    .waitFor();
  assert.ok(requests.has("apiFetchFeed"));
  assert.ok(requests.has("apiReactToPost"));
  assert.ok(requests.has("apiAddEcho"));
  mkdirSync("artifacts", { recursive: true });
  writeFileSync(
    "artifacts/staging-http-templates.json",
    JSON.stringify([...requests.values()], null, 2),
  );
  console.log(
    JSON.stringify(
      [...requests.values()].map((request) => ({
        name: request.name,
        method: request.method,
        body: request.method === "POST" ? request.body : undefined,
      })),
      null,
      2,
    ),
  );
  console.log(
    "PASS real hosted staging feed, reaction and Echo persistence; production hosts blocked",
  );
  await context.close();
} finally {
  await browser.close();
}
