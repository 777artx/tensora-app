import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "public/lab-inference/index.html"), "utf8");

const re = /data-model-slug="([^"]+)"[\s\S]*?<\/a>/g;
const cards = [];
let m;
while ((m = re.exec(html))) {
  const block = m[0];
  const slug = m[1];
  const name = (block.match(/<h3[^>]*>([^<]+)<\/h3>/) || [])[1] || slug;

  // Prefer non-mono description paragraphs
  const paras = [...block.matchAll(/<p([^>]*)>([\s\S]*?)<\/p>/g)].map((p) => ({
    attrs: p[1],
    text: p[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim(),
  }));
  const description =
    paras.find((p) => !/font-mono/.test(p.attrs) && p.text && p.text !== slug && p.text.length > 12)?.text ||
    "";

  const ctx = (block.match(/class="chip"[^>]*>([^<]+)</) || [])[1]?.trim() || "";

  // Prices split across spans: $5/M … in · … $15/M … out
  const priceNums = [...block.matchAll(/\$([\d.]+)\/M/g)].map((x) => parseFloat(x[1]));
  const inputPerM = priceNums[0] ?? null;
  const outputPerM = priceNums[1] ?? null;

  const fav = (block.match(/domain=([^&"']+)/) || [])[1] || "";
  const provider = slug.split("/")[0];

  cards.push({
    id: slug,
    name: name.replace(/^[^:]+:\s*/, "").trim(),
    fullName: name.trim(),
    provider,
    description: description.slice(0, 280),
    context: ctx,
    inputPerM,
    outputPerM,
    logoDomain: fav,
  });
}

const seen = new Set();
const out = [];
for (const c of cards) {
  if (seen.has(c.id)) continue;
  seen.add(c.id);
  out.push(c);
}

const dest = path.join(root, "src/lib/lab/inference-catalog.json");
fs.writeFileSync(dest, JSON.stringify(out));
const withPrice = out.filter((c) => c.inputPerM != null).length;
const withDesc = out.filter((c) => c.description && c.description !== c.id).length;
console.log("extracted", out.length, "priced", withPrice, "described", withDesc);
const sample = out.find((c) => c.id.includes("claude-sonnet")) || out[10];
console.log(JSON.stringify(sample, null, 2));
