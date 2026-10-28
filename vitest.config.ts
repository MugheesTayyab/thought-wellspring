import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: [
      "src/server/__tests__/release-reliability.test.ts",
      "src/server/__tests__/{phase5-moderation,phase6-winner,phase7-push,profanity,psychological-ranking,release-security,legal-transparency,production-moderation-engine,editorial-collection,analytics}.test.ts",
    ],
    testTimeout: 15000,
    clearMocks: true,
    restoreMocks: true,
  },
});
