import { createHash, randomBytes, randomUUID } from "crypto";
import { AsyncLocalStorage } from "async_hooks";
import {
  isEverydayModel,
  PLUS_MESSAGE_LIMIT,
  PLUS_PERIOD_DAYS,
  PLUS_PRICE_USD,
  tierById,
  type TierId,
} from "@/lib/olora/plans";
import { trackSoon } from "@/lib/analytics/store";
import { promises as fs } from "fs";
import path from "path";
import { get, put } from "@vercel/blob";

export type BillingHistoryRow = {
  id: string;
  date: string;
  kind: string;
  description: string;
  title?: string;
  amount: string;
  resource?: string;
  projectId?: string;
  method?: string;
};

export type StoredApiKey = {
  id: string;
  name: string;
  prefix: string;
  hash: string;
  createdAt: string;
  projectId: string;
  revoked?: boolean;
};

export type UsageEvent = {
  id: string;
  at: string;
  model: string;
  cost: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  gatewayMs: number;
  kind: "inference" | "gpu" | "other";
};

export type ServerGpuInstance = {
  id: string;
  name: string;
  gpuType: string;
  provider: string;
  status: string;
  sandbox: boolean;
  primePodId?: string;
  createdAt: string;
  hourlyUsd?: number;
  userId: string;
  projectId?: string;
  gpuLabel?: string;
  gpuMemory?: number;
  gpuCount?: number;
  region?: string;
  dataCenter?: string | null;
  image?: string;
  diskGb?: number;
  vcpu?: number;
  memoryGb?: number;
  offerId?: string;
};

export type AccountSubscription = {
  plan: "plus";
  startedAt: string;
  renewsAt: string;
  messagesUsed: number;
  messageLimit: number;
  priceUsd: number;
  /** Package bought. Older records without a tier are Plus. */
  tier?: TierId;
  /** Canceled plans keep included messages until renewsAt. */
  status: "active" | "canceled";
};

export type AccountRecord = {
  userId: string;
  credits: number;
  usdc: number;
  usdg: number;
  history: BillingHistoryRow[];
  keys: StoredApiKey[];
  usage: UsageEvent[];
  instances: ServerGpuInstance[];
  updatedAt: string;
  subscription?: AccountSubscription;
};

type LiquidityBand = {
  id: string;
  discountBps: number;
  availableUsd: number;
};

export type MarketOrderSide = "buy" | "sell";

/** A resting limit order on the credits/USDC book. Escrowed at placement. */
export type MarketOrder = {
  id: string;
  userId: string;
  side: MarketOrderSide;
  /** USD paid per $1.00 of credit face. */
  price: number;
  /** Remaining open face size (USD). */
  sizeUsd: number;
  originalUsd: number;
  createdAt: string;
};

type AccountsDb = {
  accounts: Record<string, AccountRecord>;
  liquidity: LiquidityBand[];
  keyIndex: Record<string, string>; // hash -> userId
  /** Prevent double-claim of the same Base deposit tx. */
  claimedTxs?: Record<string, { userId: string; at: string; amountUsd: number }>;
  /** Bump to force-reseeding liquidity book (operator float). */
  liquiditySeed?: number;
  /** Remaining house subsidy for discounted GPU rent (USD). */
  gpuSubsidyUsd?: number;
  /** Bump to reset GPU subsidy pool. */
  gpuSubsidySeed?: number;
  /** Public trade tape for the credit order book. */
  marketTape?: {
    id: string;
    at: string;
    price: number;
    sizeUsd: number;
    side: "buy" | "sell";
    /** Taker wallet, when the trade came from a linked wallet. Display only. */
    wallet?: string;
  }[];
  /** Open resting limit orders (user-owned). House liquidity is derived live. */
  marketOrders?: MarketOrder[];
  /** USDC pool backing the house bid (buys credits back below par). */
  houseBidPoolUsd?: number;
  /** Bump to reset the house bid pool. */
  marketSeed?: number;
  /** $OLORA holder rewards ledger (credits accrued by wallet). */
  earn?: EarnLedger;
  /** wallet (lowercase) -> userId, recorded at claim time. */
  walletLinks?: Record<string, string>;
  /**
   * Lifetime network KPIs (real fills / fees / usage). Seed tape is excluded.
   * Written on each market/marketplace fill and usage event.
   */
  networkStats?: {
    volumeUsd: number;
    feesUsd: number;
    requests: number;
  };
  /** Agent sub-accounts with their own balance, key, and limits. */
  agents?: Record<string, AgentRecord>;
  /** tsa_ key hash -> agentId */
  agentKeyIndex?: Record<string, string>;
};

export type AgentUsageEvent = {
  id: string;
  at: string;
  kind: "inference" | "tool" | "topup";
  resource: string;
  cost: number;
};

export type AgentRecord = {
  id: string;
  ownerUserId: string;
  name: string;
  credits: number;
  usdc: number;
  dailyCapUsd: number;
  perCallCapUsd: number;
  /** Max the agent may buy per UTC day from the owner's balance via the order book. 0 = off. */
  topUpCapUsd?: number;
  allowedModels: string[];
  allowedTools: string[];
  paused: boolean;
  keyHash: string | null;
  keyPrefix: string | null;
  usage: AgentUsageEvent[];
  createdAt: string;
  updatedAt: string;
};

type EarnWalletState = {
  accruedUsd: number;
  claimedUsd: number;
  lastBalance: number;
};

export type EarnLedger = {
  /** Remaining funded payout pool (USD of credits). */
  poolUsd: number;
  totalAccruedUsd: number;
  totalClaimedUsd: number;
  lastTickAt: string | null;
  wallets: Record<string, EarnWalletState>;
  /** Fee-wallet inflows already counted (txHash -> USD credited to pool). */
  feeTxs?: Record<string, number>;
  /** Lifetime fee revenue observed / routed to the pool. */
  feeRevenueUsd?: number;
  seed?: number;
};

/** House sellable face = $1300; book UI still paints ~$1.5k cosmetic depth. */
const LIQUIDITY_SEED_VERSION = 5;
const GPU_SUBSIDY_SEED_VERSION = 1;
/** Cosmetic order-book depth shown on Inference (not sellable). */
export const COSMETIC_BOOK_DEPTH_USD = 1500;
/** Hard cap on discounted inference face that can be sold. */
export const HOUSE_SELLABLE_FACE_USD = 1300;
/** House subsidy pool for GPU rate discounts. */
export const GPU_SUBSIDY_POOL_USD = 100;
/** Default GPU discount vs listed hourly (10%). */
export const GPU_HOUSE_DISCOUNT_BPS = 1000;

// ── Order book market constants ────────────────────────────────
const MARKET_SEED_VERSION = 2;
/** Price bounds: USD per $1 credit face. */
export const MARKET_MIN_PRICE = 0.8;
export const MARKET_MAX_PRICE = 1.0;
export const MARKET_MIN_ORDER_USD = 1;
export const MARKET_MAX_ORDER_USD = 1000;
/**
 * House best bid when best ask is 0.92 → ~1¢ spread.
 * Pool backs a multi-level bid ladder (comparable visual depth to asks).
 */
export const HOUSE_BID_PRICE = 0.91;
export const HOUSE_BID_POOL_USD = 700;

// ── Earn (holder rewards) constants ────────────────────────────
const EARN_SEED_VERSION = 1;
/** Initial funded payout pool (USD of credits). Refill as fee revenue arrives. */
export const EARN_POOL_SEED_USD = 25;
/** Max accrual gap credited in one lazy tick (hours). */
const EARN_MAX_TICK_HOURS = 6;
/** Payout share multiplier for wallets whose linked account used the gateway recently. */
const EARN_USAGE_BOOST = 1.25;

function marketTakerFeeBps() {
  return Number(process.env.MARKET_TAKER_FEE_BPS || "100");
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "lab-accounts.json");
const BLOB_PATHNAME = "lab/accounts-db.json";
const REDIS_LEDGER_KEY = "lab:accounts-db";
type GlobalAccounts = {
  memory: AccountsDb;
  hydrated: boolean;
  writeChain: Promise<void>;
  /** Skip Blob reads until this time. Home polls must not download the ledger every few seconds. */
  freshUntil: number;
  /** Set when Vercel has suspended the store. Writes then stay on the local ledger. */
  blobBlocked: boolean;
  /** Local file has been considered, so a later read does not clobber in-memory edits. */
  localReady: boolean;
  redisWarned: boolean;
  loadFlight: Promise<AccountsDb> | null;
};

const BLOB_READ_TTL_MS = 5 * 60_000;

const g = globalThis as typeof globalThis & { __tensoraAccounts?: GlobalAccounts };
if (!g.__tensoraAccounts) {
  g.__tensoraAccounts = {
    memory: emptyDb(),
    hydrated: false,
    writeChain: Promise.resolve(),
    freshUntil: 0,
    blobBlocked: false,
    localReady: false,
    redisWarned: false,
    loadFlight: null,
  };
}
const store = g.__tensoraAccounts;
store.freshUntil ??= 0;
store.blobBlocked ??= false;
store.localReady ??= false;
store.redisWarned ??= false;
store.loadFlight ??= null;
if (!process.env.VERCEL_BLOB_RETRIES) process.env.VERCEL_BLOB_RETRIES = "2";

function defaultLiquidity(): LiquidityBand[] {
  // Sellable house float = $1300; best ask starts at 0.92 (−800 bps).
  return [
    { id: "band-8", discountBps: 800, availableUsd: 520 },
    { id: "band-5", discountBps: 500, availableUsd: 520 },
    { id: "band-0", discountBps: 0, availableUsd: 260 },
  ];
}

/** Scale real bands up to cosmetic book depth for order-book UI only. */
export function cosmeticLiquidityBands(bands: LiquidityBand[]): LiquidityBand[] {
  const sellable = bands.reduce((s, b) => s + b.availableUsd, 0);
  if (sellable <= 0) {
    // Empty book still paints depth so the market doesn't look dead.
    return [
      { id: "band-8", discountBps: 800, availableUsd: 520 },
      { id: "band-5", discountBps: 500, availableUsd: 680 },
      { id: "band-0", discountBps: 0, availableUsd: 300 },
    ];
  }
  const scale = COSMETIC_BOOK_DEPTH_USD / sellable;
  return bands.map((b) => ({
    ...b,
    availableUsd: round2(b.availableUsd * scale),
  }));
}

function emptyDb(): AccountsDb {
  return {
    accounts: {},
    liquidity: defaultLiquidity(),
    keyIndex: {},
    claimedTxs: {},
    liquiditySeed: LIQUIDITY_SEED_VERSION,
    gpuSubsidyUsd: GPU_SUBSIDY_POOL_USD,
    gpuSubsidySeed: GPU_SUBSIDY_SEED_VERSION,
    marketTape: seedTape(),
    marketOrders: [],
    houseBidPoolUsd: HOUSE_BID_POOL_USD,
    marketSeed: MARKET_SEED_VERSION,
    earn: emptyEarn(),
    walletLinks: {},
    networkStats: { volumeUsd: 0, feesUsd: 0, requests: 0 },
  };
}

function emptyEarn(): EarnLedger {
  return {
    poolUsd: EARN_POOL_SEED_USD,
    totalAccruedUsd: 0,
    totalClaimedUsd: 0,
    lastTickAt: null,
    wallets: {},
    seed: EARN_SEED_VERSION,
  };
}

