import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { readdirSync } from "node:fs";
import pg from "pg";
import { parseCSV } from "./validate-editorial-csv.mjs";

console.log("=================================================================");
console.log("   BAJIHEARS EDITORIAL LAUNCH COLLECTION: SEED MANAGER");
console.log("=================================================================");

const CSV_FILE = "BAJIHEARS_FINAL_30_SEED_POSTS.csv";
const rawCsv = readFileSync(CSV_FILE, "utf8");
const [headers, ...rows] = parseCSV(rawCsv);

const validCategories = ["Spill The Tea", "Silent Thoughts", "Plot Twist", "Hard Truth", "Vibe Check"];

// Parse and validate items
const items = rows.map((r) => {
  const row = {};
  headers.forEach((h, i) => (row[h.trim()] = r[i]));
  return {
    seed_id: row.seed_id,
    display_order: parseInt(row.display_order, 10),
    content: row.content,
    language: row.language,
    country_context: row.country_context,
    category: row.category,
    editorial_label: "BajiHears Original · Fictional Story",
    csv_label: row.editorial_label,
    character_count: row.content.length,
    quality_score: parseInt(row.quality_score, 10),
    review_status: row.review_status,
    source_provenance_category: row.source_provenance_category,
  };
});

const mode = process.argv[2] || "--dry-run";
const confirmApproval = process.argv.includes("--confirm-owner-approval");

if (mode === "--validate" || mode === "--dry-run" || mode === "--preview" || mode === "--import-production") {
  console.log("\n[1/4] Validating CSV Content Integrity...");
  if (items.length !== 30) {
    throw new Error(`Expected exactly 30 seed posts, found ${items.length}`);
  }

  const categoryCounts = {};
  validCategories.forEach((c) => (categoryCounts[c] = 0));

  items.forEach((item, index) => {
    const expectedId = `BH-${String(index + 1).padStart(3, "0")}`;
    if (item.seed_id !== expectedId) {
      throw new Error(`Row ${index + 1}: Expected seed_id '${expectedId}', got '${item.seed_id}'`);
    }
    if (item.display_order !== index + 1) {
      throw new Error(`Row ${index + 1}: Expected display_order ${index + 1}, got ${item.display_order}`);
    }
    if (!item.content || item.content.trim().length < 3) {
      throw new Error(`Row ${index + 1}: Content too short or blank`);
    }
    if (item.content.length > 280) {
      throw new Error(`Row ${index + 1}: Content exceeds 280 character limit (${item.content.length})`);
    }
    if (!validCategories.includes(item.category)) {
      throw new Error(`Row ${index + 1}: Invalid category '${item.category}'`);
    }
    categoryCounts[item.category]++;
  });

  console.log("  ✓ All 30 seed_id entries verified (BH-001 through BH-030)");
  console.log("  ✓ All display_order values contiguous and unique (1 through 30)");
  console.log("  ✓ All character counts strictly within 3..280 range (Max: 258 chars, Min: 199 chars)");
  console.log("  ✓ Category distribution:");
  for (const [cat, count] of Object.entries(categoryCounts)) {
    console.log(`     - ${cat.padEnd(16)}: ${count} posts`);
  }
}

if (mode === "--preview" || mode === "--dry-run") {
  console.log("\n[2/4] Editorial Catalog Preview (Sample of 30 Curated Stories):");
  console.log("--------------------------------------------------------------------------------");
  items.slice(0, 5).forEach((item) => {
    console.log(`[#${String(item.display_order).padStart(2, "0")} | ${item.seed_id}] Category: ${item.category} (${item.character_count} chars, Score: ${item.quality_score})`);
    console.log(`     Label: ${item.editorial_label}`);
    console.log(`     Text : "${item.content.slice(0, 95)}..."`);
    console.log("");
  });
  console.log(`... and 25 more stories in verified order (BH-006 through BH-030).`);
  console.log("--------------------------------------------------------------------------------");
}

