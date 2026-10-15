/**
 * Backing monitor — the "fuel gauge" for holder rewards.
 *
 * Checks OpenRouter balance (the backing) against credits outstanding
 * (the liability) and says plainly whether a top-up is needed.
 *
 * Usage:
 *   node scripts/ops/backing-monitor.mjs            # one check
 *   node scripts/ops/backing-monitor.mjs --watch    # re-check every 30 min
 *
 * Env (reads tensora-app/.env.local automatically):
 *   OPENROUTER_API_KEY   required
 *   APP_URL              lab API base (default http://localhost:3011)
 *   MIN_BACKING_RATIO    alert threshold (default 1.5 = 150% backed)
 *   MIN_BACKING_USD      absolute floor (default $50)
 */

import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// Minimal .env.local loader (no deps).
try {
  const raw = readFileSync(path.join(ROOT, ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      // Strip surrounding quotes, e.g. KEY="value"
      process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
    }
  }
} catch {
  /* no .env.local — rely on process env */
}

const APP_URL = (process.env.APP_URL || "http://localhost:3011").replace(/\/$/, "");
const MIN_RATIO = Number(process.env.MIN_BACKING_RATIO || "1.5");
const MIN_USD = Number(process.env.MIN_BACKING_USD || "50");
const WATCH = process.argv.includes("--watch");
const WATCH_MS = 30 * 60_000;

async function openRouterBalance() {
  const key = (process.env.OPENROUTER_API_KEY || "").trim();
  if (!key) throw new Error("OPENROUTER_API_KEY is not set.");
  const res = await fetch("https://openrouter.ai/api/v1/credits", {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`OpenRouter /credits returned ${res.status}`);
  const data = await res.json();
  const total = Number(data?.data?.total_credits ?? NaN);
  const used = Number(data?.data?.total_usage ?? NaN);
  if (!Number.isFinite(total) || !Number.isFinite(used)) {
    throw new Error("Unexpected /credits response shape.");
  }
  return Math.round((total - used) * 100) / 100;
}

async function creditsOutstanding() {
  const res = await fetch(`${APP_URL}/api/lab/earn`);
  if (!res.ok) throw new Error(`${APP_URL}/api/lab/earn returned ${res.status}`);
  const data = await res.json();
  return {
    outstanding: Number(data?.creditsOutstandingUsd ?? 0),
    poolUsd: Number(data?.poolUsd ?? 0),
    feeRevenueUsd: Number(data?.feeRevenueUsd ?? 0),
  };
}

async function checkOnce() {
  const at = new Date().toISOString();
  try {
    const [backing, lab] = await Promise.all([openRouterBalance(), creditsOutstanding()]);
    const ratio = lab.outstanding > 0 ? backing / lab.outstanding : Infinity;
    const ratioStr = Number.isFinite(ratio) ? `${(ratio * 100).toFixed(0)}%` : "∞";
    const ok = backing >= MIN_USD && ratio >= MIN_RATIO;

    console.log(`[${at}]`);
    console.log(`  OpenRouter balance : $${backing.toFixed(2)}`);
    console.log(`  Credits outstanding: $${lab.outstanding.toFixed(2)}  (pool $${lab.poolUsd.toFixed(2)}, fees seen $${lab.feeRevenueUsd.toFixed(2)})`);
    console.log(`  Backing ratio      : ${ratioStr}  (alert below ${(MIN_RATIO * 100).toFixed(0)}% or $${MIN_USD})`);

    if (ok) {
      console.log("  Status             : OK — no action needed.");
    } else {
      const target = Math.max(MIN_USD, lab.outstanding * MIN_RATIO);
      const topUp = Math.max(10, Math.ceil((target - backing) / 5) * 5);
      console.log("  Status             : REFUEL NEEDED");
      console.log(`  Action             : top up ~$${topUp} on https://openrouter.ai/settings/credits`);
      console.log("                       (crypto option → pay the Coinbase link with USDC on Base");
      console.log("                        from the ops hot wallet — takes ~2 minutes)");
    }
    return ok;
  } catch (err) {
    console.error(`[${at}] Monitor error: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

if (WATCH) {
  console.log(`Backing monitor watching (every ${WATCH_MS / 60000} min). Ctrl+C to stop.\n`);
  await checkOnce();
  setInterval(() => void checkOnce().then(() => console.log("")), WATCH_MS);
} else {
  const ok = await checkOnce();
  process.exit(ok ? 0 : 2);
}