function seedTape(): NonNullable<AccountsDb["marketTape"]> {
  const now = Date.now();
  const prices = [0.9125, 0.92, 0.915, 0.925, 0.91, 0.93, 0.9075, 0.9225];
  const sizes = [47.3, 112.8, 28.6, 65.4, 91.2, 38.75, 54.1, 73.9];
  return prices.map((price, i) => ({
    id: `tape_seed_${i}`,
    at: new Date(now - (i + 1) * 7 * 60_000 - (i % 3) * 45_000).toISOString(),
    price,
    sizeUsd: sizes[i],
    side: (i % 3 === 1 ? "sell" : "buy") as "buy" | "sell",
  }));
}

/** Near-mid heavy weights with light jitter so sizes aren't round-number-only. */
function nearMidWeights(n: number): number[] {
  const raw = Array.from({ length: n }, (_, i) => {
    const decay = Math.exp(-i * 0.26);
    const jitter = 0.78 + ((i * 37 + 11) % 19) / 40;
    return decay * jitter;
  });
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  return raw.map((w) => w / sum);
}

/** Split `total` across weights into irregular cent amounts. */
function splitUsdLadder(total: number, weights: number[]): number[] {
  const sizes: number[] = [];
  let rem = round2(total);
  for (let i = 0; i < weights.length; i++) {
    if (i === weights.length - 1) {
      sizes.push(Math.max(0, rem));
      break;
    }
    const raw = total * weights[i];
    // Stay off .00/.50 endings for a lived-in book.
    let cents = Math.round(raw * 100);
    const mod = cents % 10;
    if (mod === 0 || mod === 5) cents += (i % 2 === 0 ? 3 : -2);
    const size = round2(Math.min(rem, Math.max(0.01, cents / 100)));
    sizes.push(size);
    rem = round2(rem - size);
  }
  return sizes;
}

function emptyAccount(userId: string): AccountRecord {
  return {
    userId,
    credits: 0,
    usdc: 0,
    usdg: 0,
    history: [],
    keys: [],
    usage: [],
    instances: [],
    updatedAt: new Date().toISOString(),
  };
}

function round2(n: number) {
  return Math.max(0, Math.round(n * 100) / 100);
}

function redisConfig(): { url: string; token: string } | null {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "")
    .trim()
    .replace(/\/$/, "");
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "").trim();
  if (!url || !token) return null;
  return { url, token };
}

function blobEnabled() {
  if (redisConfig()) return false;
  return Boolean((process.env.BLOB_READ_WRITE_TOKEN || "").trim()) && !store.blobBlocked;
}

function isBlobSuspended(err: unknown) {
  const message = err instanceof Error ? err.message : String(err ?? "");
  const name = err instanceof Error ? err.name : "";
  return (
    name === "BlobStoreSuspendedError" ||
    /suspended/i.test(message) ||
    /Failed to fetch blob: (402|403)\b/.test(message)
  );
}

function blockBlob() {
  if (store.blobBlocked) return;
  store.blobBlocked = true;
  store.freshUntil = 0;
  console.warn(
    "Vercel Blob is suspended. Accounts, API keys, and credits are using the local ledger until that store is restored."
  );
}

function bandAvailable(bands?: LiquidityBand[]) {
  return (bands || []).reduce((s, b) => s + (Number(b.availableUsd) || 0), 0);
}

const OPENING_TAPE_STALE_MS = 6 * 3600_000;

/** Opening prints are the launch tape. Rebase them when they age out of the day, until real trades exist. */
function freshenOpeningTape(tape: AccountsDb["marketTape"]): NonNullable<AccountsDb["marketTape"]> {
  const rows = tape || [];
  const real = rows.filter((t) => !isSeedTapeId(t.id));
  const seeds = rows.filter((t) => isSeedTapeId(t.id));
  const newest = seeds.reduce((m, t) => Math.max(m, Date.parse(t.at) || 0), 0);
  if (seeds.length && Date.now() - newest < OPENING_TAPE_STALE_MS) return rows;
  return [...seedTape(), ...real].slice(0, 60);
}

function normalizeDb(parsed: Partial<AccountsDb> | null | undefined): AccountsDb {
  const seed = Number(parsed?.liquiditySeed || 0);
  const needsReseed = seed < LIQUIDITY_SEED_VERSION;
  const gpuSeed = Number(parsed?.gpuSubsidySeed || 0);
  const needsGpuReseed = gpuSeed < GPU_SUBSIDY_SEED_VERSION;
  const listed = Array.isArray(parsed?.liquidity) ? parsed.liquidity : [];
  const liquidity =
    needsReseed || listed.length === 0 || bandAvailable(listed) <= 0 ? defaultLiquidity() : listed;
  const pool =
    Number(parsed?.marketSeed || 0) < MARKET_SEED_VERSION ||
    typeof parsed?.houseBidPoolUsd !== "number" ||
    parsed.houseBidPoolUsd <= 0
      ? HOUSE_BID_POOL_USD
      : Math.max(0, parsed.houseBidPoolUsd);
  return {
    accounts: parsed?.accounts || {},
    liquidity,
    keyIndex: parsed?.keyIndex || {},
    claimedTxs: parsed?.claimedTxs || {},
    liquiditySeed: LIQUIDITY_SEED_VERSION,
    gpuSubsidyUsd: needsGpuReseed
      ? GPU_SUBSIDY_POOL_USD
      : typeof parsed?.gpuSubsidyUsd === "number"
        ? Math.max(0, parsed.gpuSubsidyUsd)
        : GPU_SUBSIDY_POOL_USD,
    gpuSubsidySeed: GPU_SUBSIDY_SEED_VERSION,
    marketTape: freshenOpeningTape(
      Array.isArray(parsed?.marketTape) && parsed.marketTape.length ? parsed.marketTape : seedTape()
    ),
    marketOrders: Array.isArray(parsed?.marketOrders) ? parsed!.marketOrders! : [],
    houseBidPoolUsd: pool,
    marketSeed: MARKET_SEED_VERSION,
    earn:
      parsed?.earn && Number(parsed.earn.seed || 0) >= EARN_SEED_VERSION
        ? parsed.earn
        : emptyEarn(),
    walletLinks: parsed?.walletLinks || {},
    agents: parsed?.agents || {},
    agentKeyIndex: parsed?.agentKeyIndex || {},
    networkStats: {
      volumeUsd: Math.max(0, Number(parsed?.networkStats?.volumeUsd) || 0),
      feesUsd: Math.max(0, Number(parsed?.networkStats?.feesUsd) || 0),
      requests: Math.max(0, Math.round(Number(parsed?.networkStats?.requests) || 0)),
    },
  };
}

function ensureNetworkStats(db: AccountsDb) {
  if (!db.networkStats) {
    db.networkStats = { volumeUsd: 0, feesUsd: 0, requests: 0 };
  }
  return db.networkStats;
}

/** Record GMV + platform fee from a real trade (not seed tape). */
function recordTradeStats(db: AccountsDb, volumeUsd: number, feeUsd = 0) {
  const stats = ensureNetworkStats(db);
  if (volumeUsd > 0) {
    stats.volumeUsd = round2(stats.volumeUsd + volumeUsd);
    trackSoon("trade", volumeUsd);
  }
  if (feeUsd > 0) {
    stats.feesUsd = round2(stats.feesUsd + feeUsd);
    const earn = ensureEarn(db);
    earn.feeRevenueUsd = round2((earn.feeRevenueUsd ?? 0) + feeUsd);
  }
}

function isSeedTapeId(id: string) {
  return /^tape_seed_/i.test(id);
}

function tapeVolume(db: AccountsDb, sinceMs: number | undefined, seed: boolean) {
  return round2(
    (db.marketTape || [])
      .filter((t) => isSeedTapeId(t.id) === seed)
      .filter((t) => (sinceMs == null ? true : new Date(t.at).getTime() >= sinceMs))
      .reduce((s, t) => s + t.sizeUsd, 0)
  );
}

function realTapeVolume(db: AccountsDb, sinceMs?: number) {
  return tapeVolume(db, sinceMs, false);
}

/** Launch volume, used only while no real trade has printed in the window. */
function openingTapeVolume(db: AccountsDb, sinceMs?: number) {
  return tapeVolume(db, sinceMs, true);
}

function depositsSettledUsd(db: AccountsDb) {
  return round2(
    Object.values(db.claimedTxs || {}).reduce((s, row) => s + (row.amountUsd || 0), 0)
  );
}

function usageRequestCount(db: AccountsDb) {
  let n = 0;
  for (const account of Object.values(db.accounts)) {
    n += account.usage?.length || 0;
  }
  return n;
}

function activeAccountCount(db: AccountsDb, days = 7) {
  const cutoff = Date.now() - days * 24 * 3600_000;
  let n = 0;
  for (const account of Object.values(db.accounts)) {
    const recent =
      account.usage?.some((u) => new Date(u.at).getTime() >= cutoff) ||
      account.history?.some((h) => new Date(h.date).getTime() >= cutoff);
    if (recent) n += 1;
  }
  return n;
}

export type LabNetworkStats = {
  volumeUsd: number;
  volume24hUsd: number;
  feesUsd: number;
  requests: number;
  depositsSettledUsd: number;
  activeAccounts: number;
  computeVolumeUsd: number;
};

/* ── Ledger transaction ───────────────────────────────────────────
 * Every mutation runs inside withLedger(), which reloads the whole ledger
 * immediately before the write phase and compares a digest of the keys it
 * touched. If another process changed any of them in between, the change is
 * undone and the transaction replays on the fresh document. That turns the
 * previous blind read-modify-write into optimistic concurrency control, so
 * concurrent writers stop silently overwriting each other's balances and
 * counters.
 */

const LEDGER_LOCK_KEY = "lab:ledger-lock";
const LEDGER_LOCK_TTL_MS = 15_000;
const LEDGER_LOCK_FILE = ".data/lab-accounts.lock";
const TX_MAX_ATTEMPTS = 8;
const LOCK_WAIT_MS = 12_000;

/** True while this async context already holds the transaction lock (re-entrancy). */
const inLedgerTx = new AsyncLocalStorage<true>();

/** Serializes transactions inside one process. */
let processMutex: Promise<unknown> = Promise.resolve();

/** Record a mutation. The lock serializes whole transactions, so this is informational. */
function markTouched(key: string) {
  void key;
}

function trackAccount(userId: string) {
  markTouched(`accounts:${userId}`);
}

