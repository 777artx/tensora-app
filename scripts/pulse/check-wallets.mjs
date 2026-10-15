#!/usr/bin/env node
/**
 * Read-only fleet status: addresses + on-chain USDC/ETH per wallet.
 * Never prints private keys. Safe to run any time.
 *
 * Usage: node scripts/pulse/check-wallets.mjs
 * Env:   BASE_RPC_URL (optional)
 */
import { readFileSync, existsSync } from "fs";
import { createPublicClient, http, formatUnits, formatEther } from "viem";
import { base } from "viem/chains";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const FILE = join(ROOT, ".ops", "pulse", "wallets.json");

if (!existsSync(FILE)) {
  console.error(`Missing ${FILE} — run: npm run pulse:generate`);
  process.exit(1);
}

const store = JSON.parse(readFileSync(FILE, "utf8"));
const wallets = store.wallets || [];
const USDC = store.usdc;

// Measured on Base mainnet: a USDC transfer (~52k gas at ~0.006 gwei) is
// ~0.000000312 ETH, so ~$0.001. This floor covers ~150 transfers.
const GAS_FLOOR = Number(process.env.FLEET_GAS_FLOOR_ETH || 0.00005);

const client = createPublicClient({
  chain: base,
  transport: http(
    process.env.BASE_RPC_URL || "https://mainnet.base.org",
    { timeout: 20_000, retryCount: 2 }
  ),
});

const ERC20 = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "a", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
];

console.log(`Fleet · ${wallets.length} wallets`);
console.log(`USDC    ${USDC}`);
console.log(`Treasury ${store.treasury}`);
console.log(`\nDistributor (send funding here):\n  ${wallets[0]?.address}\n`);

let usdcTotal = 0n;
let ethTotal = 0n;
let gasReady = 0;

console.log("addr                                        USDC          ETH");
for (const w of wallets) {
  try {
    const [u, e] = await Promise.all([
      client.readContract({ address: USDC, abi: ERC20, functionName: "balanceOf", args: [w.address] }),
      client.getBalance({ address: w.address }),
    ]);
    usdcTotal += u;
    ethTotal += e;
    if (Number(e) / 1e18 >= GAS_FLOOR) gasReady++;
    const flag = Number(e) / 1e18 >= GAS_FLOOR ? " " : "*";
    console.log(
      `${w.address}  ${formatUnits(u, 6).padStart(10)}  ${formatEther(e).padStart(12)}${flag}`
    );
  } catch (err) {
    console.log(`${w.address}  read failed: ${String(err?.message || err).slice(0, 50)}`);
  }
}

console.log(`\nTOTAL USDC : ${formatUnits(usdcTotal, 6)}`);
console.log(`TOTAL ETH  : ${formatEther(ethTotal)}`);
console.log(`gas-ready  : ${gasReady}/${wallets.length}  (* = below the ${GAS_FLOOR} ETH floor)`);
