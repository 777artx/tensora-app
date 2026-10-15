#!/usr/bin/env node
/**
 * Print how to fund the pulse fleet (~$50 USDC + gas).
 * Shows distributor = wallet[0], and equal USDC split suggestion.
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WALLETS_FILE = join(__dirname, "..", "..", ".ops", "pulse", "wallets.json");

if (!existsSync(WALLETS_FILE)) {
  console.error("Run generate-wallets.mjs first.");
  process.exit(1);
}

const store = JSON.parse(readFileSync(WALLETS_FILE, "utf8"));
const n = store.wallets.length;
const perUsdc = (50 / n).toFixed(4);
const distributor = store.wallets[0];

console.log(`
Pulse funding plan
------------------
Chain: Base (8453)
USDC:  ${store.usdc}
Treasury (Robinhood receive): ${store.treasury}

1) Send ~$3–5 ETH-worth of ETH on Base to distributor for gas:
   ${distributor.address}

2) Send ~$50 USDC on Base to distributor:
   ${distributor.address}

3) From distributor, send ~$${perUsdc} USDC + tiny ETH to each of the ${n} addresses
   (list in .ops/pulse/addresses.txt).

4) Dry run:  PULSE_DRY_RUN=1 node scripts/pulse/run-pulse.mjs
5) Live:     node scripts/pulse/run-pulse.mjs

Agent operates this for beta. When you take over: copy .ops/pulse/ securely,
rotate keys if needed, keep .ops/ gitignored forever.
`);