function trackKey(key: keyof AccountsDb | string) {
  markTouched(String(key));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Run `fn` with the in-process mutex held. */
function withProcessMutex<T>(fn: () => Promise<T>): Promise<T> {
  const run = processMutex.then(fn, fn);
  processMutex = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function withProcessMutexSafe<T>(fn: () => Promise<T>): Promise<T> {
  const previous = processMutex;
  let release!: () => void;
  processMutex = new Promise<void>((r) => (release = r));
  try {
    await previous.catch(() => undefined);
    return await fn();
  } finally {
    release();
  }
}

/**
 * Acquire the cross-process lock.
 *
 *  - Redis configured ⇒ atomic SET NX with a TTL. A crashed holder cannot wedge
 *    the ledger forever.
 *  - Local file ledger ⇒ mkdir as a lock (atomic on every platform, unlike an
 *    `open(..., 'wx')` race on some Windows setups).
 */
async function acquireLedgerLock(): Promise<string | null> {
  if (redisConfig()) {
    const token = `${process.pid}-${randomUUID().slice(0, 8)}`;
    const deadline = Date.now() + LOCK_WAIT_MS;
    while (Date.now() < deadline) {
      const res = await redisCommand([
        "SET",
        LEDGER_LOCK_KEY,
        token,
        "NX",
        "PX",
        String(LEDGER_LOCK_TTL_MS),
      ]);
      if (res === "OK") return token;
      await sleep(15 + Math.floor(Math.random() * 40));
    }
    return null;
  }

  const lockDir = path.join(process.cwd(), LEDGER_LOCK_FILE);
  const deadline = Date.now() + LOCK_WAIT_MS;
  while (Date.now() < deadline) {
    try {
      await fs.mkdir(lockDir, { recursive: false });
      return `file:${lockDir}`;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "EEXIST") {
        // Break a stale lock (holder died).
        try {
          const st = await fs.stat(lockDir);
          if (Date.now() - st.mtimeMs > LEDGER_LOCK_TTL_MS) {
            await fs.rm(lockDir, { recursive: true, force: true });
            continue;
          }
        } catch {
          /* someone else cleared it */
        }
        await sleep(15 + Math.floor(Math.random() * 40));
        continue;
      }
      // Filesystem cannot lock here — degrade to in-process serialization only.
      return null;
    }
  }
  return null;
}

async function releaseLedgerLock(token: string | null) {
  if (!token) return;
  try {
    if (token.startsWith("file:")) {
      await fs.rm(token.slice("file:".length), { recursive: true, force: true });
      return;
    }
    if (!redisConfig()) return;
    const current = await redisCommand(["GET", LEDGER_LOCK_KEY]);
    if (current === token) await redisCommand(["DEL", LEDGER_LOCK_KEY]);
  } catch {
    /* the TTL clears it */
  }
}

/** Force the next ensureDb() to fetch the ledger from the store again. */
function invalidateLedgerCache() {
  store.hydrated = false;
  store.localReady = false;
  store.freshUntil = 0;
  store.loadFlight = null;
}

/**
 * Run a read-modify-write against the ledger with no lost updates.
 *
 * The lock is held only while the ledger is read from the store and written
 * back — not while `fn` runs. That keeps the critical section small, avoids a
 * long-held lock (which could outlive its TTL), and lets `fn` call other ledger
 * helpers without deadlocking.
 *
 * The cross-process guarantee rests on re-reading inside the lock: whatever the
 * previous holder committed is already visible, so this transaction builds on
 * the latest state instead of a stale in-memory copy. In-process, transactions
 * are queued through `lockChain`, which also closes the read-modify-write window
 * for the local-file ledger (where there is no Redis lock).
 */
export async function withLedger<T>(fn: () => Promise<T>): Promise<T> {
  if (inLedgerTx.getStore()) return fn();

  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const previous = lockChain;
  lockChain = previous.then(
    () => gate,
    () => gate
  );
  await previous.catch(() => undefined);

  try {
    const token = await acquireLedgerLock();
    invalidateLedgerCache();
    try {
      await ensureDb();
    } catch {
      /* fn will surface a store error if there really is one */
    }
    try {
      return await inLedgerTx.run(true, () => fn());
    } finally {
      await releaseLedgerLock(token);
    }
  } finally {
    release();
  }
}

/** In-process transaction queue. */
let lockChain: Promise<unknown> = Promise.resolve();

/** Throw unless the caller is inside withLedger(). Guards money-moving mutators. */
function assertInLedger(what: string) {
  if (!inLedgerTx.getStore()) {
    throw new Error(
      `${what} mutated the ledger outside withLedger(). Wrap the call so concurrent writers cannot clobber it.`
    );
  }
}

/**
 * Public network KPIs for Home / market dashboards.
 * Prefers persisted counters; bootstraps from non-seed tape + usage when counters are empty.
 */
function computeLabNetworkStats(db: AccountsDb): LabNetworkStats {
  const stats = ensureNetworkStats(db);
  const tapeAll = realTapeVolume(db);
  const dayAgo = Date.now() - 24 * 3600_000;
  const real24h = realTapeVolume(db, dayAgo);
  const volume24hUsd = real24h > 0 ? real24h : openingTapeVolume(db, dayAgo);
  const usageRequests = usageRequestCount(db);
  const earnFees = round2(ensureEarn(db).feeRevenueUsd ?? 0);

  // Bootstrap once from observable history so early envs aren't stuck at zero.
  if (stats.volumeUsd <= 0 && tapeAll > 0) stats.volumeUsd = tapeAll;
  if (stats.requests <= 0 && usageRequests > 0) stats.requests = usageRequests;
  if (stats.feesUsd <= 0 && earnFees > 0) stats.feesUsd = earnFees;

  const volumeUsd = Math.max(stats.volumeUsd, tapeAll);
  const feesUsd = Math.max(stats.feesUsd, earnFees);
  const requests = Math.max(stats.requests, usageRequests);

  // Live compute signal: sum of open instance hourly rates (not a vanity lifetime total).
  const computeVolumeUsd = round2(
    Object.values(db.accounts).reduce(
      (s, a) => s + a.instances.reduce((is, i) => is + (i.hourlyUsd || 0), 0),
      0
    )
  );

  return {
    volumeUsd,
    volume24hUsd,
    feesUsd,
    requests,
    depositsSettledUsd: depositsSettledUsd(db),
    activeAccounts: activeAccountCount(db),
    computeVolumeUsd,
  };
}

export async function getLabNetworkStats(): Promise<LabNetworkStats> {
  const db = await ensureDb();
  return computeLabNetworkStats(db);
}

async function readLocal(): Promise<AccountsDb> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    return normalizeDb(JSON.parse(raw) as Partial<AccountsDb>);
  } catch {
    return emptyDb();
  }
}

async function saveLocal(db: AccountsDb) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

/** Use the on-disk ledger. Keeps in-memory accounts if this process already has them. */
async function ensureLocal(): Promise<AccountsDb> {
  if (store.localReady) return store.memory;
  const local = await readLocal();
  const memoryAccounts = Object.keys(store.memory.accounts || {}).length;
  const localAccounts = Object.keys(local.accounts || {}).length;
  if (!store.hydrated || (memoryAccounts === 0 && localAccounts > 0)) {
    store.memory = local;
  }
  store.hydrated = true;
  store.localReady = true;
  return store.memory;
}

async function redisCommand(args: string[]): Promise<unknown> {
  const cfg = redisConfig();
  if (!cfg) throw new Error("Redis is not configured");
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const data = (await res.json().catch(() => null)) as { result?: unknown; error?: string } | null;
  if (!res.ok || !data || data.error) {
    throw new Error(data?.error || `Ledger store request failed (${res.status})`);
  }
  return data.result;
}

async function loadFromRedis(): Promise<"ok" | "missing"> {
  const raw = await redisCommand(["GET", REDIS_LEDGER_KEY]);
  if (typeof raw !== "string" || !raw) return "missing";
  const parsed = JSON.parse(raw) as Partial<AccountsDb>;
  const prevSeed = Number(parsed?.liquiditySeed || 0);
  const emptyBook = bandAvailable(parsed.liquidity) <= 0 || !(Number(parsed.houseBidPoolUsd) > 0);
  store.memory = normalizeDb(parsed);
  store.hydrated = true;
  store.freshUntil = Date.now() + BLOB_READ_TTL_MS;
  if (prevSeed < LIQUIDITY_SEED_VERSION || emptyBook) await saveToRedis(store.memory);
  return "ok";
}

async function saveToRedis(db: AccountsDb) {
  await redisCommand(["SET", REDIS_LEDGER_KEY, JSON.stringify(db)]);
  store.freshUntil = Date.now() + BLOB_READ_TTL_MS;
}

async function refreshFromRedis(): Promise<AccountsDb> {
  try {
    const status = await loadFromRedis();
    if (status === "missing") {
      store.memory = await readLocal();
      store.hydrated = true;
      await saveToRedis(store.memory);
    }
    return store.memory;
  } catch (err) {
    if (store.hydrated) {
      store.freshUntil = Date.now() + 30_000;
      return store.memory;
    }
    if (!store.redisWarned) {
      store.redisWarned = true;
      console.warn(
        "Account ledger could not reach Redis. Using the local file for this process.",
        err instanceof Error ? err.message : ""
      );
    }
    return ensureLocal();
  }
}

async function loadFromBlob(): Promise<"ok" | "missing"> {
  const result = await get(BLOB_PATHNAME, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) return "missing";
  const raw = await new Response(result.stream).text();
  const parsed = JSON.parse(raw) as Partial<AccountsDb>;
  const prevSeed = Number(parsed?.liquiditySeed || 0);
  const emptyBook = bandAvailable(parsed.liquidity) <= 0 || !(Number(parsed.houseBidPoolUsd) > 0);
  store.memory = normalizeDb(parsed);
  store.hydrated = true;
  store.freshUntil = Date.now() + BLOB_READ_TTL_MS;
  if (prevSeed < LIQUIDITY_SEED_VERSION || emptyBook) {
    await saveToBlob(store.memory);
  }
  return "ok";
}

async function saveToBlob(db: AccountsDb) {
  await put(BLOB_PATHNAME, JSON.stringify(db), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  store.freshUntil = Date.now() + BLOB_READ_TTL_MS;
}

async function refreshFromBlob(): Promise<AccountsDb> {
  try {
    const status = await loadFromBlob();
    if (status === "missing" && !store.hydrated) {
      store.memory = emptyDb();
      store.hydrated = true;
      await saveToBlob(store.memory);
    }
    return store.memory;
  } catch (err) {
    if (!isBlobSuspended(err)) {
      if (store.hydrated) {
        store.freshUntil = Date.now() + 30_000;
        return store.memory;
      }
      throw err;
    }
    blockBlob();
    return ensureLocal();
  }
}

async function ensureDb(): Promise<AccountsDb> {
  if (!redisConfig() && !blobEnabled()) return ensureLocal();
  if (store.hydrated && Date.now() < store.freshUntil) return store.memory;
  if (!store.loadFlight) {
    const refresh = redisConfig() ? refreshFromRedis : refreshFromBlob;
    store.loadFlight = refresh().finally(() => {
      store.loadFlight = null;
    });
  }
  return store.loadFlight;
}

async function saveDb() {
  // Inside withLedger the transaction already holds the lock.
  if (inLedgerTx.getStore()) return saveDbInner();
  // Otherwise serialize with transactions so no writer can interleave mid-mutation.
  return withProcessMutexSafe(() => saveDbInner());
}

async function saveDbInner() {
  store.writeChain = store.writeChain.then(async () => {
    if (redisConfig()) {
      try {
        await saveToRedis(store.memory);
        return;
      } catch (err) {
        if (!store.redisWarned) {
          store.redisWarned = true;
          console.warn(
            "Account ledger could not save to Redis. Using the local file for this process.",
            err instanceof Error ? err.message : ""
          );
        }
      }
    } else if (blobEnabled()) {
      try {
        await saveToBlob(store.memory);
        return;
      } catch (err) {
        if (!isBlobSuspended(err)) throw err;
        blockBlob();
      }
    }
    await saveLocal(store.memory);
  });
  await store.writeChain;
}

export async function getOrCreateAccount(userId: string): Promise<AccountRecord> {
  const db = await ensureDb();
  if (!db.accounts[userId]) {
    db.accounts[userId] = emptyAccount(userId);
    await saveDb();
    if (!userId.startsWith("_")) trackSoon("signup");
  }
  return db.accounts[userId];
}

export async function getAccountSnapshot(userId: string) {
  const a = await getOrCreateAccount(userId);
  return {
    credits: a.credits,
    usdc: a.usdc,
    usdg: a.usdg,
    history: a.history.slice(0, 100),
    keys: a.keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      createdAt: k.createdAt,
      projectId: k.projectId,
      revoked: k.revoked,
    })),
    usage: a.usage.slice(0, 100),
    instances: a.instances.slice(0, 50),
  };
}

