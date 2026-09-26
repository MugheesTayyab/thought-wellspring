import { createClient } from "@supabase/supabase-js";
import { SEED_DATA } from "../src/client/lib/seedData";
import * as fs from "node:fs";
import * as path from "node:path";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

async function migrate() {
  loadEnv();

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase credentials in environment or .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log(`[Seed Migration] Connecting to ${supabaseUrl}...`);
  console.log(`[Seed Migration] Total seed records to migrate: ${SEED_DATA.length}`);

  // Check existing count in unsaids table
  const { count, error: countErr } = await supabase
    .from("unsaids")
    .select("id", { count: "exact", head: true });

  if (countErr) {
    console.warn(`[Seed Migration] Could not verify existing count: ${countErr.message}`);
  } else if ((count ?? 0) >= 50) {
    console.log(
      `[Seed Migration] Database already has ${count} confessions. Skipping duplicate migration.`
    );
    return;
  }

  const BATCH_SIZE = 50;
  let migrated = 0;

  for (let i = 0; i < SEED_DATA.length; i += BATCH_SIZE) {
    const chunk = SEED_DATA.slice(i, i + BATCH_SIZE);
    const batch = chunk.map((item, idx) => {
      const globalIdx = i + idx + 1;
      const deterministicUuid = `11111111-0000-4000-8000-${globalIdx.toString(16).padStart(12, "0")}`;

      return {
        id: deterministicUuid,
        text: item.text,
        handle: item.handle ?? null,
        category: item.category,
        preset: item.preset || "midnight-static",
        reactions: item.reactions,
        status: "published",
        created_at: new Date(item.createdAt).toISOString(),
        device_token: "00000000seed0001",
      };
    });

    const { error: upsertErr } = await supabase
      .from("unsaids")
      .upsert(batch, { onConflict: "id" });

    if (upsertErr) {
      console.error(
        `[Seed Migration] Error inserting batch ${i / BATCH_SIZE + 1}:`,
        upsertErr.message
      );
    } else {
      migrated += batch.length;
      console.log(
        `[Seed Migration] Migrated batch ${i / BATCH_SIZE + 1} (${migrated}/${SEED_DATA.length} records)`
      );
    }
  }

  console.log(`[Seed Migration] Finished migrating ${migrated} records into Supabase.`);
}

migrate().catch((err) => {
  console.error("[Seed Migration] Fatal error:", err);
  process.exit(1);
});