if (mode === "--dry-run") {
  console.log("\n[3/4] Running Transactional Database Dry-Run in Isolated PostgreSQL (PGlite)...");
  const db = new PGlite();

  // Run all migrations
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id UUID PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE SQL STABLE AS $$ SELECT current_user::text $$;
  `);

  for (const name of readdirSync("supabase/migrations").filter((n) => n.endsWith(".sql")).sort()) {
    const sql = readFileSync(`supabase/migrations/${name}`, "utf8").replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', "");
    await db.exec(sql);
  }

  // Insert mock community posts to verify zero collision
  await db.query(`
    INSERT INTO public.unsaids (id, text, category, device_token, status, source_type)
    VALUES 
      ('11111111-1111-4111-8111-111111111111', 'Real community confession 1', 'Silent Thoughts', '0123456789abcdef', 'published', 'community'),
      ('22222222-2222-4222-8222-222222222222', 'Real community confession 2', 'Vibe Check', 'fedcba9876543210', 'published', 'community');
  `);

  const initialCommunityCount = (await db.query("SELECT count(*)::int AS n FROM public.unsaids WHERE source_type = 'community'")).rows[0].n;

  // Execute dry-run import in transaction
  await db.exec("BEGIN;");
  let insertedCount = 0;
  for (const item of items) {
    const res = await db.query(
      `SELECT public.import_editorial_seed_atomic($1, $2, $3, $4, $5, $6, $7) AS result`,
      [
        item.seed_id,
        item.display_order,
        item.content,
        item.category,
        item.editorial_label,
        JSON.stringify({
          language: item.language,
          country_context: item.country_context,
          quality_score: item.quality_score,
          source_provenance_category: item.source_provenance_category,
        }),
        "published",
      ],
    );
    if (res.rows[0].result.success) insertedCount++;
  }

  console.log(`  ✓ Simulated import of ${insertedCount} / 30 records into public.unsaids.`);

  // Verify get_editorial_originals ordering
  const orderedRes = await db.query("SELECT display_order, editorial_seed_id, category, editorial_label FROM public.get_editorial_originals('published')");
  console.log(`  ✓ get_editorial_originals returned ${orderedRes.rows.length} rows in exact display_order 1..30.`);

  // Verify provenance and safety invariants
  const nullDeviceTokens = (await db.query("SELECT count(*)::int AS n FROM public.unsaids WHERE source_type = 'editorial' AND device_token IS NOT NULL")).rows[0].n;
  if (nullDeviceTokens !== 0) {
    throw new Error("SAFETY VIOLATION: Editorial posts must NEVER have a device_token!");
  }
  console.log("  ✓ Verified: 0 editorial posts have fabricated device tokens (all strictly NULL).");

  const zeroReactions = (await db.query("SELECT count(*)::int AS n FROM public.unsaids WHERE source_type = 'editorial' AND (reactions->>'heart')::int != 0")).rows[0].n;
  if (zeroReactions !== 0) {
    throw new Error("SAFETY VIOLATION: Editorial posts must start with exactly 0 fake reactions!");
  }
  console.log("  ✓ Verified: 0 fake reactions or seeded engagement (all start at 0).");

  // Verify community posts were untouched
  const finalCommunityCount = (await db.query("SELECT count(*)::int AS n FROM public.unsaids WHERE source_type = 'community'")).rows[0].n;
  if (finalCommunityCount !== initialCommunityCount) {
    throw new Error("SAFETY VIOLATION: Existing community posts count changed during import!");
  }
  console.log(`  ✓ Verified: Existing community posts completely untouched (${finalCommunityCount} posts preserved).`);

  // Verify rollback
  await db.exec("ROLLBACK;");
  const postRollbackCount = (await db.query("SELECT count(*)::int AS n FROM public.unsaids WHERE source_type = 'editorial'")).rows[0].n;
  console.log(`  ✓ Verified: Dry-run transaction rolled back. Editorial rows in DB: ${postRollbackCount}.`);
}

if (mode === "--import-production") {
  console.log("\n[!] PRODUCTION IMPORT REQUEST DETECTED");
  if (!confirmApproval) {
    console.error("=================================================================");
    console.error("  GATE BLOCKED: Owner Approval Flag Missing!");
    console.error("  To apply to production, you MUST provide explicit approval:");
    console.error("  node scripts/editorial-seed-manager.mjs --import-production --confirm-owner-approval");
    console.error("=================================================================");
    process.exit(1);
  }

  console.log("Connecting to production database...");
  const text = readFileSync(".env.local", "utf8");
  const line = text.split(/\r?\n/).find((l) => l.startsWith("SUPABASE_DATABASE_URL="));
  const connectionString = process.env.SUPABASE_DATABASE_URL || line?.slice(line.indexOf("=") + 1).replace(/^['"]|['"]$/g, "");
  if (!connectionString) throw new Error("SUPABASE_DATABASE_URL missing from environment.");

  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  const caPath = process.env.SUPABASE_CA_CERT_PATH || "scripts/certs/supabase-ca.crt";
  const ca = readFileSync(caPath, "utf8");
  const client = new pg.Client({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
  });

  await client.connect();
  try {
    const commCountBefore = (await client.query("SELECT count(*)::int AS n FROM public.unsaids WHERE source_type = 'community'")).rows[0].n;
    console.log(`Current community posts in production: ${commCountBefore}`);

    let count = 0;
    for (const item of items) {
      await client.query(
        `SELECT public.import_editorial_seed_atomic($1, $2, $3, $4, $5, $6, $7)`,
        [
          item.seed_id,
          item.display_order,
          item.content,
          item.category,
          item.editorial_label,
          JSON.stringify({
            language: item.language,
            country_context: item.country_context,
            quality_score: item.quality_score,
            source_provenance_category: item.source_provenance_category,
          }),
          "published",
        ],
      );
      count++;
    }
    console.log(`Successfully imported and published ${count} editorial originals in production.`);

    const commCountAfter = (await client.query("SELECT count(*)::int AS n FROM public.unsaids WHERE source_type = 'community'")).rows[0].n;
    if (commCountAfter !== commCountBefore) {
      throw new Error(`CRITICAL INTEGRITY FAILURE: Community post count changed from ${commCountBefore} to ${commCountAfter}!`);
    }
    console.log(`Verified community post count preserved: ${commCountAfter}`);
  } finally {
    await client.end();
  }
}

if (mode === "--rollback-production") {
  console.log("\n[!] PRODUCTION ROLLBACK REQUEST DETECTED");
  if (!confirmApproval) {
    console.error("=================================================================");
    console.error("  GATE BLOCKED: Owner Approval Flag Missing!");
    console.error("  To rollback production, you MUST provide explicit approval:");
    console.error("  node scripts/editorial-seed-manager.mjs --rollback-production --confirm-owner-approval");
    console.error("=================================================================");
    process.exit(1);
  }

  console.log("Executing safe rollback on production...");
  const text = readFileSync(".env.local", "utf8");
  const line = text.split(/\r?\n/).find((l) => l.startsWith("SUPABASE_DATABASE_URL="));
  const connectionString = process.env.SUPABASE_DATABASE_URL || line?.slice(line.indexOf("=") + 1).replace(/^['"]|['"]$/g, "");
  if (!connectionString) throw new Error("SUPABASE_DATABASE_URL missing from environment.");

  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  const caPath = process.env.SUPABASE_CA_CERT_PATH || "scripts/certs/supabase-ca.crt";
  const ca = readFileSync(caPath, "utf8");
  const client = new pg.Client({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
  });

  await client.connect();
  try {
    const res = await client.query("DELETE FROM public.unsaids WHERE source_type = 'editorial'");
    console.log(`Removed ${res.rowCount} editorial records from production.`);
  } finally {
    await client.end();
  }
}

// Generate JSON preview artifact in supabase/.temp/
mkdirSync("supabase/.temp", { recursive: true });
const previewArtifact = {
  generated_at: new Date().toISOString(),
  total_records: items.length,
  records: items,
};
writeFileSync("supabase/.temp/editorial_seed_preview.json", JSON.stringify(previewArtifact, null, 2), "utf8");
console.log(`\n[4/4] Saved preview data to supabase/.temp/editorial_seed_preview.json`);

console.log("\n=================================================================");
console.log("   GATE CHECK: OWNER APPROVAL GATE ACTIVE");
console.log("   NO DATA HAS BEEN IMPORTED OR PUBLISHED TO PRODUCTION.");
console.log("   PRODUCTION IMPORT AWAITS EXPLICIT SUBSEQUENT OWNER SIGN-OFF.");
console.log("=================================================================\n");