function pushHistory(account: AccountRecord, row: Omit<BillingHistoryRow, "id" | "date"> & { date?: string }) {
  account.history = [
    {
      id: `bill_${randomUUID().slice(0, 8)}`,
      date: row.date || new Date().toISOString(),
      kind: row.kind,
      description: row.description,
      title: row.title || row.description,
      amount: row.amount,
      resource: row.resource,
      projectId: row.projectId,
      method: row.method,
    },
    ...account.history,
  ].slice(0, 200);
}

export type CryptoDepositMethod = "usdc" | "usdg" | "crypto" | "tensora";

/**
 * Credit an account after a verified on-chain transfer to the treasury.
 * Accepts Base USDC and Robinhood Chain USDG (plus Olora when configured).
 */
export async function claimOnChainDeposit(
  userId: string,
  opts: {
    method: CryptoDepositMethod;
    amountUsd: number;
    txHash: string;
    token: string;
    from: string;
    chain?: "base" | "robinhood";
  }
) {
  return withLedger(() => claimOnChainDepositInner(userId, opts));
}

async function claimOnChainDepositInner(
  userId: string,
  opts: {
    method: CryptoDepositMethod;
    amountUsd: number;
    txHash: string;
    token: string;
    from: string;
    chain?: "base" | "robinhood";
  }
) {
  const amt = round2(opts.amountUsd);
  if (amt <= 0) throw new Error("Amount must be positive");
  const txHash = opts.txHash.toLowerCase();
  const db = await ensureDb();
  if (!db.claimedTxs) db.claimedTxs = {};
  if (db.claimedTxs[txHash]) {
    throw new Error("This transaction was already claimed.");
  }

  const account = await getOrCreateAccount(userId);
  const chain =
    opts.chain ||
    (opts.method === "usdg" ? "robinhood" : "base");
  const chainLabel = chain === "robinhood" ? "Robinhood Chain" : "Base";
  const label =
    opts.method === "tensora"
      ? "Deposit Olora"
      : opts.method === "usdg"
        ? "Deposit USDG"
        : opts.method === "crypto"
          ? "Deposit crypto"
          : "Deposit USDC";

  // A deposit is cash. Credits come from buying on the market.
  if (opts.method === "usdg") {
    account.usdg = round2(account.usdg + amt);
  } else if (opts.method === "usdc" || opts.method === "crypto") {
    account.usdc = round2(account.usdc + amt);
  } else {
    account.credits = round2(account.credits + amt);
  }
  pushHistory(account, {
    kind: "deposit",
    description: `${label} · ${txHash.slice(0, 10)}…`,
    amount: `+$${amt.toFixed(2)}`,
    resource: `${opts.token} · ${chainLabel} · from ${opts.from.slice(0, 6)}…${opts.from.slice(-4)}`,
    method: opts.method,
  });

  db.claimedTxs[txHash] = { userId, at: new Date().toISOString(), amountUsd: amt };
  account.updatedAt = new Date().toISOString();
  await saveDb();
  trackSoon("deposit", amt);
  return getAccountSnapshot(userId);
}

/** @deprecated Free demo deposits removed — use claimOnChainDeposit. */
export async function depositServer(
  _userId: string,
  _method: string,
  _amountUsd: number
): Promise<never> {
  throw new Error(
    "Demo top-ups are disabled. Send USDC on Base or USDG on Robinhood Chain to the treasury, then claim with the tx hash."
  );
}

export async function debitCredits(
  userId: string,
  amountUsd: number,
  meta: { kind: string; description: string; resource?: string }
): Promise<{ ok: true; credits: number } | { ok: false; credits: number; error: string }> {
  return withLedger(async () => {
    const amt = round2(amountUsd);
    const account = await getOrCreateAccount(userId);
    if (amt <= 0) return { ok: true as const, credits: account.credits };
    if (account.credits < amt) {
      return { ok: false as const, credits: account.credits, error: "Insufficient credits." };
    }
    account.credits = round2(account.credits - amt);
    pushHistory(account, {
      kind: meta.kind,
      description: meta.description,
      amount: `-$${amt.toFixed(2)}`,
      resource: meta.resource,
    });
    account.updatedAt = new Date().toISOString();
    await saveDb();
    return { ok: true as const, credits: account.credits };
  });
}
export type SubscriptionState = {
  plan: "payg" | "plus";
  priceUsd: number;
  messageLimit: number;
  messagesUsed: number;
  messagesLeft: number;
  renewsAt: string | null;
  status: "none" | "active" | "canceled";
  cashUsd: number;
  tier: TierId | null;
};

function liveSubscription(sub: AccountSubscription | undefined): AccountSubscription | null {
  if (!sub || sub.plan !== "plus") return null;
  if (Date.parse(sub.renewsAt) <= Date.now()) return null;
  return sub;
}

export function subscriptionState(account: AccountRecord): SubscriptionState {
  const sub = liveSubscription(account.subscription);
  const cashUsd = round2((account.usdc || 0) + (account.usdg || 0));
  if (!sub) {
    return {
      plan: "payg",
      priceUsd: PLUS_PRICE_USD,
      messageLimit: PLUS_MESSAGE_LIMIT,
      messagesUsed: 0,
      messagesLeft: 0,
      renewsAt: null,
      status: "none",
      cashUsd,
      tier: null,
    };
  }
  return {
    plan: "plus",
    priceUsd: sub.priceUsd,
    messageLimit: sub.messageLimit,
    messagesUsed: sub.messagesUsed,
    messagesLeft: Math.max(0, sub.messageLimit - sub.messagesUsed),
    renewsAt: sub.renewsAt,
    status: sub.status,
    cashUsd,
    tier: sub.tier ?? "plus",
  };
}

export async function getSubscription(userId: string): Promise<SubscriptionState> {
  const account = await getOrCreateAccount(userId);
  return subscriptionState(account);
}

