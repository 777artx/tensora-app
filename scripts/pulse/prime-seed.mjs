#!/usr/bin/env node
/**
 * One-off primer: concentrate USDC into a single wallet so the cascade has a
 * seed holding >= target. After the first cascade the float pools above the
 * minimum on its own, so this should only ever need running once.
 *
 * Uses the fewest transfers possible: it picks the richest wallet as the
 * accumulator and pulls from the next richest until it clears the target.
 */
import { createWalletClient, createPublicClient, http, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WALLETS_FILE = join(__dirname, "..", "..", ".ops", "pulse", "wallets.json");
const TARGET = Number(process.env.PRIMER_TARGET_USD || 6);
const DRY = process.argv.includes("--dry");
const RPC = process.env.BASE_RPC_URL || "https://mainnet.base.org";

const USDC_ABI = [
  { type: "function", name: "transfer", stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }] },
  { type: "function", name: "balanceOf", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
];

const store = JSON.parse(readFileSync(WALLETS_FILE, "utf8"));
const USDC = store.usdc;
const wallets = store.wallets;
const pub = createPublicClient({ chain: base, transport: http(RPC) });

async function bal(w) {
  const raw = await pub.readContract({
    address: USDC, abi: USDC_ABI, functionName: "balanceOf", args: [w.address],
  });
  return Number(raw) / 1e6;
}

async function send(w, to, usd) {
  const raw = BigInt(Math.round(usd * 1e6));
  const data = encodeFunctionData({
    abi: USDC_ABI, functionName: "transfer", args: [to, raw],
  });
  if (DRY) {
    console.log(`  DRY ${w.address} -> ${to}  $${usd.toFixed(2)}`);
    return "0xdry";
  }
  const client = createWalletClient({
    account: privateKeyToAccount(w.privateKey),
    chain: base,
    transport: http(RPC, { retryCount: 2, timeout: 20000 }),
  });
  const hash = await client.sendTransaction({ to: USDC, data, chain: base });
  await pub.waitForTransactionReceipt({ hash });
  console.log(`  ${w.address} -> ${to}  $${usd.toFixed(2)}  https://basescan.org/tx/${hash}`);
  return hash;
}

const rows = [];
for (const w of wallets) rows.push({ w, usd: await bal(w) });
rows.sort((a, b) => b.usd - a.usd);

console.log(`target: $${TARGET}   richest: ${rows[0].w.address} $${rows[0].usd.toFixed(2)}`);
if (rows[0].usd >= TARGET) {
  console.log("Seed already exists — nothing to do.");
  process.exit(0);
}

let acc = rows[0];
let moved = 0;
for (let i = 1; i < rows.length && acc.usd < TARGET; i++) {
  const src = rows[i];
  const take = Math.round(src.usd * 100) / 100;
  if (take <= 0) continue;
  console.log(`pull $${take.toFixed(2)} from ${src.w.address}`);
  await send(src.w, acc.w.address, take);
  acc.usd = Math.round((acc.usd + take) * 100) / 100;
  moved = Math.round((moved + take) * 100) / 100;
  await new Promise((r) => setTimeout(r, 2500));
}

console.log(`\nseed wallet ${acc.w.address} now ~$${acc.usd.toFixed(2)} (moved $${moved.toFixed(2)})`);
console.log(acc.usd >= TARGET ? "Seed ready — cascade can run." : "Still short of target.");
