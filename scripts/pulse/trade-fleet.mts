/**
 * Trade the credits/USDC order book through the pulse wallet fleet.
 *
 *   --onchain   REAL trades from the generated EOAs. Each on-chain USDC move is
 *               verified against the token contract, and its hash funds the
 *               matching ledger account through the normal deposit path.
 *               Needs funded wallets + ETH for gas.
 *   --local     (default) Same trade pattern against an isolated local ledger
 *               with synthetic tx hashes. No chain, no gas, no real money.
 *
 * The book engine, fee model, escrow and tape are the real ones in both modes.
 *
 * Env: BASE_RPC_URL, FLEET_LIVE=1, FLEET_WALLETS, FLEET_ROUNDS,
 *      FLEET_MIN_USD, FLEET_MAX_USD, FLEET_SPACING_MS
 *
 * Usage:
 *   npx -y tsx scripts/pulse/trade-fleet.mts --local
 *   npx -y tsx scripts/pulse/trade-fleet.mts --onchain --plan
 *   npx -y tsx scripts/pulse/trade-fleet.mts --onchain --yes
 */
import { createHash, randomUUID } from "crypto";
import { existsSync, promises as fs, readFileSync } from "fs";
import path from "path";

const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(f);
const ENV_ONCHAIN = has("--onchain");
const CONFIRMED = has("--yes");
const PLAN_ONLY = has("--plan");
const JSON_OUT = has("--json");

const ROOT = path.resolve(process.cwd());
const WALLETS_FILE = path.join(ROOT, ".ops", "pulse", "wallets.json");
const ENV_FILE = path.join(ROOT, ".env.local");
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const num = (k: string, d: number) => {
  const v = Number(process.env[k]);
  return Number.isFinite(v) && v > 0 ? v : d;
};
const CFG = {
  rounds: Math.round(num("FLEET_ROUNDS", 3)),
  minUsd: num("FLEET_MIN_USD", 2),
  maxUsd: num("FLEET_MAX_USD", 25),
  spacingMs: Math.round(num("FLEET_SPACING_MS", 9_000)),
  limitUsd: 500,
};