export async function subscribePlus(
  userId: string,
  tierId: TierId = "plus"
): Promise<{ ok: true; state: SubscriptionState } | { ok: false; error: string; state: SubscriptionState }> {
  const account = await getOrCreateAccount(userId);
  const tier = tierById(tierId);
  if (!tier) return { ok: false, error: "Unknown package.", state: subscriptionState(account) };
  const current = liveSubscription(account.subscription);
  if (current) {
    return {
      ok: false,
      error: `Your plan is already paid through ${new Date(current.renewsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`,
      state: subscriptionState(account),
    };
  }
  const price = round2(tier.priceUsd);
  const cash = round2((account.usdc || 0) + (account.usdg || 0));
  if (cash < price) {
    return {
      ok: false,
      error: `Add $${(price - cash).toFixed(2)} to your cash balance to subscribe.`,
      state: subscriptionState(account),
    };
  }
  let left = price;
  const fromUsdc = Math.min(account.usdc || 0, left);
  account.usdc = round2((account.usdc || 0) - fromUsdc);
  left = round2(left - fromUsdc);
  if (left > 0) account.usdg = round2((account.usdg || 0) - left);
  const now = new Date();
  const renews = new Date(now.getTime() + PLUS_PERIOD_DAYS * 24 * 3600_000);
  account.subscription = {
    plan: "plus",
    startedAt: now.toISOString(),
    renewsAt: renews.toISOString(),
    messagesUsed: 0,
    messageLimit: tier.messages,
    priceUsd: price,
    tier: tier.id,
    status: "active",
  };
  if (tier.bonusCredits > 0) account.credits = round2(account.credits + tier.bonusCredits);
  pushHistory(account, {
    kind: "subscription",
    description: `Olora ${tier.name} · ${tier.messages.toLocaleString("en-US")} everyday messages${
      tier.bonusCredits > 0 ? ` + $${tier.bonusCredits} credits` : ""
    }`,
    title: `Olora ${tier.name}`,
    amount: `-$${price.toFixed(2)}`,
    resource: `Through ${renews.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
  });
  account.updatedAt = now.toISOString();
  await saveDb();
  trackSoon("subscribe", price);
  return { ok: true, state: subscriptionState(account) };
}

export async function cancelPlus(
  userId: string
): Promise<{ ok: true; state: SubscriptionState } | { ok: false; error: string; state: SubscriptionState }> {
  const account = await getOrCreateAccount(userId);
  const current = liveSubscription(account.subscription);
  if (!current) {
    return { ok: false, error: "No active subscription.", state: subscriptionState(account) };
  }
  current.status = "canceled";
  account.subscription = current;
  const through = new Date(current.renewsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  pushHistory(account, {
    kind: "subscription",
    description: "Olora Plus canceled",
    title: "Olora Plus",
    amount: "",
    resource: `Included messages stay through ${through}`,
  });
  account.updatedAt = new Date().toISOString();
  await saveDb();
  return { ok: true, state: subscriptionState(account) };
}

/** Count one included everyday message. Flagship models and a used-up pack fall through to credits. */
export async function consumePlusMessage(
  userId: string,
  modelId: string
): Promise<{ included: false } | { included: true; messagesLeft: number; credits: number }> {
  const account = await getOrCreateAccount(userId);
  const sub = liveSubscription(account.subscription);
  if (!sub || !isEverydayModel(modelId) || sub.messagesUsed >= sub.messageLimit) {
    return { included: false };
  }
  sub.messagesUsed += 1;
  account.subscription = sub;
  account.updatedAt = new Date().toISOString();
  await saveDb();
  return {
    included: true,
    messagesLeft: Math.max(0, sub.messageLimit - sub.messagesUsed),
    credits: account.credits,
  };
}

export async function recordUsage(
  userId: string,
  event: Omit<UsageEvent, "id" | "at"> & { at?: string }
) {
  return withLedger(async () => {
    const db = await ensureDb();
    if (!db.accounts[userId]) {
      db.accounts[userId] = emptyAccount(userId);
    }
    const account = db.accounts[userId];
    account.usage = [
      {
        id: `use_${randomUUID().slice(0, 8)}`,
        at: event.at || new Date().toISOString(),
        model: event.model,
        cost: event.cost,
        promptTokens: event.promptTokens,
        completionTokens: event.completionTokens,
        totalTokens: event.totalTokens,
        gatewayMs: event.gatewayMs,
        kind: event.kind,
      },
      ...account.usage,
    ].slice(0, 500);
    const stats = ensureNetworkStats(db);
    stats.requests = Math.max(0, stats.requests + 1);
    if (event.cost > 0) {
      // Inference spend is GMV through the gateway (credits burned).
      stats.volumeUsd = round2(stats.volumeUsd + event.cost);
    }
    account.updatedAt = new Date().toISOString();
    await saveDb();
  });
}

export function hashApiKey(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export async function createApiKey(
  userId: string,
  name: string,
  projectId = "default"
): Promise<{ secret: string; key: Omit<StoredApiKey, "hash"> }> {
  const account = await getOrCreateAccount(userId);
  const secret = `tsk_${randomBytes(24).toString("hex")}`;
  const hash = hashApiKey(secret);
  const row: StoredApiKey = {
    id: `key_${randomUUID().slice(0, 10)}`,
    name: name.trim() || "Untitled key",
    prefix: secret.slice(0, 10),
    hash,
    createdAt: new Date().toISOString(),
    projectId,
  };
  account.keys = [row, ...account.keys];
  const db = await ensureDb();
  db.keyIndex[hash] = userId;
  account.updatedAt = new Date().toISOString();
  await saveDb();
  pushHistory(account, {
    kind: "api_key",
    description: `API key created: ${row.name}`,
    amount: "$0.00",
    resource: row.prefix,
  });
  await saveDb();
  return {
    secret,
    key: {
      id: row.id,
      name: row.name,
      prefix: row.prefix,
      createdAt: row.createdAt,
      projectId: row.projectId,
    },
  };
}

export async function revokeApiKey(userId: string, keyId: string) {
  const account = await getOrCreateAccount(userId);
  const row = account.keys.find((k) => k.id === keyId);
  if (!row) throw new Error("Key not found");
  row.revoked = true;
  const db = await ensureDb();
  delete db.keyIndex[row.hash];
  account.updatedAt = new Date().toISOString();
  await saveDb();
  return getAccountSnapshot(userId);
}

let lastMissRefresh = 0;
/** Re-read the ledger on an unknown key at most every 3s, so bad keys cannot hammer Redis. */
export function allowMissRefresh() {
  const now = Date.now();
  if (now - lastMissRefresh < 3_000) return false;
  lastMissRefresh = now;
  return true;
}

export async function resolveUserIdFromApiKey(secret: string): Promise<string | null> {
  if (!secret.startsWith("tsk_")) return null;
  const hash = hashApiKey(secret);
  let db = await ensureDb();
  let userId = db.keyIndex[hash];
  if (!userId && redisConfig() && allowMissRefresh()) {
    // Key may be newer than this instance's cached ledger.
    store.freshUntil = 0;
    db = await ensureDb();
    userId = db.keyIndex[hash];
  }
  if (!userId) return null;
  const account = db.accounts[userId];
  if (!account) return null;
  const key = account.keys.find((k) => k.hash === hash && !k.revoked);
  return key ? userId : null;
}

export async function listLiquidity() {
  const db = await ensureDb();
  const total = db.liquidity.reduce((s, b) => s + b.availableUsd, 0);
  const displayBands = cosmeticLiquidityBands(db.liquidity);
  const displayTotal = displayBands.reduce((s, b) => s + b.availableUsd, 0);
  return {
    bands: db.liquidity,
    totalAvailable: round2(total),
    /** Cosmetic book for order-book UI (~$1.5k). */
    displayBands,
    bookDepthUsd: round2(displayTotal),
    sellableCapUsd: HOUSE_SELLABLE_FACE_USD,
    gpuSubsidyUsd: round2(db.gpuSubsidyUsd ?? 0),
  };
}

export async function listMarketTape() {
  const db = await ensureDb();
  if (!db.marketTape?.length) {
    db.marketTape = seedTape();
    await saveDb();
  }
  return db.marketTape.slice(0, 24);
}

export type PurchaseQuote = {
  faceValue: number;
  discountBps: number;
  discountedPrice: number;
  platformFee: number;
  totalPay: number;
  bandId: string;
};

export function quotePurchase(faceValue: number, discountBps: number, feeBps: number, bandId: string): PurchaseQuote {
  const face = round2(faceValue);
  const discountedPrice = round2(face * (1 - discountBps / 10000));
  const platformFee = round2(discountedPrice * (feeBps / 10000));
  const totalPay = round2(discountedPrice + platformFee);
  return { faceValue: face, discountBps, discountedPrice, platformFee, totalPay, bandId };
}

export async function purchaseCredits(
  userId: string,
  faceValue: number,
  bandId?: string
): Promise<
  | { ok: true; quote: PurchaseQuote; credits: number; usdc: number }
  | { ok: false; error: string; credits: number; usdc: number }
> {
  return withLedger(() => purchaseCreditsInner(userId, faceValue, bandId));
}

async function purchaseCreditsInner(
  userId: string,
  faceValue: number,
  bandId?: string
): Promise<
  | { ok: true; quote: PurchaseQuote; credits: number; usdc: number }
  | { ok: false; error: string; credits: number; usdc: number }
> {
  const db = await ensureDb();
  const account = await getOrCreateAccount(userId);
  const bands = [...db.liquidity].sort((a, b) => b.discountBps - a.discountBps);
  let band = bandId ? bands.find((b) => b.id === bandId) : undefined;
  if (!band) {
    band = bands.find((b) => b.availableUsd >= faceValue) || bands[bands.length - 1];
  }
  if (!band) return { ok: false, error: "No liquidity available.", credits: account.credits, usdc: account.usdc };
  if (band.availableUsd < faceValue) {
    const sellable = bands.reduce((s, b) => s + b.availableUsd, 0);
    if (sellable <= 0) {
      return {
        ok: false,
        error: "Discounted inventory is sold out. Check back when the house restocks.",
        credits: account.credits,
        usdc: account.usdc,
      };
    }
    return {
      ok: false,
      error: `Only $${band.availableUsd.toFixed(2)} available at this discount ($${sellable.toFixed(2)} sellable left).`,
      credits: account.credits,
      usdc: account.usdc,
    };
  }

  const feeBps = Number(process.env.MARKETPLACE_PLATFORM_FEE_BPS || "500");
  const quote = quotePurchase(faceValue, band.discountBps, feeBps, band.id);

  // Credits are bought with cash only.
  const cash = round2((account.usdc || 0) + (account.usdg || 0));
  if (cash >= quote.totalPay) {
    spendFromBalances(account, quote.totalPay);
  } else {
    return {
      ok: false,
      error: `Need $${quote.totalPay.toFixed(2)} in cash. Add funds on Portfolio first.`,
      credits: account.credits,
      usdc: account.usdc,
    };
  }

  account.credits = round2(account.credits + quote.faceValue);
  band.availableUsd = round2(Math.max(0, band.availableUsd - quote.faceValue));
  pushHistory(account, {
    kind: "marketplace",
    description: `Inference credits $${quote.faceValue.toFixed(2)} (−${(quote.discountBps / 100).toFixed(0)}%)`,
    amount: `+$${quote.faceValue.toFixed(2)}`,
    resource: `Paid $${quote.totalPay.toFixed(2)} (fee $${quote.platformFee.toFixed(2)})`,
    method: "marketplace",
  });
  recordTradeStats(db, quote.faceValue, quote.platformFee);
  const price = Math.round((1 - quote.discountBps / 10000) * 10000) / 10000;
  if (!db.marketTape) db.marketTape = seedTape();
  db.marketTape = [
    {
      id: `tape_${randomUUID().slice(0, 8)}`,
      at: new Date().toISOString(),
      price,
      sizeUsd: quote.faceValue,
      side: "buy" as const,
    },
    ...db.marketTape,
  ].slice(0, 40);
  account.updatedAt = new Date().toISOString();
  await saveDb();
  return { ok: true, quote, credits: account.credits, usdc: account.usdc };
}

export async function addInstance(userId: string, instance: Omit<ServerGpuInstance, "userId">) {
  return withLedger(async () => {
    const account = await getOrCreateAccount(userId);
    account.instances = [{ ...instance, userId }, ...account.instances].slice(0, 100);
    account.updatedAt = new Date().toISOString();
    await saveDb();
    return account.instances;
  });
}

/** Quote GPU house price: listed hourly discounted while subsidy remains. */
export async function quoteGpuHouseRate(listedHourlyUsd: number, hours = 1) {
  const db = await ensureDb();
  const listed = Math.max(0, listedHourlyUsd);
  const hrs = Math.max(1, hours);
  const listCharge = round2(listed * hrs);
  const subsidyLeft = round2(db.gpuSubsidyUsd ?? 0);
  const discountBps = subsidyLeft > 0 ? GPU_HOUSE_DISCOUNT_BPS : 0;
  const houseHourly = round2(listed * (1 - discountBps / 10000));
  const houseCharge = round2(houseHourly * hrs);
  const subsidyNeed = round2(listCharge - houseCharge);
  const appliedSubsidy = Math.min(subsidyLeft, subsidyNeed);
  // If subsidy can't cover full discount, charge list minus what's left in the pool.
  const buyerPay = round2(listCharge - appliedSubsidy);
  return {
    listedHourlyUsd: listed,
    houseHourlyUsd: appliedSubsidy > 0 ? round2(buyerPay / hrs) : listed,
    listCharge,
    buyerPay,
    subsidyApplied: appliedSubsidy,
    subsidyRemaining: subsidyLeft,
    discountBps: appliedSubsidy > 0 ? discountBps : 0,
  };
}

/**
 * Debit buyer for GPU rent at house rate and consume subsidy pool.
 * Returns the amount charged to the buyer.
 */
export async function chargeGpuWithSubsidy(
  userId: string,
  opts: {
    listedHourlyUsd: number;
    hours: number;
    gpuType: string;
    provider: string;
    sandbox?: boolean;
  }
): Promise<
  | { ok: true; credits: number; charged: number; subsidyApplied: number; houseHourlyUsd: number }
  | { ok: false; credits: number; error: string }
> {
  const quote = await quoteGpuHouseRate(opts.listedHourlyUsd, opts.hours);
  if (quote.buyerPay > 0) {
    const debit = await debitCredits(userId, quote.buyerPay, {
      kind: "compute",
      description: `${opts.sandbox ? "Sandbox" : "GPU"} · ${opts.gpuType} (−${(quote.discountBps / 100).toFixed(0)}% house)`,
      resource: opts.provider,
    });
    if (!debit.ok) return { ok: false, credits: debit.credits, error: "Insufficient credits." };
  }

  if (quote.subsidyApplied > 0) {
    const db = await ensureDb();
    db.gpuSubsidyUsd = round2(Math.max(0, (db.gpuSubsidyUsd ?? 0) - quote.subsidyApplied));
    await saveDb();
  }

  const account = await getOrCreateAccount(userId);
  return {
    ok: true,
    credits: account.credits,
    charged: quote.buyerPay,
    subsidyApplied: quote.subsidyApplied,
    houseHourlyUsd: quote.houseHourlyUsd,
  };
}

export async function creditCredits(
  userId: string,
  amountUsd: number,
  meta: { kind: string; description: string; resource?: string }
): Promise<{ ok: true; credits: number }> {
  return withLedger(() => creditCreditsInner(userId, amountUsd, meta));
}

async function creditCreditsInner(
  userId: string,
  amountUsd: number,
  meta: { kind: string; description: string; resource?: string }
): Promise<{ ok: true; credits: number }> {
  const amt = round2(amountUsd);
  const account = await getOrCreateAccount(userId);
  if (amt <= 0) return { ok: true, credits: account.credits };
  account.credits = round2(account.credits + amt);
  pushHistory(account, {
    kind: meta.kind,
    description: meta.description,
    amount: `+$${amt.toFixed(2)}`,
    resource: meta.resource,
  });
  account.updatedAt = new Date().toISOString();
  await saveDb();
  return { ok: true, credits: account.credits };
}

/** Put a failed GPU charge back on the account and return unused subsidy to the pool. */
export async function refundGpuCharge(
  userId: string,
  opts: { amount: number; subsidyApplied: number; gpuType: string; provider: string }
) {
  return withLedger(async () => {
    if (opts.amount > 0) {
      await creditCredits(userId, opts.amount, {
        kind: "compute",
        description: `Refund · ${opts.gpuType} did not start`,
        resource: opts.provider,
      });
    }
    if (opts.subsidyApplied > 0) {
      const db = await ensureDb();
      db.gpuSubsidyUsd = round2((db.gpuSubsidyUsd ?? 0) + opts.subsidyApplied);
      await saveDb();
    }
  });
}

export async function patchInstance(
  userId: string,
  id: string,
  patch: Partial<Omit<ServerGpuInstance, "id" | "userId">>
) {
  return withLedger(async () => {
    const account = await getOrCreateAccount(userId);
    const row = account.instances.find((i) => i.id === id);
    if (!row) return null;
    Object.assign(row, patch);
    account.updatedAt = new Date().toISOString();
    await saveDb();
    return row;
  });
}

export async function getGpuSubsidyRemaining() {
  const db = await ensureDb();
  return round2(db.gpuSubsidyUsd ?? 0);
}

export async function listInstances(userId: string) {
  const account = await getOrCreateAccount(userId);
  return account.instances;
}

export async function usageAnalytics(userId: string) {
  const account = await getOrCreateAccount(userId);
  const usage = account.usage.filter((u) => u.kind === "inference");
  const spent = usage.reduce((s, u) => s + u.cost, 0);
  const requests = usage.length;
  const tokens = usage.reduce((s, u) => s + u.totalTokens, 0);
  const latencies = usage.map((u) => u.gatewayMs).filter((n) => n > 0);
  const avgLatency =
    latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const p95 =
    sorted.length > 0 ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0;

  const byModel = new Map<string, { spend: number; req: number }>();
  for (const u of usage) {
    const cur = byModel.get(u.model) || { spend: 0, req: 0 };
    cur.spend += u.cost;
    cur.req += 1;
    byModel.set(u.model, cur);
  }
  const models = [...byModel.entries()]
    .map(([model, v]) => ({ model, spend: round2(v.spend), requests: v.req }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 8);

  const dayMap = new Map<string, number>();
  for (const u of usage) {
    const day = u.at.slice(0, 10);
    dayMap.set(day, round2((dayMap.get(day) || 0) + u.cost));
  }
  const spendByDay = [...dayMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([day, spend]) => ({ day, spend }));

  return {
    spent: round2(spent),
    requests,
    tokens,
    latencyMs: avgLatency,
    p95Ms: p95,
    models,
    spendByDay,
  };
}

// ────────────────────────────────────────────────────────────────
// Credits/USDC order book: real resting orders + matching engine.
// House asks are derived live from liquidity bands (one inventory).
// House bid is backed by houseBidPoolUsd; bought-back face is
// recycled into the deepest-discount band.
// ────────────────────────────────────────────────────────────────

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

type MatchLevel =
  | { kind: "user"; order: MarketOrder; price: number; sizeUsd: number }
  | { kind: "house-ask"; bandId: string; price: number; sizeUsd: number }
  | { kind: "house-bid"; price: number; sizeUsd: number };

/**
 * Split sellable bands into a dense ask ladder (best ask stays at deepest
 * discount, typically 0.92). More size near mid, tapering into the wings.
 */
function houseAskLevels(db: AccountsDb): MatchLevel[] {
  const live = db.liquidity
    .filter((b) => b.availableUsd > 0)
    .sort((a, b) => b.discountBps - a.discountBps);
  if (!live.length) return [];

  const bestAsk = round4(1 - live[0].discountBps / 10000);
  // Mixed ticks: tight near best, wider toward par → ~12 levels.
  const offsets = [0, 0.0025, 0.005, 0.0075, 0.01, 0.015, 0.0225, 0.03, 0.04, 0.055, 0.07, 0.08];
  const prices: number[] = [];
  for (const o of offsets) {
    const p = round4(Math.min(MARKET_MAX_PRICE, bestAsk + o));
    if (!prices.length || p > prices[prices.length - 1]) prices.push(p);
  }

  const bandForPrice = (price: number): LiquidityBand => {
    // Nearest band base — spreads wing size across top-of-book ask rungs.
    return live
      .map((b) => {
        const base = round4(1 - b.discountBps / 10000);
        return { b, base, dist: Math.abs(base - price) };
      })
      .sort((a, b) => a.dist - b.dist || a.base - b.base)[0].b;
  };

  const byBand = new Map<string, number[]>();
  for (const p of prices) {
    const band = bandForPrice(p);
    const list = byBand.get(band.id) || [];
    list.push(p);
    byBand.set(band.id, list);
  }

  const out: MatchLevel[] = [];
  for (const band of live) {
    const ps = byBand.get(band.id);
    if (!ps?.length) continue;
    const sizes = splitUsdLadder(band.availableUsd, nearMidWeights(ps.length));
    ps.forEach((price, i) => {
      const sizeUsd = sizes[i] ?? 0;
      if (sizeUsd < 0.01) return;
      out.push({ kind: "house-ask", bandId: band.id, price, sizeUsd });
    });
  }
  return out.sort((a, b) => a.price - b.price);
}

/**
 * Multi-level house bids under the live best ask (≈1¢ spread at top of book).
 * Pool USDC is carved across rungs; sizeUsd is credit face at each price.
 */
function houseBidLevels(db: AccountsDb): MatchLevel[] {
  const pool = round2(db.houseBidPoolUsd ?? 0);
  if (pool <= 0) return [];

  const liveAsks = houseAskLevels(db);
  const bestAsk = liveAsks[0]?.price ?? round4(1 - 800 / 10000);
  const bestBid = round4(
    Math.min(HOUSE_BID_PRICE, Math.max(MARKET_MIN_PRICE, bestAsk - 0.01))
  );

  const offsets = [0, 0.0025, 0.005, 0.0075, 0.01, 0.015, 0.0225, 0.03, 0.04, 0.055, 0.07];
  const prices: number[] = [];
  for (const o of offsets) {
    const p = round4(bestBid - o);
    if (p < MARKET_MIN_PRICE) break;
    if (!prices.length || p < prices[prices.length - 1]) prices.push(p);
  }
  if (!prices.length) return [];

  const usdcChunks = splitUsdLadder(pool, nearMidWeights(prices.length));
  const out: MatchLevel[] = [];
  prices.forEach((price, i) => {
    const usdc = usdcChunks[i] ?? 0;
    if (usdc < 0.01 || price <= 0) return;
    const face = Math.floor((usdc / price) * 100) / 100;
    if (face < 0.01) return;
    out.push({ kind: "house-bid", price, sizeUsd: face });
  });
  return out;
}

function openOrders(db: AccountsDb): MarketOrder[] {
  if (!db.marketOrders) db.marketOrders = [];
  return db.marketOrders;
}

/** Spend cash: USDC first, then USDG. Credits never pay for credits. Caller must pre-check totals. */
function spendFromBalances(account: AccountRecord, amount: number) {
  let left = round2(amount);
  const fromUsdc = Math.min(account.usdc || 0, left);
  account.usdc = round2((account.usdc || 0) - fromUsdc);
  left = round2(left - fromUsdc);
  if (left > 0) account.usdg = round2((account.usdg || 0) - left);
}

function pushTape(
  db: AccountsDb,
  price: number,
  sizeUsd: number,
  side: "buy" | "sell",
  wallet?: string
) {
  if (!db.marketTape) db.marketTape = seedTape();
  const normalized = wallet?.trim() ? wallet.trim().toLowerCase() : undefined;
  db.marketTape = [
    {
      id: `tape_${randomUUID().slice(0, 8)}`,
      at: new Date().toISOString(),
      price: round4(price),
      sizeUsd: round2(sizeUsd),
      side,
      ...(normalized ? { wallet: normalized } : {}),
    },
    ...db.marketTape,
  ].slice(0, 60);
}

export type MarketFill = { price: number; sizeUsd: number; maker: "house" | "user" };

export type PlaceOrderResult =
  | {
      ok: true;
      filledUsd: number;
      avgPrice: number | null;
      notionalUsd: number;
      feeUsd: number;
      fills: MarketFill[];
      restingOrder: { id: string; side: MarketOrderSide; price: number; sizeUsd: number } | null;
      credits: number;
      usdc: number;
    }
  | { ok: false; error: string; credits: number; usdc: number };

/**
 * Place a limit or market order on the credits/USDC book.
 * Buy: pay USDC-then-credits, receive credit face. Sell: give credit
 * face, receive USDC proceeds (minus taker fee on notional).
 */
export async function placeMarketOrder(
  userId: string,
  opts: {
    side: MarketOrderSide;
    sizeUsd: number;
    price?: number;
    type?: "limit" | "market";
    /** Discounted taker fee for $OLORA holders (defaults to env rate). */
    feeBpsOverride?: number;
    /** Taker wallet for tape attribution (display only). Never affects funds. */
    wallet?: string;
  }
): Promise<PlaceOrderResult> {
  return withLedger(() => placeMarketOrderInner(userId, opts));
}

async function placeMarketOrderInner(
  userId: string,
  opts: {
    side: MarketOrderSide;
    sizeUsd: number;
    price?: number;
    type?: "limit" | "market";
    /** Discounted taker fee for $OLORA holders (defaults to env rate). */
    feeBpsOverride?: number;
    /** Taker wallet for tape attribution (display only). Never affects funds. */
    wallet?: string;
  }
): Promise<PlaceOrderResult> {
  const db = await ensureDb();
  const account = await getOrCreateAccount(userId);
  const type = opts.type === "market" ? "market" : "limit";
  const size = round2(opts.sizeUsd);
  const fail = (error: string): PlaceOrderResult => ({
    ok: false,
    error,
    credits: account.credits,
    usdc: account.usdc,
  });

  if (!Number.isFinite(size) || size < MARKET_MIN_ORDER_USD || size > MARKET_MAX_ORDER_USD) {
    return fail(`Order size must be $${MARKET_MIN_ORDER_USD}–$${MARKET_MAX_ORDER_USD} face.`);
  }
  let limit =
    type === "market"
      ? opts.side === "buy"
        ? MARKET_MAX_PRICE
        : MARKET_MIN_PRICE
      : round4(Number(opts.price));
  if (!Number.isFinite(limit)) return fail("A limit price is required.");
  limit = Math.min(MARKET_MAX_PRICE, Math.max(MARKET_MIN_PRICE, limit));

  const feeBps =
    opts.feeBpsOverride != null && Number.isFinite(opts.feeBpsOverride)
      ? Math.max(0, opts.feeBpsOverride)
      : marketTakerFeeBps();
  const orders = openOrders(db);

  // Build the opposing side of the book (skip own orders: no self-trade).
  let levels: MatchLevel[];
  if (opts.side === "buy") {
    const userAsks = orders
      .filter((o) => o.side === "sell" && o.userId !== userId)
      .map((o) => ({ kind: "user" as const, order: o, price: o.price, sizeUsd: o.sizeUsd }));
    levels = [...userAsks, ...houseAskLevels(db)].sort(
      (a, b) => a.price - b.price || (a.kind === "user" ? -1 : 1)
    );
  } else {
    const userBids = orders
      .filter((o) => o.side === "buy" && o.userId !== userId)
      .map((o) => ({ kind: "user" as const, order: o, price: o.price, sizeUsd: o.sizeUsd }));
    levels = [...userBids, ...houseBidLevels(db)].sort(
      (a, b) => b.price - a.price || (a.kind === "user" ? -1 : 1)
    );
  }

  // Dry-run the walk so we can verify funds before mutating anything.
  type PlannedFill = { level: MatchLevel; qty: number };
  const planned: PlannedFill[] = [];
  let remaining = size;
  for (const level of levels) {
    if (remaining <= 0) break;
    const crosses = opts.side === "buy" ? level.price <= limit : level.price >= limit;
    if (!crosses) break;
    const qty = Math.min(remaining, round2(level.sizeUsd));
    if (qty <= 0) continue;
    planned.push({ level, qty });
    remaining = round2(remaining - qty);
  }

  const notional = round2(planned.reduce((s, f) => s + f.qty * f.level.price, 0));
  const fee = round2(notional * (feeBps / 10000));
  const restSize = type === "limit" ? remaining : 0;

  if (opts.side === "buy") {
    const restEscrow = round2(restSize * limit);
    const needed = round2(notional + fee + restEscrow);
    const available = round2((account.usdc || 0) + (account.usdg || 0));
    if (needed > available) {
      return fail(
        `Need $${needed.toFixed(2)} (fills $${notional.toFixed(2)} + fee $${fee.toFixed(2)}${
          restEscrow > 0 ? ` + resting escrow $${restEscrow.toFixed(2)}` : ""
        }) but you have $${available.toFixed(2)}. Deposit on Billing first.`
      );
    }
  } else {
    if (size > account.credits) {
      return fail(
        `Selling $${size.toFixed(2)} face needs that much in credits — you have $${account.credits.toFixed(2)}.`
      );
    }
  }

  // Commit fills.
  const fills: MarketFill[] = [];
  for (const { level, qty } of planned) {
    const legNotional = round2(qty * level.price);
    if (opts.side === "buy") {
      spendFromBalances(account, legNotional);
      account.credits = round2(account.credits + qty);
      if (level.kind === "user") {
        const maker = await getOrCreateAccount(level.order.userId);
        maker.usdc = round2(maker.usdc + legNotional);
        level.order.sizeUsd = round2(level.order.sizeUsd - qty);
        pushHistory(maker, {
          kind: "market",
          description: `Ask filled: sold $${qty.toFixed(2)} credits @ ${level.price.toFixed(4)}`,
          amount: `+$${legNotional.toFixed(2)}`,
          resource: `Order ${level.order.id}`,
          method: "market",
        });
        maker.updatedAt = new Date().toISOString();
      } else if (level.kind === "house-ask") {
        const band = db.liquidity.find((b) => b.id === level.bandId);
        if (band) band.availableUsd = round2(Math.max(0, band.availableUsd - qty));
      }
      pushTape(db, level.price, qty, "buy", opts.wallet);
    } else {
      account.credits = round2(account.credits - qty);
      if (level.kind === "user") {
        const maker = await getOrCreateAccount(level.order.userId);
        // Maker escrowed price*size at placement; deliver the face now.
        maker.credits = round2(maker.credits + qty);
        level.order.sizeUsd = round2(level.order.sizeUsd - qty);
        pushHistory(maker, {
          kind: "market",
          description: `Bid filled: bought $${qty.toFixed(2)} credits @ ${level.price.toFixed(4)}`,
          amount: `+$${qty.toFixed(2)}`,
          resource: `Order ${level.order.id}`,
          method: "market",
        });
        maker.updatedAt = new Date().toISOString();
      } else if (level.kind === "house-bid") {
        db.houseBidPoolUsd = round2(Math.max(0, (db.houseBidPoolUsd ?? 0) - legNotional));
        // Recycle bought-back face into the deepest-discount band.
        const deepest = [...db.liquidity].sort((a, b) => b.discountBps - a.discountBps)[0];
        if (deepest) deepest.availableUsd = round2(deepest.availableUsd + qty);
      }
      pushTape(db, level.price, qty, "sell", opts.wallet);
    }
    fills.push({ price: level.price, sizeUsd: qty, maker: level.kind === "user" ? "user" : "house" });
  }

  // Settle taker fee / proceeds.
  const filled = round2(planned.reduce((s, f) => s + f.qty, 0));
  if (opts.side === "buy") {
    if (fee > 0) spendFromBalances(account, fee);
  } else if (filled > 0) {
    account.usdc = round2(account.usdc + round2(notional - fee));
  }

  // Drop fully-filled maker orders.
  db.marketOrders = openOrders(db).filter((o) => o.sizeUsd > 0.009);

  // Rest the remainder (limit orders only), escrowing funds.
  let resting: MarketOrder | null = null;
  if (type === "limit" && restSize >= MARKET_MIN_ORDER_USD) {
    if (opts.side === "buy") {
      spendFromBalances(account, round2(restSize * limit));
    } else {
      account.credits = round2(account.credits - restSize);
    }
    resting = {
      id: `ord_${randomUUID().slice(0, 10)}`,
      userId,
      side: opts.side,
      price: limit,
      sizeUsd: restSize,
      originalUsd: size,
      createdAt: new Date().toISOString(),
    };
    db.marketOrders = [...openOrders(db), resting];
  }

  if (filled > 0 || resting) {
    const avg = filled > 0 ? round4(notional / filled) : null;
    pushHistory(account, {
      kind: "market",
      description:
        opts.side === "buy"
          ? `Buy ${type}: filled $${filled.toFixed(2)}${avg ? ` @ ${avg.toFixed(4)}` : ""}${
              resting ? `, $${resting.sizeUsd.toFixed(2)} resting @ ${limit.toFixed(4)}` : ""
            }`
          : `Sell ${type}: filled $${filled.toFixed(2)}${avg ? ` @ ${avg.toFixed(4)}` : ""}${
              resting ? `, $${resting.sizeUsd.toFixed(2)} resting @ ${limit.toFixed(4)}` : ""
            }`,
      amount:
        opts.side === "buy"
          ? `-$${round2(notional + fee).toFixed(2)} → +$${filled.toFixed(2)}`
          : `-$${filled.toFixed(2)} → +$${round2(notional - fee).toFixed(2)}`,
      resource: fee > 0 ? `Taker fee $${fee.toFixed(2)}` : undefined,
      method: "market",
    });
  }

  account.updatedAt = new Date().toISOString();
  if (filled > 0) {
    recordTradeStats(db, filled, fee);
  }
  await saveDb();
  return {
    ok: true,
    filledUsd: filled,
    avgPrice: filled > 0 ? round4(notional / filled) : null,
    notionalUsd: notional,
    feeUsd: filled > 0 ? fee : 0,
    fills,
    restingOrder: resting
      ? { id: resting.id, side: resting.side, price: resting.price, sizeUsd: resting.sizeUsd }
      : null,
    credits: account.credits,
    usdc: account.usdc,
  };
}

export async function cancelMarketOrder(userId: string, orderId: string) {
  return withLedger(() => cancelMarketOrderInner(userId, orderId));
}

async function cancelMarketOrderInner(userId: string, orderId: string) {
  const db = await ensureDb();
  const account = await getOrCreateAccount(userId);
  const order = openOrders(db).find((o) => o.id === orderId && o.userId === userId);
  if (!order) return { ok: false as const, error: "Order not found." };
  // Refund escrow: buy escrowed price*size in cash; sell escrowed face credits.
  if (order.side === "buy") {
    account.usdc = round2(account.usdc + round2(order.sizeUsd * order.price));
  } else {
    account.credits = round2(account.credits + order.sizeUsd);
  }
  db.marketOrders = openOrders(db).filter((o) => o.id !== orderId);
  pushHistory(account, {
    kind: "market",
    description: `Cancelled ${order.side} $${order.sizeUsd.toFixed(2)} @ ${order.price.toFixed(4)}`,
    amount:
      order.side === "buy"
        ? `+$${round2(order.sizeUsd * order.price).toFixed(2)}`
        : `+$${order.sizeUsd.toFixed(2)}`,
    resource: "Escrow refund",
    method: "market",
  });
  account.updatedAt = new Date().toISOString();
  await saveDb();
  return { ok: true as const, credits: account.credits, usdc: account.usdc };
}

export type MarketBookLevel = {
  id: string;
  price: number;
  discountBps: number;
  sizeUsd: number;
  totalUsd: number;
  bandId: string;
  side: "ask" | "bid";
};

/** Live order book: real user orders merged with house liquidity. */
export async function getMarketState(userId?: string) {
  const db = await ensureDb();
  const orders = openOrders(db);

  const aggregate = (side: "ask" | "bid") => {
    const byPrice = new Map<number, { sizeUsd: number; house: boolean }>();
    for (const o of orders) {
      if ((side === "ask") !== (o.side === "sell")) continue;
      const cur = byPrice.get(o.price) || { sizeUsd: 0, house: false };
      cur.sizeUsd = round2(cur.sizeUsd + o.sizeUsd);
      byPrice.set(o.price, cur);
    }
    if (side === "ask") {
      for (const h of houseAskLevels(db)) {
        const cur = byPrice.get(h.price) || { sizeUsd: 0, house: false };
        cur.sizeUsd = round2(cur.sizeUsd + h.sizeUsd);
        cur.house = true;
        byPrice.set(h.price, cur);
      }
    } else {
      for (const h of houseBidLevels(db)) {
        const cur = byPrice.get(h.price) || { sizeUsd: 0, house: false };
        cur.sizeUsd = round2(cur.sizeUsd + h.sizeUsd);
        cur.house = true;
        byPrice.set(h.price, cur);
      }
    }
    const sorted = [...byPrice.entries()].sort((a, b) =>
      side === "ask" ? a[0] - b[0] : b[0] - a[0]
    );
    let run = 0;
    return sorted.map(([price, v], i): MarketBookLevel => {
      run = round2(run + v.sizeUsd);
      return {
        id: `${side}-${i}-${price}`,
        price,
        discountBps: Math.max(0, Math.round((1 - price) * 10000)),
        sizeUsd: v.sizeUsd,
        totalUsd: run,
        bandId: v.house ? "house" : "open",
        side,
      };
    });
  };

  const asks = aggregate("ask");
  const bids = aggregate("bid");
  const bestAsk = asks[0]?.price ?? null;
  const bestBid = bids[0]?.price ?? null;
  const mid =
    bestAsk != null && bestBid != null ? round4((bestAsk + bestBid) / 2) : bestAsk ?? bestBid;
  const spread = bestAsk != null && bestBid != null ? round4(Math.max(0, bestAsk - bestBid)) : null;
  const realTape = (db.marketTape || []).filter((t) => !isSeedTapeId(t.id));
  const tape = (realTape.length ? realTape : db.marketTape || []).slice(0, 24);
  const network = computeLabNetworkStats(db);

  return {
    book: {
      pair: "Credits · USDC",
      asks,
      bids,
      mid,
      spread,
      bestAsk,
      bestBid,
      depthAsk: round2(asks.reduce((s, l) => s + l.sizeUsd, 0)),
      depthBid: round2(bids.reduce((s, l) => s + l.sizeUsd, 0)),
      tape,
      updatedAt: new Date().toISOString(),
    },
    volume24hUsd: network.volume24hUsd,
    stats: {
      volumeUsd: network.volumeUsd,
      volume24hUsd: network.volume24hUsd,
      feesUsd: network.feesUsd,
      requests: network.requests,
      depositsSettledUsd: network.depositsSettledUsd,
      activeAccounts: network.activeAccounts,
      computeVolumeUsd: network.computeVolumeUsd,
    },
    config: {
      feeBps: marketTakerFeeBps(),
      minPrice: MARKET_MIN_PRICE,
      maxPrice: MARKET_MAX_PRICE,
      minOrderUsd: MARKET_MIN_ORDER_USD,
      maxOrderUsd: MARKET_MAX_ORDER_USD,
      houseBidPoolUsd: round2(db.houseBidPoolUsd ?? 0),
    },
    myOrders: userId
      ? orders
          .filter((o) => o.userId === userId)
          .map((o) => ({
            id: o.id,
            side: o.side,
            price: o.price,
            sizeUsd: o.sizeUsd,
            originalUsd: o.originalUsd,
            createdAt: o.createdAt,
          }))
      : [],
  };
}

// ────────────────────────────────────────────────────────────────
// Earn: $OLORA holders accrue inference credits continuously,
// time-weighted by balance. Pool is funded from fee revenue.
// ────────────────────────────────────────────────────────────────

function ensureEarn(db: AccountsDb): EarnLedger {
  if (!db.earn) db.earn = emptyEarn();
  return db.earn;
}

/** userIds with gateway usage in the last `days` (for the payout boost). */
function activeUserIds(db: AccountsDb, days = 7): Set<string> {
  const cutoff = Date.now() - days * 24 * 3600_000;
  const out = new Set<string>();
  for (const account of Object.values(db.accounts)) {
    if (account.usage.some((u) => new Date(u.at).getTime() >= cutoff)) {
      out.add(account.userId);
    }
  }
  return out;
}

/**
 * Advance the accrual clock using a fresh holder snapshot.
 * Time-weighted: each tick distributes rate × elapsed hours proportional
 * to current balances (piecewise integration — no snapshot windows to game).
 */
export async function earnTick(
  holders: { address: string; balance: number }[],
  opts: { floorTokens: number; dripPctPerHour: number }
): Promise<{ distributedUsd: number; eligibleHolders: number }> {
  return withLedger(() => earnTickInner(holders, opts));
}

async function earnTickInner(
  holders: { address: string; balance: number }[],
  opts: { floorTokens: number; dripPctPerHour: number }
): Promise<{ distributedUsd: number; eligibleHolders: number }> {
  const db = await ensureDb();
  const earn = ensureEarn(db);
  const now = Date.now();

  if (!earn.lastTickAt) {
    // First observation: start the clock, nothing to distribute yet.
    earn.lastTickAt = new Date(now).toISOString();
    for (const h of holders) {
      const w = earn.wallets[h.address] || { accruedUsd: 0, claimedUsd: 0, lastBalance: 0 };
      w.lastBalance = h.balance;
      earn.wallets[h.address] = w;
    }
    await saveDb();
    return { distributedUsd: 0, eligibleHolders: 0 };
  }

  const dtHours = Math.min(
    EARN_MAX_TICK_HOURS,
    Math.max(0, (now - new Date(earn.lastTickAt).getTime()) / 3600_000)
  );
  earn.lastTickAt = new Date(now).toISOString();

  const eligible = holders.filter((h) => h.balance >= opts.floorTokens);
  // Compound decay: pool × (1 − (1 − pct)^hours), so long gaps don't overdrain.
  const dripFraction = 1 - Math.pow(1 - opts.dripPctPerHour / 100, dtHours);
  const budget = round2(Math.min(earn.poolUsd, earn.poolUsd * dripFraction));
  if (eligible.length === 0 || budget <= 0 || dtHours <= 0) {
    await saveDb();
    return { distributedUsd: 0, eligibleHolders: eligible.length };
  }

  const active = activeUserIds(db);
  const links = db.walletLinks || {};
  const weightOf = (h: { address: string; balance: number }) => {
    const linkedUser = links[h.address];
    const boost = linkedUser && active.has(linkedUser) ? EARN_USAGE_BOOST : 1;
    return h.balance * boost;
  };
  const totalWeight = eligible.reduce((s, h) => s + weightOf(h), 0);
  if (totalWeight <= 0) {
    await saveDb();
    return { distributedUsd: 0, eligibleHolders: eligible.length };
  }

  let distributed = 0;
  for (const h of eligible) {
    const share = round2((budget * weightOf(h)) / totalWeight);
    if (share <= 0) continue;
    const w = earn.wallets[h.address] || { accruedUsd: 0, claimedUsd: 0, lastBalance: 0 };
    w.accruedUsd = round2(w.accruedUsd + share);
    w.lastBalance = h.balance;
    earn.wallets[h.address] = w;
    distributed = round2(distributed + share);
  }
  earn.poolUsd = round2(Math.max(0, earn.poolUsd - distributed));
  earn.totalAccruedUsd = round2(earn.totalAccruedUsd + distributed);
  await saveDb();
  return { distributedUsd: distributed, eligibleHolders: eligible.length };
}

/** Public earn stats plus the caller's accruals across their linked wallets. */
export async function getEarnState(userWallets: string[] = [], floorTokens = 0) {
  const db = await ensureDb();
  const earn = ensureEarn(db);
  const mine = userWallets.map((w) => w.toLowerCase());
  let myAccruedUsd = 0;
  let myClaimedUsd = 0;
  let myBalanceTokens = 0;
  for (const w of mine) {
    const s = earn.wallets[w];
    if (!s) continue;
    myAccruedUsd = round2(myAccruedUsd + s.accruedUsd);
    myClaimedUsd = round2(myClaimedUsd + s.claimedUsd);
    myBalanceTokens += s.lastBalance || 0;
  }
  // Eligible supply from the last holder snapshot: the denominator of every share.
  const eligible = Object.values(earn.wallets).filter((w) => (w.lastBalance || 0) >= floorTokens && (w.lastBalance || 0) > 0);
  const eligibleSupply = eligible.reduce((s, w) => s + (w.lastBalance || 0), 0);
  const unclaimedUsd = round2(
    Object.values(earn.wallets).reduce((s, w) => s + w.accruedUsd, 0)
  );
  // Liability = every spendable credit in accounts + accrued-but-unclaimed.
  const accountCreditsUsd = round2(
    Object.values(db.accounts).reduce((s, a) => s + Math.max(0, a.credits), 0)
  );
  return {
    poolUsd: round2(earn.poolUsd),
    totalAccruedUsd: round2(earn.totalAccruedUsd),
    totalClaimedUsd: round2(earn.totalClaimedUsd),
    unclaimedUsd,
    lastTickAt: earn.lastTickAt,
    walletsTracked: Object.keys(earn.wallets).length,
    creditsOutstandingUsd: round2(accountCreditsUsd + unclaimedUsd),
    feeRevenueUsd: round2(earn.feeRevenueUsd ?? 0),
    myAccruedUsd,
    myClaimedUsd,
    myBalanceTokens,
    eligibleSupply,
    eligibleHolders: eligible.length,
  };
}

/** Move a user's accrued earnings (across verified wallets) into credits. */
export async function claimEarn(userId: string, wallets: string[]) {
  return withLedger(() => claimEarnInner(userId, wallets));
}

async function claimEarnInner(userId: string, wallets: string[]) {
  const db = await ensureDb();
  const earn = ensureEarn(db);
  const account = await getOrCreateAccount(userId);
  if (!db.walletLinks) db.walletLinks = {};

  let claim = 0;
  for (const raw of wallets) {
    const wallet = raw.toLowerCase();
    const s = earn.wallets[wallet];
    db.walletLinks[wallet] = userId;
    if (!s || s.accruedUsd <= 0) continue;
    claim = round2(claim + s.accruedUsd);
    s.claimedUsd = round2(s.claimedUsd + s.accruedUsd);
    s.accruedUsd = 0;
  }
  if (claim <= 0) {
    await saveDb();
    return { ok: false as const, error: "Nothing to claim yet.", credits: account.credits };
  }
  account.credits = round2(account.credits + claim);
  earn.totalClaimedUsd = round2(earn.totalClaimedUsd + claim);
  pushHistory(account, {
    kind: "earn",
    description: `Holder rewards claimed ($OLORA)`,
    amount: `+$${claim.toFixed(2)}`,
    resource: `${wallets.length} wallet${wallets.length === 1 ? "" : "s"}`,
    method: "earn",
  });
  account.updatedAt = new Date().toISOString();
  await saveDb();
  return { ok: true as const, claimedUsd: claim, credits: account.credits };
}

/** Ledger access for sibling modules (agents). */
export async function ledgerRead(opts: { fresh?: boolean } = {}) {
  if (opts.fresh) store.freshUntil = 0;
  return ensureDb();
}

export async function ledgerSave() {
  await saveDb();
}

export function ledgerPushHistory(
  account: AccountRecord,
  row: Omit<BillingHistoryRow, "id" | "date">
) {
  pushHistory(account, row);
}

export function ledgerRound2(n: number) {
  return round2(n);
}

/** Add fee revenue to the payout pool (operator action). */
export async function fundEarnPool(usd: number) {
  return withLedger(async () => {
    const db = await ensureDb();
    const earn = ensureEarn(db);
    earn.poolUsd = round2(earn.poolUsd + Math.max(0, usd));
    await saveDb();
    return { poolUsd: earn.poolUsd };
  });
}

/**
 * Count new fee-wallet inflows and route a share into the reward pool.
 * Idempotent: each tx hash is credited exactly once.
 */
export async function processFeeInbounds(
  inbounds: { txHash: string; amountUsd: number }[],
  shareBps: number
): Promise<{ newTxs: number; addedToPoolUsd: number }> {
  if (inbounds.length === 0) return { newTxs: 0, addedToPoolUsd: 0 };
  return withLedger(async () => {
    const db = await ensureDb();
    const earn = ensureEarn(db);
    if (!earn.feeTxs) earn.feeTxs = {};

    let added = 0;
    let count = 0;
    for (const t of inbounds) {
      const tx = t.txHash.toLowerCase();
      if (earn.feeTxs[tx] != null) continue;
      const share = round2(Math.max(0, t.amountUsd) * (shareBps / 10000));
      earn.feeTxs[tx] = share;
      earn.feeRevenueUsd = round2((earn.feeRevenueUsd ?? 0) + Math.max(0, t.amountUsd));
      added = round2(added + share);
      count++;
    }
    if (count > 0) {
      earn.poolUsd = round2(earn.poolUsd + added);
      await saveDb();
    }
    return { newTxs: count, addedToPoolUsd: added };
  });
}
