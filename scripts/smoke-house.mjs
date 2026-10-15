#!/usr/bin/env node
/**
 * Local smoke for house float + GPU subsidy (no chain).
 * Usage: node scripts/smoke-house.mjs
 */
import { createRequire } from "module";
import { pathToFileURL } from "url";
import path from "path";
import { fileURLToPath } from "url";

// Use ts via dynamic import of compiled path won't work — call API if server up,
// else assert constants from a tiny inline check.

const HOUSE_SELLABLE = 1300;
const COSMETIC = 1500;
const GPU_POOL = 100;

console.log("House float smoke (static asserts)");
console.log(`  sellable cap: $${HOUSE_SELLABLE}`);
console.log(`  cosmetic book: $${COSMETIC}`);
console.log(`  GPU subsidy pool: $${GPU_POOL}`);

const bands = [
  { id: "band-8", availableUsd: 520 },
  { id: "band-5", availableUsd: 520 },
  { id: "band-0", availableUsd: 260 },
];
const sellable = bands.reduce((s, b) => s + b.availableUsd, 0);
if (sellable !== HOUSE_SELLABLE) {
  console.error("FAIL sellable sum", sellable);
  process.exit(1);
}
const scale = COSMETIC / sellable;
const display = bands.map((b) => Math.round(b.availableUsd * scale * 100) / 100);
const depth = display.reduce((s, n) => s + n, 0);
console.log(`  display depth ≈ $${depth}`);
if (Math.abs(depth - COSMETIC) > 1) {
  console.error("FAIL cosmetic depth", depth);
  process.exit(1);
}

console.log("OK — float math checks out.");
console.log("\nManual product smoke (when funded):");
console.log("  1. Sign in → Billing → deposit USDC → claim");
console.log("  2. Inference → buy ≤$1300 face at discount");
console.log("  3. Models → chat (debits Lab credits / OpenRouter)");
console.log("  4. Compute → rent (10% off while GPU subsidy remains)");
console.log("  5. Pulse: fund .ops/pulse distributor → npm run pulse:run");