const out = JSON_OUT ? () => {} : (...a: unknown[]) => console.log(...a);
const rule = (t: string) => out(`\n${"─".repeat(4)} ${t} ${"─".repeat(Math.max(4, 62 - t.length))}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const round2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) => `$${round2(n).toFixed(2)}`;

/** Deterministic, distinct tx hash for local mode so re-runs never collide. */
function syntheticTx(seed: string) {
  return `0x${createHash("sha256").update(`fleet:${seed}`).digest("hex")}`;
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

/** Local mode runs isolated (like the stress harness) so it cannot touch live. */
async function configureBackend(onchain: boolean) {
  if (!onchain) {
    process.env.BLOB_READ_WRITE_TOKEN = "";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    const scratch =
      process.env.FLEET_SCRATCH || path.join(".tmp", `fleet-${Date.now().toString(36)}`);
    await fs.mkdir(scratch, { recursive: true });
    process.chdir(scratch);
    return { backend: "local" as const, detail: process.cwd() };
  }
  let loaded = 0;
  try {
    const vars = parseEnvFile(await fs.readFile(ENV_FILE, "utf8"));
    for (const [k, v] of Object.entries(vars)) {
      if (process.env[k] === undefined) {
        process.env[k] = v;
        loaded++;
      }
    }
  } catch {
    console.error(`Cannot read ${ENV_FILE} — needed for the live ledger.`);
    process.exit(4);
  }
  const redis = Boolean(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL);
  const blob = Boolean((process.env.BLOB_READ_WRITE_TOKEN || "").trim());
  return {
    backend: redis ? ("redis" as const) : blob ? ("blob" as const) : ("local" as const),
    detail: loaded ? `${loaded} vars from .env.local` : "env already set",
  };
}

async function chainClients() {
  const viem = await import("viem");
  const accounts = await import("viem/accounts");
  const chains = await import("viem/chains");
  const rpc =
    process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";
  const publicClient = viem.createPublicClient({ chain: chains.base, transport: viem.http(rpc) });
  return { viem, accounts, chains, publicClient, rpc };
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
    return { ok: false, amountUsd: 0, reason: `no receipt: ${err instanceof Error ? err.message : err}` };
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
    abi: [viem.parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)")],
    data: log.data,
    topics: log.topics,
  });
  const okFrom = String(parsed.args.from).toLowerCase() === from.toLowerCase();
  const amountUsd = Number(parsed.args.value) / 1e6;
  if (!okFrom) return { ok: false, amountUsd, reason: "sender mismatch" };
  if (amountUsd + 1e-9 < minUsd) return { ok: false, amountUsd, reason: `only ${money(amountUsd)}` };
  return { ok: true, amountUsd };
}

// ── setup
if (!existsSync(WALLETS_FILE)) {
  console.error(
    `\nNo wallet fleet at ${WALLETS_FILE}\n  Generate one first:  npm run pulse:generate\n`
  );
  process.exit(2);
}

const store = JSON.parse(readFileSync(WALLETS_FILE, "utf8")) as {
  treasury?: string;
  wallets: FleetWallet[];
};
const wanted = Math.round(num("FLEET_WALLETS", store.wallets.length));
const wallets = store.wallets.slice(0, Math.max(1, wanted));

const backend = await configureBackend(ENV_ONCHAIN);
const api = await import("../../src/lib/lab/account-store");

const runId = process.env.FLEET_RUN_ID || randomUUID().slice(0, 6);
const userIdFor = (w: FleetWallet) => `pulse-${w.address.toLowerCase()}`;

out(`\nOlora fleet trader  ·  run ${runId}`);
out(`mode: ${ENV_ONCHAIN ? "ONCHAIN (real USDC on Base)" : "LOCAL (isolated ledger, no chain)"}`);
out(`backend: ${backend.backend}  ·  ${backend.detail}`);
out(`wallets: ${wallets.length}  ·  rounds: ${CFG.rounds}  ·  order ${money(CFG.minUsd)}–${money(CFG.maxUsd)}`);

if (ENV_ONCHAIN && !PLAN_ONLY && !CONFIRMED && !process.env.FLEET_LIVE) {
  console.error(
    "\nRefusing to trade the production ledger from the fleet without --yes (or FLEET_LIVE=1).\n" +
      "  Rehearse first:  npx -y tsx scripts/pulse/trade-fleet.mts --local\n" +
      "  Fund check:      npx -y tsx scripts/pulse/trade-fleet.mts --onchain --plan\n"
  );
  process.exit(3);
}

// ── balances
let chain: Awaited<ReturnType<typeof chainClients>> | null = null;
const balances = new Map<string, number>();
/** Exact USDC balance in micro-units — never round before spending. */
const rawBalances = new Map<string, bigint>();

if (ENV_ONCHAIN) {
  chain = await chainClients();
  rule("Wallet funding");
  for (const w of wallets) {
    const usdc = (await chain.publicClient.readContract({
      address: USDC_BASE as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [w.address as `0x${string}`],
    })) as bigint;
    const eth = await chain.publicClient.getBalance({ address: w.address as `0x${string}` });
    const usd = Number(usdc) / 1e6;
    balances.set(w.address.toLowerCase(), usd);
    rawBalances.set(w.address.toLowerCase(), usdc);
    out(`  ${w.address}  ${money(usd)} USDC  ·  ${(Number(eth) / 1e18).toFixed(6)} ETH`);
  }
  const total = [...balances.values()].reduce((s, n) => s + n, 0);
  const tradeable = [...balances.values()].filter((n) => n >= CFG.minUsd).length;
  out(`  total ${money(total)} across ${wallets.length} wallets · ${tradeable} can trade`);
  if (tradeable === 0) {
    console.error(
      "\nNo wallet holds enough USDC to trade.\n" +
        "  Fund the distributor, then:  npm run pulse:distribute\n"
    );
    process.exit(5);
  }
} else {
  for (const w of wallets) balances.set(w.address.toLowerCase(), 10_000);
}

if (PLAN_ONLY) {
  out(`\nPlan: ${wallets.length} wallets × ${CFG.rounds} rounds`);
  out("\nDry plan only — nothing submitted.");
  process.exit(0);
}

// ── fund ledger accounts
const funded: FleetWallet[] = [];
const bankroll = new Map<string, number>();
rule("Ledger funding");
for (const w of wallets) {
  const available = balances.get(w.address.toLowerCase()) ?? 0;
  if (available < CFG.minUsd) continue;
  const userId = userIdFor(w);

  if (ENV_ONCHAIN) {
    const treasury = (
      store.treasury ||
      process.env.TENSORA_TREASURY_ADDRESS ||
      ""
    ).toLowerCase();
    if (!treasury) {
      console.error("No treasury address in wallets.json/.env — cannot move funds on-chain.");
      process.exit(6);
    }
    const viem = chain!.viem;
    const walletClient = viem.createWalletClient({
      account: chain!.accounts.privateKeyToAccount(w.privateKey as `0x${string}`),
      chain: chain!.chains.base,
      transport: viem.http(chain!.rpc),
    });

    // Spend 90% of the EXACT balance. Rounding a display value here is what
    // causes "transfer amount exceeds balance" on near-whole balances.
    const exactUsdc = rawBalances.get(w.address.toLowerCase()) ?? 0n;
    const spendRaw = (exactUsdc * 90n) / 100n;
    const spendUsd = Number(spendRaw) / 1e6;
    if (spendRaw <= 0n || spendUsd < CFG.minUsd) {
      out(`  ${w.address}  skipped: ${money(spendUsd)} below the ${money(CFG.minUsd)} floor`);
      continue;
    }

    let hash: `0x${string}`;
    try {
      hash = (await walletClient.sendTransaction({
        to: USDC_BASE as `0x${string}`,
        data: viem.encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [treasury as `0x${string}`, spendRaw],
        }),
        chain: chain!.chains.base,
      })) as `0x${string}`;
    } catch (err) {
      // One wallet's failure (gas, nonce, balance) must not abort the fleet.
      out(`  ${w.address}  transfer failed: ${err instanceof Error ? err.message.split("\n")[0] : err}`);
      continue;
    }
    out(`  ${w.address}  →  treasury ${money(spendUsd)}  ${hash.slice(0, 12)}…`);

    let check: { ok: boolean; amountUsd: number; reason?: string };
    try {
      check = await verifyUsdcTransfer(chain!.publicClient, viem, hash, w.address, CFG.minUsd);
    } catch (err) {
      out(`  verify error: ${err instanceof Error ? err.message.split("\n")[0] : err}`);
      continue;
    }
    if (!check.ok) {
      out(`  skipped: ${check.reason}`);
      continue;
    }
    await api.claimOnChainDeposit(userId, {
      method: "usdc",
      amountUsd: check.amountUsd,
      txHash: hash,
      token: "USDC",
      from: w.address,
      chain: "base",
    });
    bankroll.set(userId, check.amountUsd);
    await sleep(CFG.spacingMs);
  } else {
    await api.claimOnChainDeposit(userId, {
      method: "usdc",
      amountUsd: Math.min(available, CFG.limitUsd),
      txHash: syntheticTx(`${runId}:${w.address}:usdc`),
      token: "USDC",
      from: w.address,
      chain: "base",
    });
    bankroll.set(userId, Math.min(available, CFG.limitUsd));
  }
  funded.push(w);
}

out(`  funded accounts: ${funded.length}/${wallets.length}`);
if (funded.length < 2) {
  console.error(
    "\nNeed at least 2 funded wallets — the book will not let an account fill its own order."
  );
  process.exit(7);
}

// ── inventory: a seller needs credits before it can sell. Buy a small book
// position first so the fleet trades two-sided instead of rejecting sells.
const rand = (min: number, max: number) => min + Math.random() * (max - min);

rule("Inventory");
let seeded = 0;
for (const w of funded) {
  const userId = userIdFor(w);
  const cash = bankroll.get(userId) ?? CFG.limitUsd;
  const seedCap = round2(cash * 0.5);
  if (seedCap < CFG.minUsd) {
    out(`  ${w.address}  seed skipped: only ${money(cash)} available`);
    continue;
  }
  const size = round2(
    Math.max(CFG.minUsd, Math.min(rand(CFG.minUsd, CFG.maxUsd * 0.6), seedCap))
  );
  try {
    const res = await api.placeMarketOrder(userId, {
      side: "buy",
      sizeUsd: size,
      type: "market",
      wallet: w.address,
    });
    if (res.ok) {
      seeded++;
      out(`  ${w.address}  seeded ${money(res.filledUsd)} of credits`);
    } else {
      out(`  ${w.address}  seed skipped: ${res.error}`);
    }
  } catch (err) {
    out(`  ${w.address}  seed error: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (ENV_ONCHAIN) await sleep(CFG.spacingMs);
}
out(`  seeded: ${seeded}/${funded.length}`);

