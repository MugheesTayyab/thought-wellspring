import { readFileSync } from "node:fs";

export function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let field = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((c === "\r" || c === "\n") && !inQuotes) {
      if (c === "\r" && next === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
        lines.push(row);
      }
      row = [];
    } else {
      field += c;
    }
  }
  if (field || row.length > 0) {
    row.push(field);
    lines.push(row);
  }
  return lines;
}

const csvPath = "BAJIHEARS_FINAL_30_SEED_POSTS.csv";
const content = readFileSync(csvPath, "utf8");
const [header, ...rows] = parseCSV(content);

console.log("=== CSV Content Validation Report ===");
console.log("Headers:", header);
console.log(`Parsed ${rows.length} rows.`);

const categories = ["Spill The Tea", "Silent Thoughts", "Plot Twist", "Hard Truth", "Vibe Check"];
const seedIds = new Set();
const orders = new Set();
const errors = [];
const records = [];

rows.forEach((r, idx) => {
  const obj = {};
  header.forEach((h, i) => (obj[h.trim()] = r[i]));
  records.push(obj);

  const expectedId = `BH-${String(idx + 1).padStart(3, "0")}`;
  if (obj.seed_id !== expectedId) {
    errors.push(`Row ${idx + 1}: expected seed_id ${expectedId}, got ${obj.seed_id}`);
  }
  seedIds.add(obj.seed_id);

  const ord = parseInt(obj.display_order, 10);
  if (ord !== idx + 1) {
    errors.push(`Row ${idx + 1}: expected display_order ${idx + 1}, got ${obj.display_order}`);
  }
  orders.add(ord);

  if (!obj.content || obj.content.trim() === "") {
    errors.push(`Row ${idx + 1}: content is blank`);
  }
  if (obj.content.length > 280) {
    errors.push(`Row ${idx + 1}: content exceeds 280 chars (${obj.content.length})`);
  }
  if (!categories.includes(obj.category)) {
    errors.push(`Row ${idx + 1}: invalid category '${obj.category}'`);
  }
  if (obj.review_status !== "Pending Editorial Approval") {
    errors.push(`Row ${idx + 1}: invalid review_status '${obj.review_status}'`);
  }
  if (obj.editorial_label !== "BajiHears Original / Fictional Scenario") {
    errors.push(`Row ${idx + 1}: invalid editorial_label '${obj.editorial_label}'`);
  }
});

console.log(`Unique seed_id count: ${seedIds.size} / 30`);
console.log(`Unique display_order count: ${orders.size} / 30`);
if (errors.length > 0) {
  console.error("FAIL: Validation errors found:", errors);
  process.exit(1);
} else {
  console.log("PASS: All 30 CSV records meet all specification requirements!");
}
