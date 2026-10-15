/**
 * Continuous fleet trader — keeps the credits/USDC book live 24/7 from the
 * pulse wallet fleet, so the public tape on /lab/market keeps printing.
 *
 * Why this can run forever:
 *   1. The order book IS the ledger (KV). Filled orders never post a tx, so
 *      "keep trading" costs nothing. Only the optional on-chain hop costs gas.
 *   2. The bankroll is recycled, not spent. In `--onchain` mode a wallet funds
 *      its ledger account by sending USDC to a PEER (default), not the
 *      treasury. The peer re-sends later, so the physical float circulates and
 *      only gas is consumed. `FLEET_FUND=treasury` opts into draining instead.
 *
 * Modes:
 *   --local     isolated scratch ledger + synthetic hashes. Free rehearsal.
 *   --onchain   real Base USDC hops. Needs funded wallets + ETH for gas.
 *
 * Env:
 *   FLEET_CYCLES=1            cycles to run (0 = forever)
 *   FLEET_CADENCE_MS=60000    pause between cycles
 *   FLEET_ROUNDS=2            trade rounds per wallet per cycle
 *   FLEET_WALLETS=22          how many fleet wallets to use
 *   FLEET_MIN_USD=2  FLEET_MAX_USD=25
 *   FLEET_SPACING_MS=3000     gap between on-chain sends
 *   FLEET_HOP_MIN_USD=0.25   smallest on-chain USDC hop (not a book order)
 *   FLEET_HOP_MAX_USD=3      largest on-chain USDC hop (hop sizes are random)
 *   FLEET_HOP_MAX_PCT=90     most of a wallet's balance one hop may move
 *   FLEET_FLOOR_USD=5        rebalance so no wallet sits below this (0 = off)
 *   FLEET_LEDGER_FLOOR_USD=15 top up a ledger account below this
 *   FLEET_TOPUP_MAX_USD=15    most USDC a single hop may move
 *   FLEET_HOP_CHANCE=0.25     odds a cycle moves real USDC on-chain
 *   FLEET_FUND=peer|treasury  where a funding hop sends USDC
 *   FLEET_GAS_FLOOR_ETH=0.00005 skip on-chain work below this ETH balance
 *   FLEET_DRY=1               log only, never broadcast
 *
 * Usage:
 *   npx -y tsx scripts/pulse/loop-fleet.mts --local --cycles 1
 *   npx -y tsx scripts/pulse/loop-fleet.mts --onchain --yes
 */
