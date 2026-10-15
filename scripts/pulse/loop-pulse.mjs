#!/usr/bin/env node
/**
 * Continuous pulse: recycle USDC among the fleet forever, with occasional
 * treasury drips — random intervals so Basescan looks live.
 *
 * Optimized for public RPCs: only 1 balance read per tick (not full fleet scan).
 *
 * Env:
 *   BASE_RPC_URL / PULSE_RPC_URLS (comma-separated)
 *   PULSE_DRY_RUN=1
 *   PULSE_MIN_GAP_MS=20000
 *   PULSE_MAX_GAP_MS=120000
 *   PULSE_DRIP_CHANCE=0.18
 *   PULSE_KEEP_USD=35
 *   PULSE_MIN_WALLET_USD=0.15
 *
 * Usage: node scripts/pulse/loop-pulse.mjs
 * Stop: Ctrl+C
 */
import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  encodeFunctionData,
  fallback,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const OUT_DIR = join(ROOT, ".ops", "pulse");
const WALLETS_FILE = join(OUT_DIR, "wallets.json");
const LOG_FILE = join(OUT_DIR, "pulse-loop.jsonl");
const PID_FILE = join(OUT_DIR, "loop.pid");

const USDC_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
];

const DRY = process.env.PULSE_DRY_RUN === "1" || process.argv.includes("--dry");
const RPC_LIST = (
  process.env.PULSE_RPC_URLS ||
  process.env.BASE_RPC_URL ||
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  [
    "https://base.publicnode.com",
    "https://1rpc.io/base",
    "https://base.meowrpc.com",
    "https://mainnet.base.org",
  ].join(",")
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const MIN_GAP = Math.max(5_000, Number(process.env.PULSE_MIN_GAP_MS || 20_000));
const MAX_GAP = Math.max(MIN_GAP + 1_000, Number(process.env.PULSE_MAX_GAP_MS || 120_000));
const DRIP_CHANCE = Math.min(0.5, Math.max(0, Number(process.env.PULSE_DRIP_CHANCE || 0.18)));
const KEEP_USD = Number(process.env.PULSE_KEEP_USD || 35);
const MIN_WALLET = parseUnits(String(process.env.PULSE_MIN_WALLET_USD || "0.15"), 6);
const KEEP_RAW = parseUnits(String(KEEP_USD), 6);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randInt(a, b) {
  return a + Math.floor(Math.random() * (b - a + 1));
}

function logLine(row) {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(LOG_FILE, JSON.stringify({ at: new Date().toISOString(), ...row }) + "\n", {
    flag: "a",
  });
  console.log(JSON.stringify(row));
}

async function withRetry(fn, label, attempts = 6) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const msg = String(err?.message || err);
      const retryable = /rate limit|429|timeout|ECONNRESET|fetch failed|502|503|520|522|524/i.test(
        msg
      );
      if (!retryable || i === attempts - 1) throw err;
      const wait = 3_000 * (i + 1) + randInt(0, 2000);
      logLine({ warn: "retry", label, attempt: i + 1, waitMs: wait });
      await sleep(wait);
    }
  }
  throw last;
}

if (!existsSync(WALLETS_FILE)) {
  console.error("Missing .ops/pulse/wallets.json");
  process.exit(1);
}

const store = JSON.parse(readFileSync(WALLETS_FILE, "utf8"));
const USDC = store.usdc;
const TREASURY = store.treasury;
const wallets = store.wallets;

const transport = fallback(
  RPC_LIST.map((url) => http(url, { retryCount: 1, timeout: 20_000 })),
  { rank: false }
);

const publicClient = createPublicClient({
  chain: base,
  transport,
});

async function usdcBalance(address) {
  return withRetry(
    () =>
      publicClient.readContract({
        address: USDC,
        abi: USDC_ABI,
        functionName: "balanceOf",
        args: [address],
      }),
    "balanceOf"
  );
}

async function sendUsdc(fromWallet, to, amountRaw, phase) {
  const account = privateKeyToAccount(fromWallet.privateKey);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport,
  });
  const data = encodeFunctionData({
    abi: USDC_ABI,
    functionName: "transfer",
    args: [to, amountRaw],
  });

  if (DRY) {
    logLine({
      dry: true,
      phase,
      from: account.address,
      to,
      amountUsdc: formatUnits(amountRaw, 6),
    });
    return "0xdry";
  }

  const hash = await withRetry(
    () =>
      walletClient.sendTransaction({
        to: USDC,
        data,
        chain: base,
      }),
    "send"
  );
  logLine({
    phase,
    hash,
    from: account.address,
    to,
    amountUsdc: formatUnits(amountRaw, 6),
    explorer: `https://basescan.org/tx/${hash}`,
  });
  await withRetry(
    () => publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 }),
    "receipt"
  );
  return hash;
}

