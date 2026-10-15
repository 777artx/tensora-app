#!/usr/bin/env -S npx -y tsx
/**
 * Order-book stress harness for Olora.
 *
 * Drives real transactions through the production matching engine
 * (`src/lib/lab/account-store.ts`) and measures how those fills land on the
 * dashboard feed: `networkStats` -> `computeLabNetworkStats` -> `/api/lab/market`
 * -> `LiveOnTensora` KPI cards.
 *
 * Modes
 *   --dry              (default) isolated local ledger under .tmp/ — cannot touch prod
 *   --live             production ledger (Upstash Redis, else Vercel Blob)
 *                      requires --yes; snapshots before and restores after the run
 *                      unless you also pass --keep
 *
 * Flags
 *   --yes              confirm live writes
 *   --keep             leave stress mutations in the ledger so the dashboard shows them
 *   --load-only        worker mode: skip snapshot/restore + correctness suite, just place orders
 *   --json             machine-readable summary only
 *   --multiproc N      spawn N concurrent load-only processes to expose cross-process
 *                      lost updates in the counter feed (mirrors Vercel multi-instance)
 *   --env FILE         env file to load in live mode (default: .env.local)
 *
 * Sizing (env vars)
 *   STRESS_ACCOUNTS         virtual traders to provision        (default 8)
 *   STRESS_ORDERS_PER_ACCT  orders per trader                   (default 20)
 *   STRESS_CONCURRENCY      in-flight orders                    (default 5)
 *   STRESS_MIN_USD          min order face                      (default 2)
 *   STRESS_MAX_USD          max order face                      (default 25)
 *   STRESS_LIMIT_RATIO      share of orders that are limit      (default 0.35)
 *   STRESS_SEED             RNG seed for reproducibility        (default 20261014)
 */

import { spawn } from "child_process";
import { createHash, randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

// ────────────────────────────────────────────────────────────────
// args + env
// ────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(f);
const flagValue = (f: string) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};

const MODE_LIVE = has("--live");
const CONFIRMED = has("--yes");
const KEEP = has("--keep");
const LOAD_ONLY = has("--load-only");
const JSON_ONLY = has("--json");
const RESTORE_FILE = flagValue("--restore");
const MULTIPROC = Math.max(0, Number(flagValue("--multiproc") ?? 0) || 0);
const ENV_FILE = flagValue("--env") ?? ".env.local";

const num = (k: string, d: number) => {
  const v = Number(process.env[k]);
  return Number.isFinite(v) && v > 0 ? v : d;
};
const CFG = {
  accounts: Math.round(num("STRESS_ACCOUNTS", 8)),
  ordersPerAccount: Math.round(num("STRESS_ORDERS_PER_ACCT", 20)),
  concurrency: Math.round(num("STRESS_CONCURRENCY", 5)),
  minUsd: num("STRESS_MIN_USD", 2),
  maxUsd: num("STRESS_MAX_USD", 25),
  limitRatio: num("STRESS_LIMIT_RATIO", 0.35),
  seed: Math.round(num("STRESS_SEED", 20_261_014)),
};

const LEDGER_KEY = "lab:accounts-db";
const BLOB_PATH = "lab/accounts-db.json";

/** Absolute, captured before configureBackend() chdir's into a scratch dir. */
const SCRIPT_PATH = path.resolve(process.argv[1]);

function parseEnvFile(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    let k = t.slice(0, i).trim();
    if (k.startsWith("export ")) k = k.slice(7).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

/** Make the process pick the same backend the web app would. */
async function configureBackend() {
  if (!MODE_LIVE) {
    process.env.BLOB_READ_WRITE_TOKEN = "";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    // A shared scratch dir lets concurrent load-only children write the same ledger,
    // which is what exposes cross-process contention.
    const scratch = process.env.STRESS_SCRATCH || path.join(".tmp", `stress-${Date.now().toString(36)}`);
    await fs.mkdir(scratch, { recursive: true });
    process.chdir(scratch);
    return { backend: "local" as const, detail: process.cwd() };
  }

  const file = path.isAbsolute(ENV_FILE) ? ENV_FILE : path.join(process.cwd(), ENV_FILE);
  let loaded = 0;
  try {
    const vars = parseEnvFile(await fs.readFile(file, "utf8"));
    for (const [k, v] of Object.entries(vars)) {
      if (process.env[k] === undefined) {
        process.env[k] = v;
        loaded++;
      }
    }
  } catch {
    // no env file — fall back to whatever is already in the environment
  }

  const cfg = redisConfig();
  if (cfg) return { backend: "redis" as const, detail: `${cfg.url} · ${loaded} vars from ${path.basename(file)}` };
  if ((process.env.BLOB_READ_WRITE_TOKEN || "").trim())
    return { backend: "blob" as const, detail: `vercel blob · ${loaded} vars from ${path.basename(file)}` };
  return { backend: "local" as const, detail: `no remote store configured · ${loaded} vars from ${path.basename(file)}` };
}

function redisConfig(): { url: string; token: string } | null {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "")
    .trim()
    .replace(/\/$/, "");
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "").trim();
  return url && token ? { url, token } : null;
}

