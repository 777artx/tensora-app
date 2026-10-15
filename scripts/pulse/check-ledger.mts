#!/usr/bin/env node
/**
 * Read-only: sum the pulse fleet's ledger balances. Run with
 *   npx -y tsx --env-file=.env.local scripts/pulse/check-ledger.mts
 * No keys are exposed and nothing is submitted.
 */
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd());
const WALLETS_FILE = path.join(ROOT, ".ops", "pulse", "wallets.json");
if (!existsSync(WALLETS_FILE)) {
  console.error("Missing wallets.json");
  process.exit(1);
}

const api = await import("../../src/lib/lab/account-store");
const store = JSON.parse(readFileSync(WALLETS_FILE, "utf8"));
const wallets = store.wallets as { address: string }[];

// Diagnostics: which store is actually in play? A local run that silently
// falls back to the on-disk store would produce numbers production never sees.
console.log(
  `backend probe: KV_REST_API_URL=${process.env.KV_REST_API_URL ? "set" : "UNSET"} ` +
    `KV_REST_API_TOKEN=${process.env.KV_REST_API_TOKEN ? "set" : "UNSET"} ` +
    `UPSTASH=${process.env.UPSTASH_REDIS_REST_URL ? "set" : "UNSET"}`
);

let totCash = 0;
let totCredits = 0;
const rows: { address: string; cash: number; credits: number; total: number }[] = [];

for (const w of wallets) {
  const userId = `pulse-${w.address.toLowerCase()}`;
  try {
    const acct = await api.getOrCreateAccount(userId);
    const cash = Number(acct.usdc || 0) + Number(acct.usdg || 0);
    const credits = Number(acct.credits || 0);
    totCash += cash;
    totCredits += credits;
    rows.push({ address: w.address, cash, credits, total: cash + credits });
  } catch (err) {
    rows.push({ address: w.address, cash: 0, credits: 0, total: -1 });
    console.error(`${w.address} ERROR ${String((err as Error)?.message).slice(0, 80)}`);
  }
}

const r2 = (n: number) => Math.round(n * 100) / 100;
console.log("address                                     cash   credits   total");
for (const r of rows) {
  console.log(
    `${r.address}  ${r.cash.toFixed(2).padStart(7)}  ${r.credits
      .toFixed(2)
      .padStart(7)}  ${r.total.toFixed(2).padStart(7)}`
  );
}
const total = totCash + totCredits;
console.log("");
console.log(`wallets        : ${rows.length}`);
console.log(`ledger cash    : $${r2(totCash)}`);
console.log(`ledger credits : $${r2(totCredits)}`);
console.log(`TOTAL FLOAT    : $${r2(total)}`);
console.log(`avg per wallet : $${r2(total / rows.length)}`);
const funded = rows.filter((r) => r.total > 0).length;
console.log(`funded wallets : ${funded}/${rows.length}`);
