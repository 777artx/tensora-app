#!/usr/bin/env node
/**
 * Seed pulse fleet from distributor (wallet[0]):
 * - tiny ETH for gas on each peer
 * - split USDC across all wallets
 */
import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  formatEther,
  encodeFunctionData,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
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
const RPC =
  process.env.BASE_RPC_URL ||
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  "https://mainnet.base.org";

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
  console.error("Missing wallets.json");
  process.exit(1);
}

const store = JSON.parse(readFileSync(WALLETS_FILE, "utf8"));
const USDC = store.usdc;
const wallets = store.wallets;
const distributor = wallets[0];
const peers = wallets.slice(1);

const publicClient = createPublicClient({ chain: base, transport: http(RPC) });
const account = privateKeyToAccount(distributor.privateKey);
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(RPC),
});

async function sendEth(to, value) {
  if (DRY) {
    logLine({ dry: true, phase: "fund-eth", to, eth: formatEther(value) });
    return "0xdry";
  }
  const hash = await walletClient.sendTransaction({ to, value, chain: base });
  logLine({
    phase: "fund-eth",
    hash,
    to,
    eth: formatEther(value),
    explorer: `https://basescan.org/tx/${hash}`,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

async function sendUsdc(to, amountRaw) {
  const data = encodeFunctionData({
    abi: USDC_ABI,
    functionName: "transfer",
    args: [to, amountRaw],
  });
  if (DRY) {
    logLine({
      dry: true,
      phase: "fund-usdc",
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
    phase: "fund-usdc",
    hash,
    to,
    amountUsdc: formatUnits(amountRaw, 6),
    explorer: `https://basescan.org/tx/${hash}`,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

const ethBal = await publicClient.getBalance({ address: distributor.address });
const usdcBal = await publicClient.readContract({
  address: USDC,
  abi: USDC_ABI,
  functionName: "balanceOf",
  args: [distributor.address],
});

console.log(`Distributor ${distributor.address}`);
console.log(`ETH ${formatEther(ethBal)} · USDC ${formatUnits(usdcBal, 6)} · dry=${DRY}`);

// Keep ~30% ETH on distributor for its own mix/sweep gas; split rest.
const ethReserve = ethBal / 3n;
const ethPool = ethBal - ethReserve;
const ethEach = peers.length > 0 ? ethPool / BigInt(peers.length) : 0n;
// Floor tiny dust; skip if below ~0.00001 ETH
const minEth = parseEther("0.00001");

if (ethEach < minEth) {
  console.error(
    `Not enough ETH to seed peers (have ${formatEther(ethBal)}, need more gas). Abort.`
  );
  process.exit(1);
}

console.log(`\n— Seed ETH (~${formatEther(ethEach)} each to ${peers.length} peers) —`);
for (const w of peers) {
  try {
    await sendEth(w.address, ethEach);
    await sleep(2_500 + Math.floor(Math.random() * 2_500));
  } catch (err) {
    logLine({ error: String(err?.message || err), phase: "fund-eth", to: w.address });
  }
}

// Split USDC across all wallets (including distributor leftover).
const n = wallets.length;
const per = usdcBal / BigInt(n);
console.log(`\n— Seed USDC (~${formatUnits(per, 6)} each to ${peers.length} peers) —`);
for (const w of peers) {
  try {
    await sendUsdc(w.address, per);
    await sleep(2_500 + Math.floor(Math.random() * 2_500));
  } catch (err) {
    logLine({ error: String(err?.message || err), phase: "fund-usdc", to: w.address });
  }
}

console.log("\nDistribute done. Next: node scripts/pulse/run-pulse.mjs");