import { createHash, randomUUID } from "crypto";
import {
  existsSync,
  promises as fs,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "fs";
import path from "path";

const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(f);
const ENV_ONCHAIN = has("--onchain");
const CONFIRMED = has("--yes") || process.env.FLEET_LIVE === "1";
const PLAN_ONLY = has("--plan");
const JSON_OUT = has("--json");
const DRY = process.env.FLEET_DRY === "1" || has("--dry");

const ROOT = path.resolve(process.cwd());
const WALLETS_FILE = path.join(ROOT, ".ops", "pulse", "wallets.json");
const ENV_FILE = path.join(ROOT, ".env.local");
const LOG_DIR = path.join(ROOT, ".ops", "pulse");
const LOG_FILE = path.join(LOG_DIR, "fleet-loop.jsonl");
const PID_FILE = path.join(LOG_DIR, "fleet-loop.pid");
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const num = (k: string, d: number) => {
  const v = Number(process.env[k]);
  return Number.isFinite(v) && v > 0 ? v : d;
};
/** `--cycles N` overrides FLEET_CYCLES (0 = forever). */
function cyclesFromArgv(): number | null {
  const i = argv.indexOf("--cycles");
  if (i === -1) return null;
  const v = Number(argv[i + 1]);
  return Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
}
const cyclesArg = cyclesFromArgv();
const CFG = {
  cycles: has("--forever") ? 0 : cyclesArg ?? Math.round(num("FLEET_CYCLES", 1)),
  cadenceMs: Math.round(num("FLEET_CADENCE_MS", 60_000)),
  rounds: Math.round(num("FLEET_ROUNDS", 1)),
  perCycle: Math.round(num("FLEET_PER_CYCLE", 6)),
  minUsd: num("FLEET_MIN_USD", 2),
  maxUsd: num("FLEET_MAX_USD", 25),
  // On-chain hops are NOT book orders: a USDC transfer has no $1 minimum.
  // Keep this separate from minUsd or small wallets never hop.
  hopMinUsd: num("FLEET_HOP_MIN_USD", 0.25),
  hopMaxUsd: num("FLEET_HOP_MAX_USD", 3),
  // Max share of a wallet's balance one hop may move. In peer mode the money
  // comes back, so this can be high; it only stops a wallet stranding itself.
  hopMaxPct: Math.min(100, Math.max(1, num("FLEET_HOP_MAX_PCT", 90))),
  // Working floor per wallet. In on-chain mode a rebalancer moves USDC from
  // rich to poor wallets each cycle so none is stranded below this.
  floorUsd: num("FLEET_FLOOR_USD", 5),
  spacingMs: Math.round(num("FLEET_SPACING_MS", 3_000)),
  ledgerFloor: num("FLEET_LEDGER_FLOOR_USD", 15),
  topUpMax: num("FLEET_TOPUP_MAX_USD", 15),
  hopChance: Math.min(1, Math.max(0, Number(process.env.FLEET_HOP_CHANCE ?? 0.25))),
  fund:
    (process.env.FLEET_FUND || "peer").toLowerCase() === "treasury"
      ? ("treasury" as const)
      : ("peer" as const),
  gasFloorEth: Number(process.env.FLEET_GAS_FLOOR_ETH || 0.00005),
  limitUsd: 500,
};

const out = JSON_OUT ? () => {} : (...a: unknown[]) => console.log(...a);
const rule = (t: string) =>
  out(`\n${"─".repeat(4)} ${t} ${"─".repeat(Math.max(4, 62 - t.length))}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randInt = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const round2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) => `$${round2(n).toFixed(2)}`;

function syntheticTx(seed: string) {
  return `0x${createHash("sha256").update(`fleet-loop:${seed}`).digest("hex")}`;
}

function logLine(row: Record<string, unknown>) {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    writeFileSync(LOG_FILE, JSON.stringify({ at: new Date().toISOString(), ...row }) + "\n", {
      flag: "a",
    });
  } catch {
    /* logging must never kill the loop */
  }
  if (!JSON_OUT) console.log(JSON.stringify(row));
}

function parseEnvFile(raw: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    vars[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return vars;
}

type FleetWallet = { index: number; address: string; privateKey?: string };

/** Local mode runs isolated so it can never touch the live ledger. */
async function configureBackend(onchain: boolean) {
  if (!onchain) {
    process.env.BLOB_READ_WRITE_TOKEN = "";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    const scratch =
      process.env.FLEET_SCRATCH || path.join(".tmp", `loop-${Date.now().toString(36)}`);
    await fs.mkdir(scratch, { recursive: true });
    process.chdir(scratch);
    return { backend: "local" as const, detail: process.cwd() };
  }
  let loaded = 0;
  if (existsSync(ENV_FILE)) {
    const vars = parseEnvFile(await fs.readFile(ENV_FILE, "utf8"));
    for (const [k, v] of Object.entries(vars)) {
      if (process.env[k] === undefined) {
        process.env[k] = v;
        loaded++;
      }
    }
  }
  const redis = Boolean(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL);
  const blob = Boolean((process.env.BLOB_READ_WRITE_TOKEN || "").trim());
  return {
    backend: redis ? ("redis" as const) : blob ? ("blob" as const) : ("local" as const),
    detail: loaded ? `${loaded} vars from .env.local` : "env already set",
  };
}

const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
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
] as const;

async function chainClients() {
  const viem = await import("viem");
  const accounts = await import("viem/accounts");
  const chains = await import("viem/chains");
  const rpc =
    process.env.BASE_RPC_URL ||
    process.env.PULSE_RPC_URL ||
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
    "https://mainnet.base.org";
  const publicClient = viem.createPublicClient({
    chain: chains.base,
    transport: viem.http(rpc, { retryCount: 2, timeout: 20_000 }),
  });
  return { viem, accounts, chains, publicClient, rpc };
}

/** Confirm a tx really is a USDC transfer of >= minUsd FROM `from`. */
async function verifyUsdcTransfer(
  publicClient: any,
  viem: any,
  hash: `0x${string}`,
  from: string,
  minUsd: number
): Promise<{ ok: boolean; amountUsd: number; reason?: string }> {
  let receipt: any;
  try {
    receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 90_000 });
  } catch (err) {
    return {
      ok: false,
      amountUsd: 0,
      reason: `no receipt: ${err instanceof Error ? err.message : err}`,
    };
  }
  if (receipt.status !== "success") return { ok: false, amountUsd: 0, reason: "reverted" };
  if ((receipt.to || "").toLowerCase() !== USDC_BASE.toLowerCase()) {
    return { ok: false, amountUsd: 0, reason: "not a USDC transfer" };
  }
  const log = receipt.logs.find(
    (l: any) => (l.address || "").toLowerCase() === USDC_BASE.toLowerCase()
  );
  if (!log) return { ok: false, amountUsd: 0, reason: "no USDC Transfer log" };
  const parsed = viem.decodeEventLog({
    abi: [
      viem.parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)"),
    ],
    data: log.data,
    topics: log.topics,
  });
  const okFrom = String(parsed.args.from).toLowerCase() === from.toLowerCase();
  const amountUsd = Number(parsed.args.value) / 1e6;
  if (!okFrom) return { ok: false, amountUsd, reason: "sender mismatch" };
  if (amountUsd + 1e-9 < minUsd) return { ok: false, amountUsd, reason: `only ${money(amountUsd)}` };
  return { ok: true, amountUsd };
}

// ── setup ────────────────────────────────────────────────────────────────────
if (!existsSync(WALLETS_FILE)) {
  console.error(`\nNo wallet fleet at ${WALLETS_FILE}\n  Generate one first:  npm run pulse:generate\n`);
  process.exit(2);
}

const store = JSON.parse(readFileSync(WALLETS_FILE, "utf8")) as {
  treasury?: string;
  wallets: FleetWallet[];
};
const wanted = Math.round(num("FLEET_WALLETS", store.wallets.length));
const wallets = store.wallets.slice(0, Math.max(2, wanted));

const backend = await configureBackend(ENV_ONCHAIN);
const api = await import("../../src/lib/lab/account-store");

const userIdFor = (w: FleetWallet) => `pulse-${w.address.toLowerCase()}`;

out(`\nOlora fleet loop`);
out(`mode: ${ENV_ONCHAIN ? "ONCHAIN (real USDC on Base)" : "LOCAL (isolated ledger)"}  ·  dry=${DRY}`);
out(`backend: ${backend.backend}  ·  ${backend.detail}`);
out(
  `wallets: ${wallets.length}  ·  cycles: ${CFG.cycles === 0 ? "∞" : CFG.cycles}  ·  ` +
    `rounds/cycle: ${CFG.rounds}  ·  order ${money(CFG.minUsd)}–${money(CFG.maxUsd)}`
);

if (ENV_ONCHAIN && !PLAN_ONLY && !CONFIRMED && !DRY) {
  console.error(
    "\nRefusing to trade the production ledger from the fleet without --yes (or FLEET_LIVE=1).\n" +
      "  Rehearse first:  npx -y tsx scripts/pulse/loop-fleet.mts --local --cycles 1\n"
  );
  process.exit(3);
}

// ── chain clients + gas/liquidity guards ─────────────────────────────────────
let chain: Awaited<ReturnType<typeof chainClients>> | null = null;
let chainEnabled = ENV_ONCHAIN;
const rawBalances = new Map<string, bigint>();

async function refreshRawBalance(w: FleetWallet): Promise<bigint> {
  if (!chainEnabled || !chain) return 0n;
  try {
    const bal = (await chain.publicClient.readContract({
      address: USDC_BASE as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [w.address as `0x${string}`],
    })) as bigint;
    rawBalances.set(w.address.toLowerCase(), bal);
    return bal;
  } catch (err) {
    logLine({ warn: "balance_read", wallet: w.address, error: String((err as Error)?.message).slice(0, 100) });
    return rawBalances.get(w.address.toLowerCase()) ?? 0n;
  }
}

async function hasGas(w: FleetWallet): Promise<boolean> {
  if (!chainEnabled || !chain) return false;
  try {
    const eth = await chain.publicClient.getBalance({ address: w.address as `0x${string}` });
    return Number(eth) / 1e18 >= CFG.gasFloorEth;
  } catch {
    return false;
  }
}

if (ENV_ONCHAIN && !PLAN_ONLY) {
  chain = await chainClients();
  rule("Wallet funding");
  let usdcTotal = 0;
  let gasReady = 0;
  for (const w of wallets) {
    const bal = await refreshRawBalance(w);
    const eth = await chain.publicClient.getBalance({ address: w.address as `0x${string}` });
    usdcTotal += Number(bal) / 1e6;
    if (Number(eth) / 1e18 >= CFG.gasFloorEth) gasReady++;
    out(`  ${w.address}  ${money(Number(bal) / 1e6)} USDC  ·  ${(Number(eth) / 1e18).toFixed(6)} ETH`);
  }
  out(`  total ${money(usdcTotal)} across ${wallets.length} wallets · ${gasReady} gas-ready`);
  if (usdcTotal < CFG.minUsd * 2) {
    console.error(
      `\nNot enough USDC in the fleet to trade.\n` +
        `  Fund distributor ${wallets[0].address} then:  npm run pulse:distribute\n`
    );
    process.exit(5);
  }
  if (gasReady < 2) {
    console.error(
      `\nFewer than 2 wallets have gas (need ~${CFG.gasFloorEth} ETH each on Base).\n` +
        `  Send ETH on Base to the distributor, then:  npm run pulse:distribute\n`
    );
    process.exit(5);
  }
}

if (PLAN_ONLY) {
  out(`\nPlan: ${wallets.length} wallets × ${CFG.rounds} rounds × ${CFG.cycles || "∞"} cycles`);
  out(`  ledger floor ${money(CFG.ledgerFloor)} · hop chance ${CFG.hopChance} · fund=${CFG.fund}`);
  out(`  hop ${money(CFG.hopMinUsd)}–${money(CFG.hopMaxUsd)} random · gas floor ${CFG.gasFloorEth} ETH`);
  out(`  floor ${money(CFG.floorUsd)} · wallets/cycle ${CFG.perCycle}`);
  out("\nDry plan only — nothing submitted.");
  process.exit(0);
}

// ── per-cycle phases ─────────────────────────────────────────────────────────
/**
 * Make sure `pulse-<wallet>` has spendable USDC in the ledger.
 * On-chain: a real hop (peer by default so the float is preserved) whose hash
 * is verified before it funds the account. Local: synthetic hash.
 */
async function ensureLedgerFunding(w: FleetWallet, cycle: number): Promise<number> {
  const userId = userIdFor(w);
  const acct = await api.getOrCreateAccount(userId);
  const ledgerUsd = round2((acct.usdc || 0) + (acct.usdg || 0));
  if (ledgerUsd >= CFG.ledgerFloor) return ledgerUsd;

  const wantUsd = round2(CFG.ledgerFloor - ledgerUsd);

  if (!ENV_ONCHAIN) {
    const amt = Math.min(wantUsd, CFG.topUpMax, CFG.limitUsd);
    if (amt < CFG.minUsd) return ledgerUsd;
    await api.claimOnChainDeposit(userId, {
      method: "usdc",
      amountUsd: amt,
      txHash: syntheticTx(`${cycle}:${w.address}:${randomUUID().slice(0, 8)}`),
      token: "USDC",
      from: w.address,
      chain: "base",
    });
    out(`  ${w.address}  ledger +${money(amt)} (local)`);
    return ledgerUsd + amt;
  }

  // On-chain path.
  if (!chain) return ledgerUsd;
  if (Math.random() > CFG.hopChance) return ledgerUsd;

  const raw = await refreshRawBalance(w);
  // Random hop size so the tape looks organic rather than a fixed drip.
  // Bounded: the random draw, a share of the balance (so it never strands
  // itself), and never more than the ledger actually needs.
  const drawUsd = round2(rand(CFG.hopMinUsd, CFG.hopMaxUsd));
  const drawRaw = BigInt(Math.round(drawUsd * 1e6));
  const pctRaw = (raw * BigInt(Math.round(CFG.hopMaxPct))) / 100n;
  const needRaw = BigInt(Math.round(wantUsd * 1e6));
  let spendRaw = drawRaw;
  if (spendRaw > pctRaw) spendRaw = pctRaw;
  if (spendRaw > needRaw) spendRaw = needRaw;
  const spendUsd = Number(spendRaw) / 1e6;
  if (spendRaw <= 0n || spendUsd < CFG.hopMinUsd) {
    logLine({ skip: "dust", wallet: w.address, balanceUsd: Number(raw) / 1e6, cycle });
    return ledgerUsd;
  }

  const dest =
    CFG.fund === "treasury"
      ? (store.treasury || process.env.TENSORA_TREASURY_ADDRESS || "").toLowerCase()
      : wallets[randInt(0, wallets.length - 1)].address;
  if (!dest || dest.toLowerCase() === w.address.toLowerCase()) return ledgerUsd;

  const ok = await hopUsdc(w, dest, spendUsd, cycle, "hop");
  if (!ok) return ledgerUsd;

  const after = await api.getOrCreateAccount(userId);
  return round2((after.usdc || 0) + (after.usdg || 0));
}

/** A seller needs credits before it can post. Buy a small book position. */
async function ensureInventory(w: FleetWallet): Promise<void> {
  const userId = userIdFor(w);
  const acct = await api.getOrCreateAccount(userId);
  if ((acct.credits || 0) >= CFG.minUsd) return;
  const cash = round2((acct.usdc || 0) + (acct.usdg || 0));
  const seedCap = round2(cash * 0.5);
  if (seedCap < CFG.minUsd) return;
  const size = round2(Math.max(CFG.minUsd, Math.min(rand(CFG.minUsd, CFG.maxUsd * 0.6), seedCap)));
  try {
    const res = await api.placeMarketOrder(userId, {
      side: "buy",
      sizeUsd: size,
      type: "market",
      wallet: w.address,
    });
    if (res.ok) out(`  ${w.address}  inventory ${money(res.filledUsd)} of credits`);
  } catch (err) {
    logLine({ warn: "inventory", wallet: w.address, error: String((err as Error)?.message) });
  }
}

/** Spendable on-chain USDC, refreshed from the chain (falls back to the cache). */
async function walletUsd(w: FleetWallet): Promise<number> {
  if (!chainEnabled || !chain) return Number(rawBalances.get(w.address.toLowerCase()) ?? 0n) / 1e6;
  const raw = await refreshRawBalance(w);
  return Number(raw) / 1e6;
}

/**
 * Keep every wallet above the working floor by moving USDC from the richest
 * wallets to the poorest. In peer mode this conserves the float — it only
 * repositions it so no wallet is stranded below `floor` and unable to hop.
 */
async function rebalance(cycle: number): Promise<number> {
  if (!ENV_ONCHAIN || !chain) return 0;
  if (CFG.floorUsd <= 0 || wallets.length < 2) return 0;

  const rows: { w: FleetWallet; usd: number }[] = [];
  for (const w of wallets) rows.push({ w, usd: await walletUsd(w) });
  rows.sort((a, b) => a.usd - b.usd);

  let moved = 0;
  let guard = 0;
  while (guard++ < wallets.length * 2) {
    const poor = rows[0];
    const rich = rows[rows.length - 1];
    if (poor.usd >= CFG.floorUsd) break;
    const need = round2(CFG.floorUsd - poor.usd);
    // Never strip a donor below the floor itself.
    const spare = round2(rich.usd - CFG.floorUsd);
    if (spare <= 0) break;
    const move = round2(Math.min(need, spare));
    if (move < CFG.hopMinUsd) break;
    if (poor.w.address.toLowerCase() === rich.w.address.toLowerCase()) break;

    const ok = await hopUsdc(rich.w, poor.w.address, move, cycle, "rebalance");
    if (!ok) break;
    rich.usd = round2(rich.usd - move);
    poor.usd = round2(poor.usd + move);
    moved = round2(moved + move);
    rows.sort((a, b) => a.usd - b.usd);
    if (stopping) break;
  }
  return moved;
}

/** One on-chain USDC transfer, verified against the token contract. */
async function hopUsdc(
  from: FleetWallet,
  dest: string,
  spendUsd: number,
  cycle: number,
  phase: string,
  creditUserId?: string
): Promise<boolean> {
  if (!chain) return false;
  if (!(await hasGas(from))) {
    logLine({ skip: "no_gas", wallet: from.address, cycle, phase });
    return false;
  }
  const raw = await refreshRawBalance(from);
  const spendRaw = BigInt(Math.round(spendUsd * 1e6));
  if (spendRaw <= 0n || spendRaw > raw) {
    logLine({ skip: "insufficient", wallet: from.address, cycle, phase, want: spendUsd });
    return false;
  }
  if (DRY) {
    out(`  ${from.address}  DRY ${phase} ${money(spendUsd)} → ${dest.slice(0, 10)}…`);
    return true;
  }
  const viem = chain.viem;
  const walletClient = viem.createWalletClient({
    account: chain.accounts.privateKeyToAccount(from.privateKey as `0x${string}`),
    chain: chain.chains.base,
    transport: viem.http(chain.rpc, { retryCount: 2, timeout: 20_000 }),
  });

  let hash: `0x${string}`;
  try {
    hash = (await walletClient.sendTransaction({
      to: USDC_BASE as `0x${string}`,
      data: viem.encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [dest as `0x${string}`, spendRaw],
      }),
      chain: chain.chains.base,
    })) as `0x${string}`;
  } catch (err) {
    logLine({
      warn: "hop_failed",
      wallet: from.address,
      cycle,
      phase,
      error: String((err as Error)?.message).split("\n")[0],
    });
    return false;
  }

  let check: { ok: boolean; amountUsd: number; reason?: string };
  try {
    check = await verifyUsdcTransfer(chain.publicClient, viem, hash, from.address, CFG.hopMinUsd);
  } catch (err) {
    logLine({ warn: "verify_failed", wallet: from.address, error: String((err as Error)?.message) });
    return false;
  }
  if (!check.ok) {
    logLine({ warn: "hop_rejected", wallet: from.address, reason: check.reason, phase });
    return false;
  }

  rawBalances.set(from.address.toLowerCase(), raw - spendRaw);
  totalHops++;

  // A funding hop also credits the sending wallet's ledger account from the
  // verified hash, so the account has spendable cash to trade the book with.
  if (creditUserId) {
    try {
      await api.claimOnChainDeposit(creditUserId, {
        method: "usdc",
        amountUsd: check.amountUsd,
        txHash: hash,
        token: "USDC",
        from: from.address,
        chain: "base",
      });
    } catch (err) {
      logLine({
        warn: "credit_failed",
        wallet: from.address,
        error: String((err as Error)?.message).split("\n")[0],
      });
    }
  }

  out(
    `  ${from.address}  ${phase} ${money(check.amountUsd)} → ${dest.slice(0, 10)}…  ` +
      `${hash.slice(0, 12)}…`
  );
  logLine({
    phase,
    cycle,
    from: from.address,
    to: dest,
    amountUsd: round2(check.amountUsd),
    hash,
    explorer: `https://basescan.org/tx/${hash}`,
  });
  await sleep(CFG.spacingMs);
  return true;
}