// ── trade
rule("Trading");
let placed = 0;
let filled = 0;
let fees = 0;
let rejected = 0;
const perWallet: Record<string, number> = {};

for (let round = 0; round < CFG.rounds; round++) {
  out(`\n— Round ${round + 1}/${CFG.rounds} —`);
  for (const w of funded) {
    const userId = userIdFor(w);
    // Spend at most ~92% of what the wallet holds (leaves room for the 1% fee
    // and rounding). Below the order minimum there is nothing viable to do.
    const cash = bankroll.get(userId) ?? CFG.limitUsd;
    const affordable = round2(cash * 0.92);
    if (affordable < CFG.minUsd) {
      rejected++;
      out(`  ${w.address}  skipped: only ${money(cash)} available`);
      continue;
    }
    const ceiling = round2(Math.min(CFG.maxUsd, CFG.limitUsd, affordable));
    const side: "buy" | "sell" = Math.random() < 0.55 ? "buy" : "sell";

    // A sell can only offer credits the wallet actually holds.
    let size = round2(Math.max(CFG.minUsd, Math.min(rand(CFG.minUsd, ceiling), ceiling)));
    if (side === "sell") {
      const acct = await api.getOrCreateAccount(userId);
      const held = round2(acct.credits || 0);
      if (held < CFG.minUsd) {
        rejected++;
        out(`  ${w.address}  sell skipped: holds ${money(held)} of credits`);
        continue;
      }
      size = round2(Math.min(size, held));
    }

    // Mostly take the book; sometimes post a passive quote near the touch.
    const passive = Math.random() < 0.3;
    let res;
    try {
      if (passive) {
        const book = await api.getMarketState();
        const base = side === "buy" ? book.book.bestBid ?? 0.9 : book.book.bestAsk ?? 0.92;
        const price = round2(
          Math.min(0.999, Math.max(0.8, base + (side === "buy" ? -0.005 : 0.005)))
        );
        res = await api.placeMarketOrder(userId, {
          side,
          sizeUsd: size,
          price,
          type: "limit",
          wallet: w.address,
        });
      } else {
        res = await api.placeMarketOrder(userId, {
          side,
          sizeUsd: size,
          type: "market",
          wallet: w.address,
        });
      }
    } catch (err) {
      rejected++;
      out(`  ${w.address}  error: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`);
      continue;
    }

    if (!res.ok) {
      rejected++;
      out(`  ${w.address}  ${side} ${money(size)}  rejected: ${res.error}`);
      continue;
    }
    placed++;
    filled += res.filledUsd;
    fees += res.feeUsd;
    perWallet[w.address] = (perWallet[w.address] || 0) + 1;
    out(
      `  ${w.address}  ${side} ${money(size)}  filled ${money(res.filledUsd)}${
        res.avgPrice ? ` @ ${res.avgPrice.toFixed(4)}` : ""
      }  fee ${money(res.feeUsd)}${res.restingOrder ? "  (rests)" : ""}`
    );
    if (ENV_ONCHAIN) await sleep(CFG.spacingMs);
  }
}