async function redisCmd(args: string[]): Promise<unknown> {
  const cfg = redisConfig();
  if (!cfg) throw new Error("redis not configured");
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const data = (await res.json().catch(() => null)) as { result?: unknown; error?: string } | null;
  if (!res.ok || !data || data.error) throw new Error(data?.error || `ledger request failed (${res.status})`);
  return data.result;
}

// ────────────────────────────────────────────────────────────────
// raw ledger snapshot / restore (independent of the engine)
// ────────────────────────────────────────────────────────────────

type RawLedger = { raw: string | null; via: "redis" | "blob" | "local" | "none" };

async function readRawLedger(): Promise<RawLedger> {
  if (redisConfig()) {
    const raw = await redisCmd(["GET", LEDGER_KEY]);
    return { raw: typeof raw === "string" && raw ? raw : null, via: "redis" };
  }
  if ((process.env.BLOB_READ_WRITE_TOKEN || "").trim()) {
    const { get } = await import("@vercel/blob");
    const r = await get(BLOB_PATH, { access: "private", useCache: false });
    if (!r || r.statusCode !== 200 || !r.stream) return { raw: null, via: "blob" };
    return { raw: await new Response(r.stream).text(), via: "blob" };
  }
  try {
    return { raw: await fs.readFile(path.join(process.cwd(), ".data", "lab-accounts.json"), "utf8"), via: "local" };
  } catch {
    return { raw: null, via: "none" };
  }
}

async function writeRawLedger(raw: string, via: RawLedger["via"]) {
  if (via === "redis") {
    await redisCmd(["SET", LEDGER_KEY, raw]);
    return;
  }
  if (via === "blob") {
    const { put } = await import("@vercel/blob");
    await put(BLOB_PATH, raw, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return;
  }
  const dir = path.join(process.cwd(), ".data");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "lab-accounts.json"), raw);
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

/** Read the persisted counters straight out of a ledger JSON document. */
function statsFromJson(raw: string | null) {
  try {
    const db = JSON.parse(raw || "{}") as {
      networkStats?: { volumeUsd?: number; feesUsd?: number; requests?: number };
    };
    return {
      volumeUsd: Number(db.networkStats?.volumeUsd) || 0,
      feesUsd: Number(db.networkStats?.feesUsd) || 0,
      requests: Number(db.networkStats?.requests) || 0,
    };
  } catch {
    return { volumeUsd: 0, feesUsd: 0, requests: 0 };
  }
}

const countStatsInRaw = (led: RawLedger) => statsFromJson(led.raw);

/** Read counters from a ledger file, tolerating a torn concurrent write. */
async function statsFromFile(file: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const raw = await fs.readFile(file, "utf8");
      const parsed = JSON.parse(raw) as { networkStats?: { volumeUsd?: number } };
      return {
        volumeUsd: Number(parsed.networkStats?.volumeUsd) || 0,
        feesUsd: Number(parsed.networkStats?.feesUsd) || 0,
        requests: Number(parsed.networkStats?.requests) || 0,
      };
    } catch {
      await new Promise((r) => setTimeout(r, 60));
    }
  }
  return { volumeUsd: 0, feesUsd: 0, requests: 0 };
}

// ────────────────────────────────────────────────────────────────
// helpers
// ────────────────────────────────────────────────────────────────

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function percentile(arr: number[], p: number) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[i];
}

const approx = (a: number, b: number, eps = 0.02) => Math.abs(a - b) <= eps;
const money = (n: number) => `$${(Math.round(n * 100) / 100).toFixed(2)}`;

/** Deterministic 32-byte tx hash per run/user so re-runs never collide. */
function stressTx(runId: string, seed: string) {
  return `0x${createHash("sha256").update(`${runId}:${seed}`).digest("hex")}`;
}

async function pool<T>(items: T[], limit: number, fn: (item: T, i: number) => Promise<void>) {
  let idx = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const i = idx++;
      if (i >= items.length) return;
      await fn(items[i], i);
    }
  });
  await Promise.all(workers);
}

// ────────────────────────────────────────────────────────────────
// load plan
// ────────────────────────────────────────────────────────────────

type PlannedOrder = {
  userId: string;
  side: "buy" | "sell";
  type: "limit" | "market";
  sizeUsd: number;
  price?: number;
};