/**
 * Clear this wallet's resting quotes. A limit order escrows cash (buy) or
 * credits (sell); left open across cycles those escrows quietly drain the
 * wallet without ever printing a fill. Cancelling frees them for real trades.
 */
async function cancelStale(w: FleetWallet): Promise<number> {
  const userId = userIdFor(w);
  let cancelled = 0;
  try {
    const state = await api.getMarketState(userId);
    for (const o of state.myOrders || []) {
      try {
        const r = await api.cancelMarketOrder(userId, o.id);
        if (r.ok) cancelled++;
      } catch {
        /* keep going */
      }
    }
  } catch {
    /* ignore */
  }
  return cancelled;
}

type CycleResult = { placed: number; filled: number; fees: number; rejected: number };

/** Shuffle into a fresh array so each cycle picks a different mix of wallets. */
function sampleWallets(pool: FleetWallet[], n: number): FleetWallet[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.max(0, Math.min(n, copy.length)));
}

async function tradeCycle(active: FleetWallet[], cycle: number): Promise<CycleResult> {
  const res: CycleResult = { placed: 0, filled: 0, fees: 0, rejected: 0 };
  const traders = sampleWallets(active, CFG.perCycle);
  for (const w of traders) {
    const userId = userIdFor(w);
    const acct = await api.getOrCreateAccount(userId);
    const cash = round2((acct.usdc || 0) + (acct.usdg || 0));
    const affordable = round2(cash * 0.92);
    if (affordable < CFG.minUsd) {
      res.rejected++;
      continue;
    }
    const ceiling = round2(Math.min(CFG.maxUsd, CFG.limitUsd, affordable));
    const side: "buy" | "sell" = Math.random() < 0.55 ? "buy" : "sell";

    let size = round2(Math.max(CFG.minUsd, Math.min(rand(CFG.minUsd, ceiling), ceiling)));
    if (side === "sell") {
      const held = round2(acct.credits || 0);
      if (held < CFG.minUsd) {
        res.rejected++;
        continue;
      }
      size = round2(Math.min(size, held));
    }

    // Mostly take the book; sometimes post a passive quote near the touch.
    const passive = Math.random() < 0.3;
    let result;
    try {
      if (passive) {
        const book = await api.getMarketState();
        const base = side === "buy" ? book.book.bestBid ?? 0.9 : book.book.bestAsk ?? 0.92;
        const price = round2(Math.min(0.999, Math.max(0.8, base + (side === "buy" ? -0.005 : 0.005))));
        result = await api.placeMarketOrder(userId, {
          side,
          sizeUsd: size,
          price,
          type: "limit",
          wallet: w.address,
        });
      } else {
        result = await api.placeMarketOrder(userId, {
          side,
          sizeUsd: size,
          type: "market",
          wallet: w.address,
        });
      }
    } catch (err) {
      res.rejected++;
      logLine({ warn: "order", wallet: w.address, cycle, error: String((err as Error)?.message) });
      continue;
    }

    if (!result.ok) {
      res.rejected++;
      logLine({ warn: "rejected", wallet: w.address, cycle, reason: result.error });
      continue;
    }
    res.placed++;
    res.filled += result.filledUsd;
    res.fees += result.feeUsd;
    logLine({
      phase: "trade",
      cycle,
      wallet: w.address,
      side,
      sizeUsd: size,
      filledUsd: round2(result.filledUsd),
      avgPrice: result.avgPrice,
      feeUsd: round2(result.feeUsd),
      resting: Boolean(result.restingOrder),
    });
    if (ENV_ONCHAIN) await sleep(CFG.spacingMs);
  }
  return res;
}