function pickOther(i) {
  let j = i;
  while (j === i) j = randInt(0, wallets.length - 1);
  return j;
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(PID_FILE, String(process.pid));

let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
  console.log("\nStopping after current tx…");
});
process.on("SIGTERM", () => {
  stopping = true;
});

console.log(
  `Pulse LOOP · ${wallets.length} wallets · gap ${MIN_GAP}-${MAX_GAP}ms · drip=${DRIP_CHANCE} · keep≥$${KEEP_USD} · dry=${DRY}`
);
console.log(`RPCs: ${RPC_LIST.join(" | ")}`);
console.log(`Treasury: ${TREASURY}`);
console.log(`Log: ${LOG_FILE}`);

// One slow sample of a few wallets to estimate float (not all 22).
let estimatedFloat = 0n;
const sampleN = Math.min(6, wallets.length);
for (let s = 0; s < sampleN; s++) {
  const idx = Math.floor((s * wallets.length) / sampleN);
  try {
    const bal = await usdcBalance(wallets[idx].address);
    estimatedFloat += bal;
    await sleep(400);
  } catch (err) {
    logLine({ warn: "sample_skip", error: String(err?.message || err).slice(0, 80) });
  }
}
// Extrapolate sample → fleet estimate
if (sampleN > 0) {
  estimatedFloat = (estimatedFloat * BigInt(wallets.length)) / BigInt(sampleN);
}
console.log(`Estimated fleet float: ~$${formatUnits(estimatedFloat, 6)} USDC`);
if (estimatedFloat < parseUnits("5", 6)) {
  console.error(`
Not enough float. Send USDC on Base to distributor:
  ${wallets[0].address}
Then: node scripts/pulse/distribute.mjs && node scripts/pulse/loop-pulse.mjs
`);
  process.exit(1);
}

let n = 0;
while (!stopping) {
  n += 1;
  try {
    // Pick a random wallet; only read THAT balance (1 RPC).
    const i = randInt(0, wallets.length - 1);
    const w = wallets[i];
    const bal = await usdcBalance(w.address);

    if (bal < MIN_WALLET) {
      logLine({
        skip: "low_balance",
        tick: n,
        from: w.address,
        bal: formatUnits(bal, 6),
      });
    } else {
      const wantDrip =
        Math.random() < DRIP_CHANCE && estimatedFloat > KEEP_RAW;

      if (wantDrip) {
        const pct = 5 + randInt(0, 15);
        let amount = (bal * BigInt(pct)) / 100n;
        const maxDrip = estimatedFloat > KEEP_RAW ? estimatedFloat - KEEP_RAW : 0n;
        if (amount > maxDrip) amount = maxDrip;
        if (amount >= parseUnits("0.05", 6)) {
          await sendUsdc(w, TREASURY, amount, "drip");
          estimatedFloat -= amount;
        } else {
          const j = pickOther(i);
          const mixAmt = (bal * BigInt(10 + randInt(0, 25))) / 100n;
          if (mixAmt >= parseUnits("0.05", 6)) {
            await sendUsdc(w, wallets[j].address, mixAmt, "mix");
          }
        }
      } else {
        const j = pickOther(i);
        const mixAmt = (bal * BigInt(10 + randInt(0, 30))) / 100n;
        if (mixAmt >= parseUnits("0.05", 6)) {
          await sendUsdc(w, wallets[j].address, mixAmt, "mix");
        } else {
          logLine({ skip: "dust", from: w.address, bal: formatUnits(bal, 6) });
        }
      }
    }

    logLine({
      tick: n,
      estimatedFleetUsdc: formatUnits(estimatedFloat, 6),
    });
  } catch (err) {
    logLine({ error: String(err?.message || err).slice(0, 200), tick: n });
  }

  if (stopping) break;
  const gap = randInt(MIN_GAP, MAX_GAP);
  console.log(`… sleep ${Math.round(gap / 1000)}s`);
  await sleep(gap);
}

console.log("Loop stopped.");