function buildPlan(runId: string, accounts: number, perAccount: number, book: { bestAsk: number | null; bestBid: number | null }): PlannedOrder[] {
  const rng = makeRng(CFG.seed);
  const ask = book.bestAsk ?? 0.92;
  const bid = book.bestBid ?? Math.round((ask - 0.01) * 10000) / 10000;
  const TICK = 0.0005;
  const r4 = (n: number) => Math.round(n * 10000) / 10000;
  const plan: PlannedOrder[] = [];
  for (let a = 0; a < accounts; a++) {
    const userId = `stress-${runId}-${a}`;
    for (let i = 0; i < perAccount; i++) {
      const side: "buy" | "sell" = rng() < 0.54 ? "buy" : "sell";
      const sizeUsd = Math.round((CFG.minUsd + rng() * (CFG.maxUsd - CFG.minUsd)) * 100) / 100;
      const isLimit = CFG.limitRatio > 0 && rng() < CFG.limitRatio;
      if (!isLimit) {
        plan.push({ userId, side, type: "market", sizeUsd });
        continue;
      }
      // Real makers either cross, improve the touch (inside the spread → they become
      // the best bid/ask and get hit by later flow), or queue behind. Inside-spread
      // quoting is what produces genuine user-to-user maker/taker flow.
      const roll = rng();
      let px: number;
      if (roll < 0.25) {
        px = side === "buy" ? ask : bid; // crossing
      } else if (roll < 0.7) {
        const inside = TICK * (1 + Math.floor(rng() * 4)); // 1–4 ticks inside
        px = side === "buy" ? Math.min(ask - TICK, bid + inside) : Math.max(bid + TICK, ask - inside);
      } else {
        px = side === "buy" ? bid - TICK * (1 + Math.floor(rng() * 6)) : ask + TICK * (1 + Math.floor(rng() * 6));
      }
      px = r4(Math.min(1, Math.max(0.8, px)));
      plan.push({ userId, side, type: "limit", sizeUsd, price: px });
    }
  }
  return plan;
}

type LoadStats = {
  attempted: number;
  ok: number;
  failed: number;
  fillLegs: number;
  filledUsd: number;
  notionalUsd: number;
  feeUsd: number;
  resting: number;
  makerUserLegs: number;
  houseLegs: number;
  latencyMs: number[];
  errors: Record<string, number>;
};

function emptyLoadStats(): LoadStats {
  return {
    attempted: 0,
    ok: 0,
    failed: 0,
    fillLegs: 0,
    filledUsd: 0,
    notionalUsd: 0,
    feeUsd: 0,
    resting: 0,
    makerUserLegs: 0,
    houseLegs: 0,
    latencyMs: [],
    errors: {},
  };
}

// ────────────────────────────────────────────────────────────────
// main
// ────────────────────────────────────────────────────────────────