// ── report
const finalState = await api.getMarketState();
const recent = finalState.book.tape.filter((t) => !t.id.startsWith("tape_seed_")).slice(0, 8);

rule("Result");
out(`  orders      ${placed} placed · ${rejected} rejected`);
out(`  filled      ${money(filled)}  ·  fees ${money(fees)}`);
out(`  accounts    ${Object.keys(perWallet).length} wallets traded`);
out(`  book        ask ${finalState.book.bestAsk ?? "—"}  bid ${finalState.book.bestBid ?? "—"}`);
out(
  `  counters    volume ${money(finalState.stats.volumeUsd)}  fees ${money(finalState.stats.feesUsd)}`
);
out(`  house bid   ${money(finalState.config.houseBidPoolUsd)}`);
out("\n  newest prints:");
for (const t of recent) {
  out(
    `    ${t.side.padEnd(4)} ${money(t.sizeUsd)} @ ${t.price.toFixed(4)}  ${
      t.wallet ? `${t.wallet.slice(0, 10)}…` : "(unattributed)"
    }`
  );
}

if (JSON_OUT) {
  console.log(
    JSON.stringify({
      run: runId,
      mode: ENV_ONCHAIN ? "onchain" : "local",
      backend: backend.backend,
      wallets: funded.length,
      placed,
      rejected,
      filledUsd: round2(filled),
      feeUsd: round2(fees),
      volumeUsd: finalState.stats.volumeUsd,
      tape: recent,
    })
  );
}

out("\nDone.");
