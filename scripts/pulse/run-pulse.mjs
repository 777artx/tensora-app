#!/usr/bin/env node
/**
 * Pulse fleet: mix USDC between wallets, then sweep leftovers toward treasury.
 *
 * Env:
 *   BASE_RPC_URL (optional)
 *   PULSE_DRY_RUN=1 — log only, no broadcasts
 *   PULSE_ROUNDS=3 — wallet↔wallet rounds before sweep
 *
 * Usage: node scripts/pulse/run-pulse.mjs
 *
 * Requires funded wallets in .ops/pulse/wallets.json (USDC + tiny ETH for gas).
 */
import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  encodeFunctionData,
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
const LOG_FILE = join(OUT_DIR, "pulse-log.jsonl");

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
const ROUNDS = Math.max(1, Number(process.env.PULSE_ROUNDS || 3));
const RPC = process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function logLine(row) {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(LOG_FILE, JSON.stringify({ at: new Date().toISOString(), ...row }) + "\n", {
    flag: "a",
  });
  console.log(JSON.stringify(row));
}

if (!existsSync(WALLETS_FILE)) {
  console.error("Missing .ops/pulse/wallets.json — run generate-wallets.mjs first.");
  process.exit(1);
}

const store = JSON.parse(readFileSync(WALLETS_FILE, "utf8"));
const USDC = store.usdc;
const TREASURY = store.treasury;
const wallets = store.wallets;

const publicClient = createPublicClient({
  chain: base,
  transport: http(RPC),
});

async function usdcBalance(address) {
  return publicClient.readContract({
    address: USDC,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: [address],
  });
}

async function sendUsdc(fromWallet, to, amountRaw) {
  const account = privateKeyToAccount(fromWallet.privateKey);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(RPC),
  });
  const data = encodeFunctionData({
    abi: USDC_ABI,
    functionName: "transfer",
    args: [to, amountRaw],
  });

  if (DRY) {
    logLine({
      dry: true,
      from: account.address,
      to,
      amountUsdc: formatUnits(amountRaw, 6),
    });
    return "0xdry";
  }

  const hash = await walletClient.sendTransaction({
    to: USDC,
    data,
    chain: base,
  });
  logLine({
    hash,
    from: account.address,
    to,
    amountUsdc: formatUnits(amountRaw, 6),
    explorer: `https://basescan.org/tx/${hash}`,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

function pickOther(i) {
  let j = i;
  while (j === i) j = Math.floor(Math.random() * wallets.length);
  return wallets[j];
}

console.log(`Pulse fleet · ${wallets.length} wallets · rounds=${ROUNDS} · dry=${DRY}`);
console.log(`Treasury: ${TREASURY}`);

// Mix: each round, wallets with balance send a small slice to a peer.
for (let round = 0; round < ROUNDS; round++) {
  console.log(`\n— Round ${round + 1}/${ROUNDS} —`);
  for (let i = 0; i < wallets.length; i++) {
    const w = wallets[i];
    const bal = await usdcBalance(w.address);
    if (bal < parseUnits("0.05", 6)) continue;
    // Send 10–35% of balance to a peer (keeps dust for later sweeps).
    const pct = 10 + Math.floor(Math.random() * 26);
    const amount = (bal * BigInt(pct)) / 100n;
    if (amount < parseUnits("0.02", 6)) continue;
    const peer = pickOther(i);
    try {
      await sendUsdc(w, peer.address, amount);
      // Space txs — not every second.
      await sleep(8_000 + Math.floor(Math.random() * 12_000));
    } catch (err) {
      logLine({ error: String(err?.message || err), from: w.address });
    }
  }
}

// Sweep: leave ~$0.05, send rest to treasury.
console.log("\n— Sweep to treasury —");
for (const w of wallets) {
  try {
    const bal = await usdcBalance(w.address);
    const keep = parseUnits("0.05", 6);
    if (bal <= keep) continue;
    const amount = bal - keep;
    await sendUsdc(w, TREASURY, amount);
    await sleep(10_000 + Math.floor(Math.random() * 15_000));
  } catch (err) {
    logLine({ error: String(err?.message || err), from: w.address, phase: "sweep" });
  }
}

console.log("\nDone. Log:", LOG_FILE);
