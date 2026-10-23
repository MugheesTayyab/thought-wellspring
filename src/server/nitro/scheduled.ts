import { definePlugin } from "nitro";
import { runScheduledTasks } from "../jobs/scheduled";

export default definePlugin((nitro) => {
  nitro.hooks.hook("cloudflare:scheduled", async ({ env }) => {
    await runScheduledTasks(env);
  });
});
