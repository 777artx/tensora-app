#!/usr/bin/env node
/**
 * Generate 22 pulse EOAs for beta treasury activity.
 * Keys are written ONLY to .ops/pulse/ (gitignored).
 *
 * Usage: node scripts/pulse/generate-wallets.mjs
 */
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const OUT_DIR = join(ROOT, ".ops", "pulse");
const OUT_FILE = join(OUT_DIR, "wallets.json");
const COUNT = 22;
const TREASURY = (
  process.env.TENSORA_TREASURY_ADDRESS ||
  process.env.NEXT_PUBLIC_TENSORA_TREASURY_ADDRESS ||
  "0x77b8f55317a2f74092102af4188627beae772b94"
).toLowerCase();

if (existsSync(OUT_FILE)) {
  const existing = JSON.parse(readFileSync(OUT_FILE, "utf8"));
  console.log(`Already have ${existing.wallets?.length || 0} wallets at ${OUT_FILE}`);
  console.log("Delete the file first if you want to regenerate.");
  process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });

const wallets = [];
for (let i = 0; i < COUNT; i++) {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  wallets.push({
    index: i,
    address: account.address,
    privateKey,
  });
}

const payload = {
  createdAt: new Date().toISOString(),
  chainId: 8453,
  chain: "base",
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  treasury: TREASURY,
  targetFundUsd: 50,
  wallets,
};

writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2), { mode: 0o600 });
writeFileSync(
  join(OUT_DIR, "addresses.txt"),
  wallets.map((w) => w.address).join("\n") + "\n",
  "utf8"
);

console.log(`Wrote ${COUNT} wallets → ${OUT_FILE}`);
console.log(`Address list → ${join(OUT_DIR, "addresses.txt")}`);
console.log(`Treasury sweep target: ${TREASURY}`);
console.log("\nNext: fund distributor, then run distribute + pulse (see HANDOFF.md).");