async function main() {
  const backend = await configureBackend();
  const api = await import("../../src/lib/lab/account-store");
  const { SHOWCASE } = await import("../../src/lib/lab/dashboard-showcase");

  // exactly the dashboard's display formula
  const withOgBaseline = (baseline: number, live: number | null | undefined) =>
    baseline + Math.max(0, Number(live) || 0);

  const runId = process.env.STRESS_RUN_ID || randomUUID().slice(0, 6);

  const out = JSON_ONLY ? () => {} : (...a: unknown[]) => console.log(...a);
  const rule = (t: string) => out(`\n${"─".repeat(4)} ${t} ${"─".repeat(Math.max(4, 62 - t.length))}`);

  out(`\nOlora order-book stress  ·  run ${runId}`);
  out(`mode: ${MODE_LIVE ? "LIVE (production ledger)" : "dry (isolated local ledger)"}`);
  out(`backend: ${backend.backend}  ·  ${backend.detail}`);

  // ── restore-only mode: roll a --keep run back from a backup, no new activity
  if (RESTORE_FILE) {
    const file = path.isAbsolute(RESTORE_FILE)
      ? RESTORE_FILE
      : path.join(process.cwd(), RESTORE_FILE);
    let raw: string;
    try {
      raw = await fs.readFile(file, "utf8");
    } catch (err) {
      console.error(`\nCannot read backup ${file}: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(4);
    }
    const beforeRaw = await readRawLedger();
    const beforeHash = beforeRaw.raw ? sha(beforeRaw.raw) : "empty";
    out(`restoring from: ${file}`);
    out(`current:        sha ${beforeHash}  ·  ${statsFromJson(beforeRaw.raw).volumeUsd} volume`);
    const via: RawLedger["via"] = backend.backend === "local" ? "local" : backend.backend;
    await writeRawLedger(raw, via);
    const afterRaw = await readRawLedger();
    const afterHash = afterRaw.raw ? sha(afterRaw.raw) : "empty";
    const wantHash = sha(raw);
    const ok = afterHash === wantHash;
    out(`restored:       sha ${afterHash}  ·  ${statsFromJson(afterRaw.raw).volumeUsd} volume`);
    out(`\n${ok ? "ok  " : "FAIL"} ledger now matches the backup`);
    if (JSON_ONLY) console.log(JSON.stringify({ mode: "restore", ok, file, beforeHash, afterHash, wantHash }));
    process.exit(ok ? 0 : 1);
  }

  // ── guard: live without confirmation
  if (MODE_LIVE && !CONFIRMED && !LOAD_ONLY) {
    console.error(
      "\nRefusing to touch the production ledger without --yes.\n" +
        "  Inspect first:  npx -y tsx scripts/stress/order-book-stress.mts --dry\n" +
        "  Then run live:  npx -y tsx scripts/stress/order-book-stress.mts --live --yes\n"
    );
    process.exit(2);
  }

  // ── snapshot
  let snapshot: RawLedger = { raw: null, via: backend.backend === "local" ? "local" : backend.backend };
  let snapshotHash = "none";
  if (!LOAD_ONLY) {
    snapshot = await readRawLedger();
    snapshotHash = snapshot.raw ? sha(snapshot.raw) : "empty";
    out(`snapshot: ${snapshot.via}  ·  ${snapshot.raw ? `${(snapshot.raw.length / 1024).toFixed(1)} KB  ·  sha ${snapshotHash}` : "no ledger found"}`);
    if (MODE_LIVE && snapshot.via === "none") {
      console.error("\nNo production ledger found at the expected location — aborting rather than creating one.");
      process.exit(3);
    }
    if (MODE_LIVE && !KEEP) {
      const dir = path.join(process.cwd(), ".tmp", "stress");
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, `ledger-${runId}.json.bak`), snapshot.raw ?? "null");
      out(`backup:  .tmp/stress/ledger-${runId}.json.bak`);
    }
  }

  // ── baseline
  const before = await api.getMarketState();  const beforeStats = before.stats;
  const beforeBands = { ...before.config };
  out(
    `baseline: ask ${before.book.bestAsk ?? "—"}  bid ${before.book.bestBid ?? "—"}  ` +
      `depth ${money(before.book.depthAsk)}/${money(before.book.depthBid)}  ` +
      `pool ${money(before.config.houseBidPoolUsd)}  volume ${money(beforeStats.volumeUsd)}  fees ${money(beforeStats.feesUsd)}`
  );

  const load = emptyLoadStats();
  const checks: { label: string; ok: boolean; detail?: string }[] = [];
  const check = (label: string, ok: boolean, detail?: string) => {
    checks.push({ label, ok, detail });
    out(`  ${ok ? "ok  " : "FAIL"} ${label}${!ok && detail ? `  → ${detail}` : ""}`);
  };

  let mutatedRaw: string | null = null;

  // ── correctness suite (relative assertions — works against a live ledger)
  let suiteVolume = 0;
  let suiteFees = 0;
  if (!LOAD_ONLY) {
    rule("1. Matching semantics");
    const A = `stress-${runId}-a`;
    const B = `stress-${runId}-b`;
    // Fund through the real money paths: USDC for buys, credits for sells.
    await api.claimOnChainDeposit(A, {
      method: "usdc",
      amountUsd: 500,
      txHash: stressTx(runId, `${A}-usdc`),
      token: "USDC",
      from: `0x${"a".repeat(40)}`,
      chain: "base",
    });
    await api.creditCredits(A, 500, { kind: "seed", description: "stress funding" });
    await api.claimOnChainDeposit(B, {
      method: "usdc",
      amountUsd: 500,
      txHash: stressTx(runId, `${B}-usdc`),
      token: "USDC",
      from: `0x${"b".repeat(40)}`,
      chain: "base",
    });
    await api.creditCredits(B, 500, { kind: "seed", description: "stress funding" });

    const s0 = await api.getMarketState(A);
    const ask0 = s0.book.bestAsk;
    const bid0 = s0.book.bestBid;

    // market buy
    const buy = await api.placeMarketOrder(A, { side: "buy", sizeUsd: 10, type: "market" });
    if (buy.ok) {
      suiteVolume += buy.filledUsd;
      suiteFees += buy.feeUsd;
      check("market buy fills at the touch", approx(buy.avgPrice ?? 0, ask0 ?? 0, 0.0006), `${buy.avgPrice} vs ${ask0}`);
      check("taker fee is 1% of notional", approx(buy.feeUsd, buy.notionalUsd * 0.01, 0.02), `${buy.feeUsd}`);
      check("credits credited = filled face", approx(buy.credits, 500 + buy.filledUsd, 0.02), `${buy.credits}`);
      check("cash debited = notional + fee", approx(buy.usdc, 500 - buy.notionalUsd - buy.feeUsd, 0.03), `${buy.usdc}`);
    } else {
      check("market buy accepted", false, buy.error);
    }

    const s1 = await api.getMarketState(A);
    check("best ask does not fall after a buy", (s1.book.bestAsk ?? 0) >= (ask0 ?? 0) - 1e-9, `${s1.book.bestAsk} vs ${ask0}`);
    check("book stays two-sided with a sane spread", s1.book.bestBid != null && s1.book.bestAsk != null && (s1.book.spread ?? 9) <= 0.03, `spread ${s1.book.spread}`);

    // resting limit that does not cross: join the best ask
    const restPx = s1.book.bestAsk ?? 0.92;
    const creditsBeforeRest = (await api.getAccountSnapshot(A)).credits;
    const limit = await api.placeMarketOrder(A, { side: "sell", sizeUsd: 12, price: restPx });
    if (limit.ok) {
      check("non-crossing sell rests instead of filling", limit.filledUsd === 0 && Boolean(limit.restingOrder), `filled ${limit.filledUsd}`);
      check("resting sell escrows the full face", approx(limit.credits, creditsBeforeRest - 12, 0.02), `${limit.credits} vs ${creditsBeforeRest - 12}`);
    } else {
      check("resting sell accepted", false, limit.error);
    }
    const s2 = await api.getMarketState(A);
    const mine = s2.myOrders.filter((o) => o.side === "sell");
    check("open order is visible on the book", mine.length > 0, `${mine.length} orders`);
    check("user order becomes the best ask", s2.book.bestAsk === restPx, `${s2.book.bestAsk} vs ${restPx}`);

    // cross it with B — maker must be the user, not the house
    const takerSize = 3;
    const cross = await api.placeMarketOrder(B, { side: "buy", sizeUsd: takerSize, type: "market" });
    if (cross.ok) {
      suiteVolume += cross.filledUsd;
      suiteFees += cross.feeUsd;
      check("counterparty order fills against the user's resting ask", cross.fills[0]?.maker === "user", JSON.stringify(cross.fills[0] ?? null));
      check("maker receives the full proceeds (no maker fee)", approx(cross.notionalUsd, takerSize * restPx, 0.03), `${cross.notionalUsd}`);
    } else {
      check("crossing order accepted", false, cross.error);
    }

    // cancel → exact escrow refund
    const s3 = await api.getMarketState(A);
    const open = s3.myOrders.find((o) => o.side === "sell");
    if (open) {
      const aBefore = await api.getAccountSnapshot(A);
      const cancel = await api.cancelMarketOrder(A, open.id);
      if (cancel.ok) {
        check(
          "cancel refunds escrow exactly",
          approx(cancel.credits, aBefore.credits + open.sizeUsd, 0.02),
          `${cancel.credits} vs ${aBefore.credits + open.sizeUsd}`
        );
      } else {
        check("cancel accepted", false, cancel.error);
      }
    }

    // maker ↔ taker: two user orders crossing each other, no house involvement
    const s4 = await api.getMarketState(A);
    const makerPx = Math.round((s4.book.bestBid ?? 0.9) * 10000) / 10000;
    const makerRest = await api.placeMarketOrder(A, { side: "buy", sizeUsd: 14, price: makerPx });
    const makerOk = makerRest.ok && Boolean(makerRest.restingOrder);
    check("maker bid rests below the touch", makerOk, makerRest.ok ? `resting ${makerRest.restingOrder?.sizeUsd}` : makerRest.error);
    if (makerOk) {
      const makerAcctBefore = await api.getAccountSnapshot(A);
      const taker = await api.placeMarketOrder(B, { side: "sell", sizeUsd: 6, type: "market" });
      if (taker.ok) {
        suiteVolume += taker.filledUsd;
        suiteFees += taker.feeUsd;
        check("taker filled against the resting user bid (not the house)", taker.fills[0]?.maker === "user", JSON.stringify(taker.fills[0] ?? null));
        const makerAcctAfter = await api.getAccountSnapshot(A);
        check(
          "maker received credit face for the filled portion",
          approx(makerAcctAfter.credits, makerAcctBefore.credits + taker.filledUsd, 0.02),
          `${makerAcctAfter.credits} vs ${makerAcctBefore.credits + taker.filledUsd}`
        );
      } else {
        check("crossing sell accepted", false, taker.error);
      }
    }

    // guardrails
    const tooBig = await api.placeMarketOrder(B, { side: "buy", sizeUsd: 5000, price: 0.9 });
    check("rejects size above the cap", !tooBig.ok);
    const broke = await api.placeMarketOrder(B, { side: "sell", sizeUsd: 9000, price: 0.99 });
    check("rejects selling more credits than are held", !broke.ok);
    check("book still has house depth", (await api.getMarketState()).book.asks.length > 0);
  }

  // ── load
  rule("2. Concurrent load");
  const bookForPlan = await api.getMarketState();
  const plan = buildPlan(runId, CFG.accounts, CFG.ordersPerAccount, {
    bestAsk: bookForPlan.book.bestAsk,
    bestBid: bookForPlan.book.bestBid,
  });

  const fund = Math.ceil(CFG.ordersPerAccount * CFG.maxUsd * 1.2) + 100;
  for (let a = 0; a < CFG.accounts; a++) {
    const userId = `stress-${runId}-${a}`;
    await api.claimOnChainDeposit(userId, {
      method: "usdc",
      amountUsd: fund,
      txHash: stressTx(runId, `${userId}-usdc`),
      token: "USDC",
      from: `0x${a.toString(16).padStart(40, "0")}`,
      chain: "base",
    });
    await api.creditCredits(userId, fund, { kind: "seed", description: "stress funding" });
  }
  out(`traders: ${CFG.accounts}  ·  orders: ${plan.length}  ·  concurrency: ${CFG.concurrency}  ·  funded ${money(fund)} each`);

  const t0 = Date.now();
  await pool(plan, CFG.concurrency, async (o) => {
    const start = performance.now();
    load.attempted++;
    try {
      const res = await api.placeMarketOrder(o.userId, {
        side: o.side,
        sizeUsd: o.sizeUsd,
        type: o.type,
        ...(o.type === "limit" ? { price: o.price } : {}),
      });
      if (res.ok) {
        load.ok++;
        load.fillLegs += res.fills.length;
        load.filledUsd += res.filledUsd;
        load.notionalUsd += res.notionalUsd;
        load.feeUsd += res.feeUsd;
        if (res.restingOrder) load.resting++;
        for (const f of res.fills) {
          if (f.maker === "user") load.makerUserLegs++;
          else load.houseLegs++;
        }
      } else {
        load.failed++;
        const key = res.error.replace(/\$[\d.]+\s?/g, "$N ").slice(0, 70);
        load.errors[key] = (load.errors[key] ?? 0) + 1;
      }
    } catch (err) {
      load.failed++;
      const key = `throw: ${(err instanceof Error ? err.message : String(err)).slice(0, 70)}`;
      load.errors[key] = (load.errors[key] ?? 0) + 1;
    } finally {
      load.latencyMs.push(performance.now() - start);
    }
  });
  const wallMs = Date.now() - t0;

  load.filledUsd = Math.round(load.filledUsd * 100) / 100;
  load.notionalUsd = Math.round(load.notionalUsd * 100) / 100;
  load.feeUsd = Math.round(load.feeUsd * 100) / 100;

  out(
    `done in ${(wallMs / 1000).toFixed(1)}s  ·  ${load.ok} ok / ${load.failed} rejected  ·  ` +
      `${load.fillLegs} fill legs (${load.makerUserLegs} user-maker, ${load.houseLegs} house)  ·  ${load.resting} resting`
  );
  out(
    `throughput: ${(load.attempted / (wallMs / 1000)).toFixed(1)} orders/s  ·  latency p50 ${percentile(load.latencyMs, 50).toFixed(0)}ms  ` +
      `p95 ${percentile(load.latencyMs, 95).toFixed(0)}ms  max ${Math.max(...load.latencyMs).toFixed(0)}ms`
  );
  out(
    `routing: ${load.makerUserLegs} legs matched user↔user (house pays no fee)  ·  ${load.houseLegs} legs matched the house book`
  );

  // ── optional multi-process contention
  let multiproc: unknown = null;
  if (MULTIPROC > 0 && !LOAD_ONLY) {
    rule(`3. Cross-process contention (${MULTIPROC} concurrent writers)`);
    if (KEEP) mutatedRaw = (await readRawLedger()).raw;
    const scratchDir = path.join(process.cwd(), "multi");
    await fs.rm(scratchDir, { recursive: true, force: true });
    await fs.mkdir(scratchDir, { recursive: true });
    // Fresh scratch dir: the children seed a new ledger there, so its counters start
    // at 0 and every dollar in them came from concurrent child traffic.
    const childLedger = path.join(scratchDir, ".data", "lab-accounts.json");
    const children = await Promise.all(
      Array.from({ length: MULTIPROC }, (_, i) => runChild(i, scratchDir, `${runId}m${i}`))
    );
    const childFilled = children.reduce((s, c) => s + (c.filledUsd ?? 0), 0);
    const childOk = children.reduce((s, c) => s + (c.ok ?? 0), 0);
    const afterChildStats = await statsFromFile(childLedger);
    const docVolume = Math.round(afterChildStats.volumeUsd * 100) / 100;
    out(`children: ${childOk} orders accepted  ·  each reported ${money(childFilled / MULTIPROC || 0)} filled`);
    out(`ledger document counter after all writers finished: ${money(docVolume)}  ← this is what the dashboard reads`);
    if (childFilled > 0) {
      const lost = Math.round((childFilled - docVolume) * 100) / 100;
      const pct = Math.max(0, Math.round((lost / childFilled) * 100));
      out(`total filled by children ${money(childFilled)}  →  ${money(lost)} (${pct}%) absent from the counter`);
      if (lost > 0.05) {
        out("  ⚠ lost updates confirmed: the ledger is one JSON document, read-modify-written");
        out("    by every writer, so concurrent processes overwrite each other's counters and balances.");
      } else {
        out("  ok  counter kept up with concurrent writers");
      }
    }
    multiproc = { childFilled, childOk, docVolume, lostUsd: Math.round((childFilled - docVolume) * 100) / 100 };
  }

  // ── after
  const after = await api.getMarketState();
  const afterStats = after.stats;
  if (KEEP) mutatedRaw = (await readRawLedger()).raw;
  const observedVolume = Math.round((afterStats.volumeUsd - beforeStats.volumeUsd) * 100) / 100;
  const observedFees = Math.round((afterStats.feesUsd - beforeStats.feesUsd) * 100) / 100;
  // Children wrote to their own scratch ledger, so the parent's ledger delta should
  // only account for the parent's own fills (children are scored in step 3).
  const executedVolume = Math.round((suiteVolume + load.filledUsd) * 100) / 100;
  const executedFees = Math.round((suiteFees + load.feeUsd) * 100) / 100;
  // The persisted counter is a single writer's view: if it kept fewer dollars than
  // were executed, the gap is volume lost to concurrent read-modify-write.
  const counterExpected =
    observedVolume > 0 ? Math.max(observedVolume, executedVolume) : executedVolume;
  const lostToConcurrency = Math.max(0, Math.round((counterExpected - observedVolume) * 100) / 100);

  rule("4. Feed integrity (does the dashboard see every fill?)");
  const volGap = Math.round((executedVolume - observedVolume) * 100) / 100;
  check(
    "counter volume delta matches the fills we executed",
    Math.abs(volGap) <= 0.05,
    `executed ${money(executedVolume)} · counter moved ${money(observedVolume)}`
  );
  const feeGap = Math.round((executedFees - observedFees) * 100) / 100;
  check(
    "counter fee delta matches the taker fees charged",
    Math.abs(feeGap) <= 0.05 || executedFees === 0,
    `charged ${money(executedFees)} · counter moved ${money(observedFees)}`
  );

  const tapeBefore = new Set((before.book.tape ?? []).map((t) => t.id));
  const newPrints = (after.book.tape ?? []).filter((t) => !tapeBefore.has(t.id)).length;
  check("fresh fill prints landed on the public tape", newPrints > 0 || load.fillLegs === 0, `${newPrints} new prints`);

  // ── dashboard render
  rule("5. What the dashboard renders");
  const dash = (live: { volumeUsd: number; feesUsd: number; requests: number }) => ({
    creditsTraded: withOgBaseline(SHOWCASE.volumeUsd, live.volumeUsd),
    holderAllowance: withOgBaseline(SHOWCASE.holderAllowanceUsd, live.feesUsd * (SHOWCASE.feesToPoolPct / 100)),
    apiRequests: Math.round(withOgBaseline(SHOWCASE.requests30d, live.requests)),
    earned: withOgBaseline(SHOWCASE.revenueUsd, live.feesUsd),
  });
  const dBefore = dash(beforeStats);
  const dAfter = dash(afterStats);
  out(`  credits traded   ${money(dBefore.creditsTraded)}  →  ${money(dAfter.creditsTraded)}   (+${money(dAfter.creditsTraded - dBefore.creditsTraded)} live)`);
  out(`  holder allowance ${money(dBefore.holderAllowance)}  →  ${money(dAfter.holderAllowance)}   (+${money(dAfter.holderAllowance - dBefore.holderAllowance)} live)`);
  out(`  fee revenue      ${money(dBefore.earned)}  →  ${money(dAfter.earned)}   (+${money(dAfter.earned - dBefore.earned)} live)`);
  out(`  active accounts  ${beforeStats.activeAccounts}  →  ${afterStats.activeAccounts}`);
  out(`  house bid pool   ${money(beforeBands.houseBidPoolUsd)}  →  ${money(after.config.houseBidPoolUsd)}`);
  out(`  24h volume       ${money(beforeStats.volume24hUsd)}  →  ${money(afterStats.volume24hUsd)}`);

  // ── restore
  let restored = "n/a";
  let restoreLabel = "not applicable (--load-only)";
  if (!LOAD_ONLY) {
    rule("6. Restore");
    if (KEEP) {
      restored = "kept";
      restoreLabel = "no restore (--keep)";
      if (snapshot.via === "local") {
        // nothing to persist; the scratch dir is the record
      } else if (mutatedRaw) {
        try {
          await writeRawLedger(mutatedRaw, snapshot.via);
          const back = await readRawLedger();
          const ok = back.raw === mutatedRaw;
          restored = ok ? "kept & verified" : "MISMATCH";
          check("stress ledger persisted and read back intact", ok, back.raw ? sha(back.raw) : "null");
        } catch (err) {
          restored = `FAILED to persist: ${err instanceof Error ? err.message : String(err)}`;
          check("stress ledger persisted", false, restored);
        }
      }
      out(`  kept (--keep): ${CFG.accounts} stress traders and their fills are live on the dashboard`);
      out("  these accounts can be removed later by restoring a backup or re-seeding the ledger.");
    } else {
      try {
        if (snapshot.raw == null) {
          // no ledger existed before the run — delete what we created rather than
          // writing an empty one, so prod stays exactly as found ("empty", not "null").
          if (snapshot.via === "redis") await redisCmd(["DEL", LEDGER_KEY]);
          else if (snapshot.via === "blob") {
            const { del } = await import("@vercel/blob");
            await del(BLOB_PATH).catch(() => {});
          } else {
            await fs.rm(path.join(process.cwd(), ".data", "lab-accounts.json"), { force: true });
          }
          restored = "ok";
          restoreLabel = "cleared (no ledger existed before the run)";
        } else {
          await writeRawLedger(snapshot.raw, snapshot.via);
          const back = await readRawLedger();
          const ok = back.raw === snapshot.raw;
          restored = ok ? "ok" : "MISMATCH";
          restoreLabel = ok ? `restored to pre-run sha ${snapshotHash}` : "MISMATCH";
          check("ledger restored byte-for-byte to the pre-run snapshot", ok, back.raw ? sha(back.raw) : "null");
        }
        out(`  ${restoreLabel}`);
        out("  note: any running web process may hold stale in-memory state for up to 5 min (BLOB_READ_TTL).");
      } catch (err) {
        restored = `FAILED: ${err instanceof Error ? err.message : String(err)}`;
        restoreLabel = restored;
        check("ledger restored", false, restored);
      }
      if (MODE_LIVE) out(`  backup copy: .tmp/stress/ledger-${runId}.json.bak`);
    }
  }

  // ── summary
  const summary = {
    runId,
    mode: MODE_LIVE ? "live" : "dry",
    backend: backend.backend,
    checks: { passed: checks.filter((c) => c.ok).length, failed: checks.filter((c) => !c.ok).length },
    failures: checks.filter((c) => !c.ok).map((c) => ({ label: c.label, detail: c.detail })),
    load: {
      attempted: load.attempted,
      ok: load.ok,
      failed: load.failed,
      errorReasons: load.errors,
      fillLegs: load.fillLegs,
      userMakerLegs: load.makerUserLegs,
      houseLegs: load.houseLegs,
      userMakerShare: load.fillLegs > 0 ? Math.round((load.makerUserLegs / load.fillLegs) * 1000) / 1000 : 0,
      resting: load.resting,
      filledUsd: load.filledUsd,
      feeUsd: load.feeUsd,
      wallMs,
      latencyMs: {
        p50: Math.round(percentile(load.latencyMs, 50)),
        p95: Math.round(percentile(load.latencyMs, 95)),
        max: Math.round(Math.max(...load.latencyMs)),
      },
    },
    counter: {
      volumeDelta: observedVolume,
      feeDelta: observedFees,
      volumeCaptured:
        executedVolume > 0 ? Math.round((observedVolume / executedVolume) * 1000) / 1000 : null,
      lostToConcurrency,
      tapePrints: newPrints,
    },
    book: {
      askBefore: before.book.bestAsk,
      askAfter: after.book.bestAsk,
      bidBefore: before.book.bestBid,
      bidAfter: after.book.bestBid,
      housePoolBefore: beforeBands.houseBidPoolUsd,
      housePoolAfter: after.config.houseBidPoolUsd,
      activeAccountsBefore: beforeStats.activeAccounts,
      activeAccountsAfter: afterStats.activeAccounts,
    },
    dashboard: { before: dBefore, after: dAfter },
    multiproc,
    restored,
  };

  if (JSON_ONLY) {
    process.stdout.write(JSON.stringify(summary));
    return;
  }

  rule("Summary");
  out(`  checks   ${summary.checks.passed} passed, ${summary.checks.failed} failed`);
  out(`  orders   ${load.ok}/${load.attempted} accepted · ${money(load.filledUsd)} filled · ${money(load.feeUsd)} fees`);
  out(
    `  counter  captured ${summary.counter.volumeCaptured != null ? (summary.counter.volumeCaptured * 100).toFixed(1) + "%" : "n/a"} of executed volume` +
      (lostToConcurrency > 0.05 ? `  ·  ${money(lostToConcurrency)} lost to concurrency` : "")
  );
  if (MULTIPROC > 0 && multiproc) {
    const m = multiproc as { childFilled: number; docVolume: number; lostUsd: number };
    out(`  contend  ${money(m.childFilled)} filled concurrently · ${money(m.lostUsd)} never reached the counter`);
  }
  out(`  restore  ${restored}\n`);

  process.exitCode = summary.checks.failed > 0 || load.attempted === 0 ? 1 : 0;
}

/** Spawn a child that only places load — used for cross-process contention. */
function runChild(i: number, scratchDir: string, childRunId: string): Promise<{ filledUsd: number; ok: number; failed: number }> {
  return new Promise((resolve) => {
    // Single quoted command string: avoids Node's args+shell deprecation warning and
    // resolves npx.cmd correctly on Windows.
    const cmd = `npx -y tsx "${SCRIPT_PATH}" ${MODE_LIVE ? "--live" : "--dry"} --yes --load-only --json`;
    const child = spawn(cmd, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        STRESS_SEED: String(CFG.seed + i * 977),
        STRESS_ACCOUNTS: String(Math.max(2, Math.round(CFG.accounts / 2))),
        STRESS_SCRATCH: scratchDir,
        STRESS_RUN_ID: childRunId,
      },
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let buf = "";
    let errBuf = "";
    child.stdout?.on("data", (d) => (buf += String(d)));
    child.stderr?.on("data", (d) => (errBuf += String(d)));
    child.on("close", async () => {
      const logFile = path.join(scratchDir, `child-${i}.log`);
      await fs.writeFile(logFile, `--- stdout ---\n${buf}\n--- stderr ---\n${errBuf}`).catch(() => {});
      const text = buf.trim();
      const payload = text.startsWith("{") ? text : text.slice(text.indexOf("{"));
      try {
        const j = JSON.parse(payload) as { load?: { filledUsd?: number; ok?: number; failed?: number } };
        resolve({ filledUsd: j.load?.filledUsd ?? 0, ok: j.load?.ok ?? 0, failed: j.load?.failed ?? 0 });
      } catch {
        resolve({ filledUsd: 0, ok: 0, failed: 0, error: `unparseable (see ${path.basename(logFile)})` } as never);
      }
    });
  });
}

main().catch((err) => {
  console.error("\nstress harness failed:", err instanceof Error ? err.stack : err);
  process.exit(1);
});
