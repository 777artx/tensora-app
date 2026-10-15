import { NextResponse } from "next/server";
import { getLabNetworkStats } from "@/lib/lab/account-store";
import { treasuryAddress } from "@/lib/lab/deposit-verify";

export const runtime = "nodejs";

const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
/** keccak256("AuthorizationUsed(address,bytes32)") — EIP-3009 / x402 settlement fingerprint */
const AUTHORIZATION_USED =
  "0x98de503528ee59b575ef0c0a2576a82497bfc029a5685b209e9ec333479b10a5";
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const BASESCAN = "https://basescan.org";

/** Free public Base RPCs — most cap eth_getLogs hard; we chunk against these. */
const RPC_URLS = (
  process.env.BASE_RPC_URL ||
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  "https://mainnet.base.org,https://base.publicnode.com"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export type X402Settlement = {
  id: string;
  txHash: string;
  explorerUrl: string;
  from: string;
  to: string;
  amountUsd: number;
  asset: "USDC";
  chain: "Base";
  chainId: 8453;
  method: string | null;
  at: string;
  likelyX402: boolean;
};

function shortAddr(a: string) {
  if (!a || a.length < 10) return a || "-";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

async function rpcAt<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  const payload = (await res.json()) as { result?: T; error?: { message?: string } };
  if (payload.error?.message) throw new Error(payload.error.message);
  return payload.result as T;
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  let last: Error | null = null;
  for (const url of RPC_URLS) {
    try {
      return await rpcAt<T>(url, method, params);
    } catch (err) {
      last = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw last || new Error("All Base RPCs failed");
}

type Log = {
  transactionHash?: string;
  blockNumber?: string;
  address?: string;
  topics?: string[];
  data?: string;
};

type Receipt = {
  logs?: Log[];
  status?: string;
} | null;

function topicAddr(topic: string) {
  return `0x${topic.slice(-40)}`.toLowerCase();
}

function padAddrTopic(addr: string) {
  return `0x${addr.replace(/^0x/i, "").toLowerCase().padStart(64, "0")}`;
}

function decodeUsdc(data: string) {
  try {
    return Number(BigInt(data)) / 1e6;
  } catch {
    return 0;
  }
}

/**
 * Chunked eth_getLogs. mainnet.base.org allows ~2k blocks; other free RPCs often less.
 * Use 1.8k chunks so treasury pulse drips show up on Home.
 */
async function getTransferLogsTo(
  treasury: string,
  fromBlock: number,
  toBlock: number
): Promise<Log[]> {
  const toTopic = padAddrTopic(treasury);
  const chunk = 1_800;
  const all: Log[] = [];

  for (let start = fromBlock; start <= toBlock; start += chunk) {
    const end = Math.min(toBlock, start + chunk - 1);
    const params = [
      {
        address: USDC,
        fromBlock: `0x${start.toString(16)}`,
        toBlock: `0x${end.toString(16)}`,
        topics: [TRANSFER_TOPIC, null, toTopic],
      },
    ];

    let got: Log[] | null = null;
    let lastErr: Error | null = null;
    for (const url of RPC_URLS) {
      try {
        got = await rpcAt<Log[]>(url, "eth_getLogs", params);
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        // Retry same chunk with smaller window if provider is stricter
        const msg = String(lastErr.message);
        if (/50 block|10 block|limited/i.test(msg)) {
          const micro = 40;
          for (let m = start; m <= end; m += micro) {
            const mEnd = Math.min(end, m + micro - 1);
            try {
              const part = await rpcAt<Log[]>(url, "eth_getLogs", [
                {
                  address: USDC,
                  fromBlock: `0x${m.toString(16)}`,
                  toBlock: `0x${mEnd.toString(16)}`,
                  topics: [TRANSFER_TOPIC, null, toTopic],
                },
              ]);
              if (!got) got = [];
              got.push(...(part || []));
              lastErr = null;
            } catch (e2) {
              lastErr = e2 instanceof Error ? e2 : new Error(String(e2));
            }
          }
          if (got) break;
        }
      }
    }
    if (lastErr && !got) throw lastErr;
    if (got?.length) all.push(...got);
  }

  return all;
}

/** Real USDC Transfer → treasury (pulse drips + buyer deposits). */
async function fetchTreasuryInbounds(limit = 12): Promise<X402Settlement[]> {
  const treasury = treasuryAddress();
  if (!treasury || treasury.length < 42) return [];

  const blockHex = await rpc<string>("eth_blockNumber", []);
  const block = Number.parseInt(blockHex, 16);
  // ~2h of Base at ~2s/block — enough for pulse drips without flooding free RPCs
  const span = 3_600;
  const fromBlock = Math.max(0, block - span);

  const logs = await getTransferLogsTo(treasury, fromBlock, block);

  const out: X402Settlement[] = [];
  const seen = new Set<string>();
  const ordered = [...(logs || [])].reverse();

  for (const log of ordered) {
    if (out.length >= limit) break;
    const txHash = String(log.transactionHash || "").toLowerCase();
    if (!txHash || seen.has(txHash)) continue;
    seen.add(txHash);

    const topics = log.topics || [];
    if (topics.length < 3) continue;
    const from = topicAddr(topics[1]);
    const to = topicAddr(topics[2]);
    const amountUsd = decodeUsdc(String(log.data || "0x0"));
    if (!(amountUsd >= 0.01)) continue;

    const blockNum = Number.parseInt(String(log.blockNumber || "0x0"), 16);
    const ageMs = Math.max(0, (block - blockNum) * 2_000);
    out.push({
      id: txHash,
      txHash,
      explorerUrl: `${BASESCAN}/tx/${txHash}`,
      from: shortAddr(from),
      to: shortAddr(to),
      amountUsd: Math.round(amountUsd * 10000) / 10000,
      asset: "USDC",
      chain: "Base",
      chainId: 8453,
      method: "transfer",
      at: new Date(Date.now() - ageMs).toISOString(),
      likelyX402: false,
    });
  }

  return out;
}

async function fetchLiveBaseSettlements(limit = 12): Promise<X402Settlement[]> {
  const blockHex = await rpc<string>("eth_blockNumber", []);
  const block = Number.parseInt(blockHex, 16);
  const fromBlock = `0x${Math.max(0, block - 900).toString(16)}`;

  const logs = await rpc<Log[]>("eth_getLogs", [
    {
      address: USDC,
      fromBlock,
      toBlock: "latest",
      topics: [AUTHORIZATION_USED],
    },
  ]);

  const out: X402Settlement[] = [];
  const seen = new Set<string>();
  const ordered = [...(logs || [])].reverse();
  let attempts = 0;

  for (const log of ordered) {
    if (out.length >= limit || attempts >= 40) break;
    const txHash = String(log.transactionHash || "").toLowerCase();
    if (!txHash || seen.has(txHash)) continue;
    seen.add(txHash);
    attempts += 1;

    const receipt = await rpc<Receipt>("eth_getTransactionReceipt", [txHash]);
    if (!receipt || (receipt.status && receipt.status !== "0x1")) continue;

    let from = "";
    let to = "";
    let amountUsd = 0;
    for (const l of receipt.logs || []) {
      const addr = String(l.address || "").toLowerCase();
      const topics = l.topics || [];
      if (addr !== USDC.toLowerCase()) continue;
      if (topics[0]?.toLowerCase() !== TRANSFER_TOPIC) continue;
      if (topics.length < 3) continue;
      from = topicAddr(topics[1]);
      to = topicAddr(topics[2]);
      amountUsd = decodeUsdc(String(l.data || "0x0"));
      break;
    }

    if (!(amountUsd >= 0.01 && amountUsd <= 50)) continue;

    const blockNum = Number.parseInt(String(log.blockNumber || "0x0"), 16);
    const ageMs = Math.max(0, (block - blockNum) * 2_000);
    out.push({
      id: txHash,
      txHash,
      explorerUrl: `${BASESCAN}/tx/${txHash}`,
      from: shortAddr(from),
      to: shortAddr(to),
      amountUsd: Math.round(amountUsd * 10000) / 10000,
      asset: "USDC",
      chain: "Base",
      chainId: 8453,
      method: "transferWithAuthorization",
      at: new Date(Date.now() - ageMs).toISOString(),
      likelyX402: true,
    });
  }

  return out;
}

type X402Payload = {
  ok: true;
  source: string;
  live: boolean;
  explorer: string;
  asset: "USDC";
  chainId: 8453;
  treasury: string;
  settlements: X402Settlement[];
  error: string | null;
  stats: Record<string, unknown>;
  fetchedAt: string;
};

/** Short TTL + single-flight so Home polls don’t stampede free Base RPCs. */
const CACHE_TTL_MS = 20_000;
const FETCH_BUDGET_MS = 12_000;
let cached: { at: number; body: X402Payload } | null = null;
let inflight: Promise<X402Payload> | null = null;

function buildPayload(
  treasury: string,
  settlements: X402Settlement[],
  source: string,
  liveError: string | null,
  now: number,
  network?: Awaited<ReturnType<typeof getLabNetworkStats>> | null
): X402Payload {
  const feedSum = Math.round(settlements.reduce((s, r) => s + r.amountUsd, 0) * 100) / 100;
  const volumeUsd = network?.volumeUsd ?? 0;
  const feesUsd = network?.feesUsd ?? 0;
  const settledUsd = Math.max(network?.depositsSettledUsd ?? 0, feedSum);
  return {
    ok: true,
    source,
    live: settlements.length > 0,
    explorer: BASESCAN,
    asset: "USDC",
    chainId: 8453,
    treasury,
    settlements,
    error: liveError,
    stats: {
      tensoraEarnedUsd: feesUsd,
      volumeUsd,
      volume24hUsd: network?.volume24hUsd ?? 0,
      requests: network?.requests ?? 0,
      x402SettledUsd: settledUsd,
      settledUsd,
      paidToProvidersUsd: Math.max(0, Math.round((volumeUsd - feesUsd) * 100) / 100),
      feedWindowUsd: feedSum,
      depositsSettledUsd: network?.depositsSettledUsd ?? 0,
      activeAccounts: network?.activeAccounts ?? 0,
      computeVolumeUsd: network?.computeVolumeUsd ?? 0,
      count: settlements.length,
      treasuryConfigured: Boolean(treasury),
      x402Tagged: settlements.filter((s) => s.likelyX402).length,
    },
    fetchedAt: new Date(now).toISOString(),
  };
}

async function loadLivePayload(): Promise<X402Payload> {
  const treasury = treasuryAddress();
  const now = Date.now();

  let settlements: X402Settlement[] = [];
  let source = "treasury-inbounds";
  let liveError: string | null = null;
  let network: Awaited<ReturnType<typeof getLabNetworkStats>> | null = null;

  try {
    network = await getLabNetworkStats();
  } catch {
    network = null;
  }

  try {
    settlements = await fetchTreasuryInbounds(16);
    // Keep real treasury inbounds; only pad with x402 if the feed is empty
    if (settlements.length === 0) {
      try {
        const x402 = await fetchLiveBaseSettlements(12);
        if (x402.length) {
          settlements = x402;
          source = "base-x402-live";
        }
      } catch {
        /* ignore x402 fallback errors */
      }
    }
  } catch (err) {
    source = "base-scan-error";
    liveError = err instanceof Error ? err.message : "RPC unavailable";
    try {
      settlements = await fetchLiveBaseSettlements(12);
      if (settlements.length) {
        source = "base-x402-live";
        liveError = null;
      }
    } catch {
      settlements = [];
    }
  }

  return buildPayload(treasury, settlements, source, liveError, now, network);
}

export async function GET() {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL_MS) {
    return NextResponse.json(cached.body);
  }

  if (!inflight) {
    inflight = (async () => {
      try {
        const body = await Promise.race([
          loadLivePayload(),
          new Promise<X402Payload>((resolve) => {
            setTimeout(() => {
              resolve(
                buildPayload(
                  treasuryAddress(),
                  cached?.body.settlements ?? [],
                  cached ? "cache-stale" : "rpc-timeout",
                  cached ? null : "Base RPC timed out",
                  Date.now()
                )
              );
            }, FETCH_BUDGET_MS);
          }),
        ]);
        cached = { at: Date.now(), body };
        return body;
      } finally {
        inflight = null;
      }
    })();
  }

  const body = await inflight;
  return NextResponse.json(body);
}