// ── main loop ────────────────────────────────────────────────────────────────
mkdirSync(LOG_DIR, { recursive: true });
writeFileSync(PID_FILE, String(process.pid));

let stopping = false;
const stop = () => {
  if (!stopping) out("\nStopping after the current cycle…");
  stopping = true;
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

let totalPlaced = 0;
let totalFilled = 0;
let totalFees = 0;
let totalHops = 0;
const infinite = CFG.cycles === 0;
let cycle = 0;

for (cycle = 1; infinite || cycle <= CFG.cycles; cycle++) {
  if (stopping) break;
  rule(`Cycle ${cycle}${infinite ? "" : `/${CFG.cycles}`}`);

  // 1) Rebalance first: top the poorest wallets up so none is stranded below
  //    the floor and unable to trade. In peer mode this conserves the float.
  try {
    const moved = await rebalance(cycle);
    if (moved > 0) out(`  rebalanced ${money(moved)} to wallets below ${money(CFG.floorUsd)}`);
  } catch (err) {
    logLine({ warn: "rebalance", cycle, error: String((err as Error)?.message) });
  }

  // 2) Keep every wallet's ledger account funded (rate-limited on-chain).
  for (const w of wallets) {
    if (stopping) break;
    try {
      await ensureLedgerFunding(w, cycle);
    } catch (err) {
      logLine({ warn: "fund", wallet: w.address, cycle, error: String((err as Error)?.message) });
    }
  }

  // 2) Pick who trades this cycle. Sampling keeps the tape steady instead of
  //    bursting all 22 wallets at once.
  const active: FleetWallet[] = [];
  for (const w of wallets) {
    try {
      const acct = await api.getOrCreateAccount(userIdFor(w));
      if (round2((acct.usdc || 0) + (acct.usdg || 0)) >= CFG.minUsd) active.push(w);
    } catch (err) {
      logLine({ warn: "scan", wallet: w.address, cycle, error: String((err as Error)?.message) });
    }
  }

  if (active.length < 2) {
    logLine({ warn: "idle", cycle, reason: "fewer than 2 funded wallets", active: active.length });
    out(`  idle: only ${active.length} wallet(s) funded`);
  } else {
    const traders = sampleWallets(active, CFG.perCycle);
    out(`  traders this cycle: ${traders.length}/${active.length} funded`);

    // Free any escrow left by quotes that never filled last cycle.
    let freed = 0;
    for (const w of traders) freed += await cancelStale(w);
    if (freed > 0) out(`  cleared ${freed} stale quote(s)`);

    // A seller needs credits before it can post. Seed only this cycle's traders.
    for (const w of traders) {
      try {
        await ensureInventory(w);
      } catch (err) {
        logLine({ warn: "inventory", wallet: w.address, cycle, error: String((err as Error)?.message) });
      }
    }

    // 3) Trade.
    for (let r = 0; r < CFG.rounds; r++) {
      if (stopping) break;
      const c = await tradeCycle(traders, cycle);
      totalPlaced += c.placed;
      totalFilled += c.filled;
      totalFees += c.fees;
      out(
        `  round ${r + 1}/${CFG.rounds}: ${c.placed} placed · ${c.rejected} skipped · ` +
          `${money(c.filled)} filled · fees ${money(c.fees)}`
      );
    }
  }

  const state = await api.getMarketState();
  const recent = state.book.tape.filter((t) => !t.id.startsWith("tape_seed_")).slice(0, 5);
  logLine({
    phase: "cycle",
    cycle,
    activeWallets: active.length,
    placed: totalPlaced,
    filledUsd: round2(totalFilled),
    feeUsd: round2(totalFees),
    bestBid: state.book.bestBid ?? null,
    bestAsk: state.book.bestAsk ?? null,
    volumeUsd: state.stats.volumeUsd,
  });
  out(`  book  bid ${state.book.bestBid ?? "—"}  ask ${state.book.bestAsk ?? "—"}`);
  out(`  tape  volume ${money(state.stats.volumeUsd)}  fees ${money(state.stats.feesUsd)}`);
  for (const t of recent) {
    out(`    ${t.side.padEnd(4)} ${money(t.sizeUsd)} @ ${t.price.toFixed(4)}  ${t.wallet ? `${t.wallet.slice(0, 10)}…` : "—"}`);
  }

  if (stopping || (!infinite && cycle >= CFG.cycles)) break;
  out(`  … sleeping ${Math.round(CFG.cadenceMs / 1000)}s`);
  await sleep(CFG.cadenceMs);
}

rule("Stopped");
out(`  cycles      ${cycle - (stopping ? 1 : 0)}`);
out(`  orders      ${totalPlaced} placed`);
out(`  filled      ${money(totalFilled)}  ·  fees ${money(totalFees)}`);
out(`  on-chain    ${totalHops} hop(s)`);
out(`  log         ${LOG_FILE}`);

if (JSON_OUT) {
  console.log(
    JSON.stringify({
      mode: ENV_ONCHAIN ? "onchain" : "local",
      backend: backend.backend,
      cycles: cycle,
      placed: totalPlaced,
      filledUsd: round2(totalFilled),
      feeUsd: round2(totalFees),
      hops: totalHops,
    })
  );
}
