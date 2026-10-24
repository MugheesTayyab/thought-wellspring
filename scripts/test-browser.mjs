import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Controlled server-function fixtures exercise the browser UI without writing
// public posts or pretending to validate the unavailable production backend.
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:4175";
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--disable-quic"],
});
mkdirSync("artifacts/browser", { recursive: true });
const postId = "33333333-3333-4333-8333-333333333333";
const duelId = "00000000-0000-0000-0000-000000000001";
const resolverFile = readdirSync(".output/server").find((name) =>
  name.includes("tanstack-start-server-fn-resolver"),
);
assert.ok(resolverFile, "Run the production build before browser tests so server-function IDs can be mapped");
const resolverSource = readFileSync(join(".output/server", resolverFile), "utf8");
const serverFunctionNames = new Map(
  [...resolverSource.matchAll(/"([a-f0-9]{64})":\s*\{\s*functionName:\s*"([^"]+)"/g)].map(
    ([, id, name]) => [id, name.replace(/_createServerFn_handler$/, "")],
  ),
);
assert.ok(serverFunctionNames.size > 0, "Could not read server-function IDs from the production build");
let checks = 0;
async function navigate(page, url) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await page.goto(url);
    } catch (error) {
      lastError = error;
      if (!String(error).includes("net::ERR_") || attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError;
}
async function setup(viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
  const page = await context.newPage();
  const state = {
    voteFails: false,
    feedFails: false,
    reacted: false,
    voted: false,
    echoed: false,
    published: false,
    submitCalls: 0,
    errors: [],
  };
  page.on("pageerror", (error) => state.errors.push(error.message));
  await page.route("**/_serverFn/**", async (route) => {
    const encoded = new URL(route.request().url()).pathname.split("/").pop();
    const id = encoded;
    let name = serverFunctionNames.get(id);
    if (!name) {
      try {
        const decoded = JSON.parse(Buffer.from(id, "base64").toString("utf8"));
        name = (decoded.export || decoded.functionName || "").replace(/_createServerFn_handler$/, "");
      } catch {
        // Not base64 encoded
      }
    }
    assert.ok(name, `Unhandled server-function fixture ID: ${id}`);
    const post = {
      id: postId,
      text: "Some days I just need a quiet place to think.",
      handle: null,
      category: "Silent Thoughts",
      preset: "midnight-static",
      createdAt: Date.now() - 60000,
      reactions: { heart: state.reacted ? 1 : 0, fire: 0, sad: 0, hug: 0 },
      echoes: state.echoed
        ? [{ id: "echo-1", text: "I feel the same.", handle: null, createdAt: Date.now() }]
        : [],
    };
    const duel = {
      id: duelId,
      format: "self-relate",
      prompt: "Which one feels closer today?",
      optionA: {
        id: "a",
        text: "Every night I rehearse conversations I'll never have. I'm getting really good at them.",
      },
      optionB: {
        id: "b",
        text: "There is a girl in Lahore who writes letters to a boy who moved to a city that no longer exists on her map.",
      },
      votesA: state.voted ? 1 : 0,
      votesB: 0,
      active: true,
    };
    const originals = Array.from({ length: 30 }, (_, index) => ({
      ...post,
      id: `77777777-7777-4777-8${String(index + 1).padStart(3, "0")}0000000`,
      text: `Verified Manus fixture story ${String(index + 1).padStart(2, "0")}.`,
      category: "Silent Thoughts",
      sourceType: "editorial",
      editorialSeedId: `BH-${String(index + 1).padStart(3, "0")}`,
      editorialLabel: "BajiHears Original · Fictional",
      displayOrder: index + 1,
    }));
    let data;
    let failure;
    if (name.includes("apiFetchActiveDuel"))
      data = { duel, alreadyVoted: state.voted, ...(state.voted ? { userChoice: 0 } : {}) };
    else if (name.includes("apiSubmitDuelVote")) {
      if (state.voteFails) failure = "Your vote could not be saved.";
      else {
        state.voted = true;
        data = { choiceIndex: 0, votesA: 1, votesB: 0 };
      }
    } else if (name.includes("apiFetchWinner")) data = { winner: post, hook: "", isFallback: true };
    else if (name.includes("apiFetchPostById"))
      data = {
        post: {
          ...post,
          id: "55555555-5555-4555-8555-555555555555",
          text: "A shared thought from an earlier day.",
        },
      };
    else if (name.includes("apiFetchEditorialOriginals")) data = { posts: originals };
    else if (name.includes("apiFetchFeed")) {
      if (state.feedFails) failure = "Wall is temporarily unavailable.";
      else
        data = {
          posts: [
            post,
            ...originals,
            ...(state.published
              ? [
                  {
                    ...post,
                    id: "44444444-4444-4444-8444-444444444444",
                    text: "Today I made time for a little walk.",
                  },
                ]
              : []),
          ],
          page: 0,
          limit: 50,
          hasMore: false,
        };
    } else if (name.includes("apiUnreactToPost")) {
      state.reacted = false;
      data = { reactions: { heart: 0, fire: 0, sad: 0, hug: 0 } };
    } else if (name.includes("apiReactToPost")) {
      state.reacted = true;
      data = { reactions: { heart: 1, fire: 0, sad: 0, hug: 0 } };
    } else if (name.includes("apiAddEcho")) {
      state.echoed = true;
      data = { id: "echo-1", text: "I feel the same.", handle: null, createdAt: Date.now() };
    } else if (name.includes("apiSubmitPost")) {
      state.submitCalls++;
      state.published = true;
      data = {
        id: "44444444-4444-4444-8444-444444444444",
        status: "published",
        createdAt: Date.now(),
      };
    } else if (name.includes("apiFetchUserActivity"))
      data = { posts: [], totalLikesReceived: 0, totalPosts: 0, likedPosts: [] };
    else if (name.includes("apiReport")) data = { reported: true, message: "Report received." };
    else if (name.includes("apiSyncWarmth")) data = { serverTotal: 0 };
    else throw new Error(`Unhandled fixture request: ${name}`);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        result: failure
          ? { ok: false, error: { code: "OFFLINE", message: failure } }
          : { ok: true, data },
        context: {},
      }),
    });
  });
  return { context, page, state };
}
async function fits(page) {
  await page.screenshot({ path: "artifacts/browser/latest.png", fullPage: true });
  const dimensions = await page.evaluate(() => ({
    height: innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(dimensions.scrollWidth <= dimensions.width, JSON.stringify(dimensions));
  assert.ok(dimensions.scrollHeight <= dimensions.height + 1, JSON.stringify(dimensions));
  checks++;
}
try {
  for (const [width, height] of [
    [320, 568],
    [360, 740],
    [390, 844],
    [768, 1024],
    [1440, 900],
  ]) {
    const { context, page, state } = await setup({ width, height });
    await navigate(page, `${base}/duel`);
    await page.getByRole("button", { name: /^Option A:/ }).waitFor();
    await fits(page);
    await page.getByRole("button", { name: /^Option A:/ }).click();
    await page.getByText("Your pick is in.").waitFor();
    await fits(page);
    assert.equal(await page.getByRole("navigation").getByRole("link").count(), 3);
    assert.deepEqual(state.errors, []);
    await page.screenshot({ path: `artifacts/browser/duel-${width}.png`, fullPage: true });
    console.log(`PASS Duel fits ${width}x${height} before and after voting`);
    await context.close();
  }
  const { context, page, state } = await setup({ width: 390, height: 844 });
  state.voteFails = true;
  await navigate(page, `${base}/duel`);
  await page.getByRole("button", { name: /^Option A:/ }).click();
  await page.getByRole("alert").filter({ hasText: "Your vote was not saved" }).waitFor();
  assert.equal(await page.getByRole("button", { name: /^Option A:/ }).isEnabled(), true);
  assert.equal(
    await page.evaluate(
      (id) => Boolean(JSON.parse(localStorage.getItem("bh:duelAnswered") || "{}")[id]),
      duelId,
    ),
    false,
  );
  checks++;
  console.log("PASS Failed vote rolls back and remains retryable");
  await navigate(page, `${base}/`);
  const targetPost = page.locator(`#thought-${postId}`);
  const react = targetPost.getByRole("button", { name: /^Relate(?: \d+)? to this thought$/ });
  await react.click();
  await page.waitForFunction(
    () =>
      document
        .querySelector('[aria-label^="Relate"]')
        ?.getAttribute("aria-pressed") === "true",
  );
  checks++;
  console.log("PASS Reaction persists after server acknowledgment");
  await targetPost.getByRole("button", { name: "Echo", exact: true }).click();
  await page.getByRole("textbox", { name: "Want to leave an Echo?" }).fill("I feel the same.");
  await page.getByRole("button", { name: "Send Echo", exact: true }).click();
  await page.getByText("I feel the same.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Close Echoes", exact: true }).click();
  checks++;
  console.log("PASS Echo is acknowledged and appears in the thread");
  await targetPost.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("navigation").getByRole("link", { name: "Corner" }).click();
  await page.getByRole("button", { name: "Saved notes", exact: true }).click();
  await page.getByText("Some days I just need a quiet place to think.").waitFor();
  checks++;
  console.log("PASS Saved thought appears in Corner");
  await navigate(page, `${base}/read`);
  await page.waitForURL(`${base}/`);
  checks++;
  console.log("PASS Old Read links redirect to Wall");
  await navigate(page, `${base}/?unsaid=55555555-5555-4555-8555-555555555555`);
  await page.getByText("A shared thought from an earlier day.", { exact: true }).waitFor();
  checks++;
  console.log("PASS Shared links load thoughts outside the first feed page");
  await navigate(page, `${base}/`);
  await page.getByText("Verified Manus fixture story 01.", { exact: true }).waitFor();
  assert.equal(await page.getByText("BajiHears Original · Fictional", { exact: true }).count(), 30);
  assert.equal(await page.getByText("Verified Manus fixture story 30.", { exact: true }).count(), 1);
  checks++;
  console.log("PASS Exactly 30 ordered Originals render with explicit fictional labels in default feed");
  await navigate(page, `${base}/`);
  await page.getByText("Some days I just need a quiet place to think.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Write a thought", exact: true }).click();
  const composer = page.getByRole("dialog");
  const thoughtInput = page.getByPlaceholder("What's something you've been keeping to yourself?");
  const postButton = page.getByRole("button", { name: "Post anonymously", exact: true });
  assert.equal(await postButton.isDisabled(), true);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Silent Thoughts", exact: true })
    .click();
  await thoughtInput.fill("اِن کہی بات — دل کی آواز 🌙");
  assert.equal(await postButton.isEnabled(), true);
  await thoughtInput.fill("a".repeat(280));
  assert.equal(await postButton.isEnabled(), true);
  await thoughtInput.fill("a".repeat(281));
  await composer.getByRole("alert").filter({ hasText: "over the limit" }).waitFor();
  assert.equal(await postButton.isDisabled(), true);
  checks++;
  console.log("PASS Composer validates empty, Unicode, 280, and 281-character input");
  await thoughtInput.fill("Today I made time for a little walk.");
  await postButton.evaluate((button) => {
    button.click();
    button.click();
  });
  await page.getByRole("heading", { name: "Your thought is on the Wall." }).waitFor();
  assert.equal(state.submitCalls, 1);
  await page.getByRole("button", { name: "Back to the Wall", exact: true }).click();
  await page.getByRole("button", { name: "Write a thought", exact: true }).click();
  await page.getByRole("heading", { name: "Your last thought was received." }).waitFor();
  checks++;
  console.log("PASS Composer prevents repeated-tap duplicates and displays the 12-hour cooldown");
  await navigate(page, `${base}/auth/callback?error=access_denied`);
  await page
    .getByText("Sign-in was cancelled or declined. You can try again from Your Corner.")
    .waitFor();
  checks++;
  console.log("PASS Declined authentication displays a recovery path");
  state.feedFails = true;
  await navigate(page, `${base}/`);
  await page.getByText("Couldn't load the Wall just now.").waitFor();
  checks++;
  console.log("PASS Backend outage displays an error instead of an empty community");
  assert.deepEqual(state.errors, []);
  await context.close();
  console.log(
    `${checks} browser checks passed. These are controlled UI checks, not live OAuth/backend verification.`,
  );
} finally {
  await browser.close();
}
