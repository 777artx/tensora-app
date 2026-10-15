/**
 * Earn engine chain helpers: $OLORA holder snapshots on Robinhood Chain
 * (Blockscout), wallet balances, and OpenRouter backing balance.
 * The accrual ledger itself lives in account-store.ts.
 */

import { PrivyClient } from "@privy-io/server-auth";
import { ROBINHOOD_EXPLORER_URL } from "@/lib/lab/token-access";
import { allowDemoAuth } from "@/lib/lab/app-mode";
import {
  robinhoodRpcUrl,
  tensoraTokenAddress,
  usdgTokenAddress,
} from "@/lib/lab/deposit-verify";

export function tensoraTokenDecimals() {
  const n = Number(process.env.TENSORA_TOKEN_DECIMALS || 18);
  return Number.isFinite(n) && n >= 0 && n <= 18 ? n : 18;
}

/** Minimum time-weighted balance to earn (tokens). */
export function earnHolderFloor() {
  const n = Number(process.env.EARN_HOLDER_FLOOR || "10000");
  return Number.isFinite(n) && n > 0 ? n : 10000;
}

/**
 * Drip rate: percent of the remaining pool paid out per hour.
 * Self-scaling — big fee days mean bigger drips, quiet weeks shrink it,
 * and the pool never hits zero. Default 2%/h ≈ 38% of the pool per day.
 */
export function earnDripPctPerHour() {
  const n = Number(process.env.EARN_DRIP_PCT_PER_HOUR || "2");
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : 2;
}

export type TokenHolder = { address: string; balance: number };

/** Top token holders from Robinhood Chain Blockscout (paginated, best-effort). */
export async function fetchTokenHolders(maxHolders = 200): Promise<TokenHolder[]> {
  const token = tensoraTokenAddress();
  if (!token) return [];
  const unit = 10 ** tensoraTokenDecimals();
  const out: TokenHolder[] = [];
  let url: string | null =
    `${ROBINHOOD_EXPLORER_URL}/api/v2/tokens/${token}/holders`;
  let guard = 0;

  while (url && out.length < maxHolders && guard < 5) {
    guard++;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) break;
    const data = (await res.json()) as {
      items?: { address?: { hash?: string }; value?: string }[];
      next_page_params?: Record<string, string | number> | null;
    };
    for (const item of data.items || []) {
      const address = (item.address?.hash || "").toLowerCase();
      const raw = Number(item.value || "0");
      if (!address || !Number.isFinite(raw)) continue;
      out.push({ address, balance: raw / unit });
    }
    if (data.next_page_params && Object.keys(data.next_page_params).length) {
      const qs = new URLSearchParams(
        Object.entries(data.next_page_params).map(([k, v]) => [k, String(v)])
      );
      url = `${ROBINHOOD_EXPLORER_URL}/api/v2/tokens/${token}/holders?${qs}`;
    } else {
      url = null;
    }
  }
  return out.slice(0, maxHolders);
}

function balanceOfCalldata(wallet: string) {
  const hex = String(wallet).trim().replace(/^0x/, "");
  return "0x70a08231" + hex.toLowerCase().padStart(64, "0");
}

/** $OLORA balance for one wallet (tokens, not raw units). 0 when unconfigured. */
export async function fetchTokenBalance(wallet: string): Promise<number> {
  const token = tensoraTokenAddress();
  if (!token || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) return 0;
  try {
    const res = await fetch(robinhoodRpcUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to: token, data: balanceOfCalldata(wallet) }, "latest"],
      }),
    });
    const payload = (await res.json()) as { result?: string };
    if (!payload.result) return 0;
    return Number(BigInt(payload.result) / 10n ** BigInt(Math.max(0, tensoraTokenDecimals() - 6))) / 1e6;
  } catch {
    return 0;
  }
}

/** Remaining OpenRouter balance (USD) — the backing for credits. Null when unavailable. */
export async function fetchOpenRouterBackingUsd(): Promise<number | null> {
  const key = (process.env.OPENROUTER_API_KEY || "").trim();
  if (!key) return null;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/credits", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: { total_credits?: number; total_usage?: number };
    };
    const total = Number(data.data?.total_credits ?? NaN);
    const used = Number(data.data?.total_usage ?? NaN);
    if (!Number.isFinite(total) || !Number.isFinite(used)) return null;
    return Math.max(0, Math.round((total - used) * 100) / 100);
  } catch {
    return null;
  }
}

let privy: PrivyClient | null = null;
function privyClient(): PrivyClient | null {
  const appId = (process.env.NEXT_PUBLIC_PRIVY_APP_ID || "").trim();
  const secret = (process.env.PRIVY_APP_SECRET || "").trim();
  if (!appId || !secret) return null;
  if (!privy) privy = new PrivyClient(appId, secret);
  return privy;
}

// ── Fee wallet watcher: fee revenue auto-refills the reward pool ─

/** Wallet on Robinhood Chain where Pons trading fees land (claimed as USDG). */
export function earnFeeWallet() {
  return String(process.env.EARN_FEE_WALLET || "")
    .trim()
    .toLowerCase();
}

/** Share of each fee inflow routed to the holder reward pool (bps, default 50%). */
export function earnFeeShareBps() {
  const n = Number(process.env.EARN_FEE_SHARE_BPS || "5000");
  return Number.isFinite(n) && n >= 0 && n <= 10000 ? n : 5000;
}

export type FeeInbound = { txHash: string; amountUsd: number; from: string; at: string };

/** Recent USDG transfers INTO the fee wallet (Blockscout, best-effort). */
export async function fetchFeeWalletInbounds(limit = 50): Promise<FeeInbound[]> {
  const wallet = earnFeeWallet();
  if (!wallet) return [];
  const usdg = usdgTokenAddress();
  try {
    const res = await fetch(
      `${ROBINHOOD_EXPLORER_URL}/api/v2/addresses/${wallet}/token-transfers?type=ERC-20&filter=to`,
      { headers: { accept: "application/json" } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      items?: {
        transaction_hash?: string;
        tx_hash?: string;
        timestamp?: string;
        from?: { hash?: string };
        to?: { hash?: string };
        token?: { address?: string; address_hash?: string };
        total?: { value?: string; decimals?: string };
      }[];
    };
    const out: FeeInbound[] = [];
    for (const item of data.items || []) {
      const tokenAddr = (item.token?.address || item.token?.address_hash || "").toLowerCase();
      if (tokenAddr !== usdg) continue;
      if ((item.to?.hash || "").toLowerCase() !== wallet) continue;
      const txHash = (item.transaction_hash || item.tx_hash || "").toLowerCase();
      if (!txHash) continue;
      const decimals = Number(item.total?.decimals || 6);
      const raw = Number(item.total?.value || "0");
      const amountUsd = raw / 10 ** decimals;
      if (!Number.isFinite(amountUsd) || amountUsd <= 0) continue;
      out.push({
        txHash,
        amountUsd: Math.round(amountUsd * 100) / 100,
        from: (item.from?.hash || "").toLowerCase(),
        at: item.timestamp || new Date().toISOString(),
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

// ── Holder fee tiers on the credit market ──────────────────────
// Hold the floor → 25% off the taker fee; hold 10× the floor → 50% off.

export type FeeTier = { label: string; minTokens: number; feeMultiplier: number };

export function feeTiers(): FeeTier[] {
  const floor = earnHolderFloor();
  return [
    { label: `${(floor * 10).toLocaleString()}+ $OLORA`, minTokens: floor * 10, feeMultiplier: 0.5 },
    { label: `${floor.toLocaleString()}+ $OLORA`, minTokens: floor, feeMultiplier: 0.75 },
  ];
}

const balanceCache = new Map<string, { at: number; balance: number }>();
const BALANCE_CACHE_MS = 60_000;

async function cachedTokenBalance(wallet: string): Promise<number> {
  const hit = balanceCache.get(wallet);
  if (hit && Date.now() - hit.at < BALANCE_CACHE_MS) return hit.balance;
  const balance = await fetchTokenBalance(wallet);
  balanceCache.set(wallet, { at: Date.now(), balance });
  return balance;
}

/**
 * Taker-fee multiplier for a user based on total $OLORA across their
 * linked wallets. Returns 1 when the token is unconfigured or unheld.
 */
export async function takerFeeMultiplierForUser(
  userId: string
): Promise<{ multiplier: number; tier: FeeTier | null; heldTokens: number }> {
  if (!tensoraTokenAddress()) return { multiplier: 1, tier: null, heldTokens: 0 };
  const wallets = await getUserWallets(userId);
  if (wallets.length === 0) return { multiplier: 1, tier: null, heldTokens: 0 };
  const balances = await Promise.all(wallets.map((w) => cachedTokenBalance(w)));
  const held = balances.reduce((s, b) => s + b, 0);
  for (const tier of feeTiers()) {
    if (held >= tier.minTokens) return { multiplier: tier.feeMultiplier, tier, heldTokens: held };
  }
  return { multiplier: 1, tier: null, heldTokens: held };
}

/** Wallet addresses linked to a Privy user (server-verified, not client-claimed). */
export async function getUserWallets(userId: string): Promise<string[]> {
  const client = privyClient();
  // Local dev without Privy: wallets linked in the ledger stand in for Privy-linked wallets.
  if (!client && allowDemoAuth()) {
    const { ledgerRead } = await import("@/lib/lab/account-store");
    const links = (await ledgerRead()).walletLinks || {};
    return Object.keys(links).filter((w) => links[w] === userId);
  }
  if (!client || !userId.startsWith("did:privy:")) return [];
  try {
    const user = await client.getUser(userId);
    const wallets: string[] = [];
    for (const acct of user?.linkedAccounts || []) {
      const a = acct as { type?: string; address?: string; chainType?: string };
      if (a.type === "wallet" && a.address && /^0x[a-fA-F0-9]{40}$/.test(a.address)) {
        wallets.push(a.address.toLowerCase());
      }
    }
    return [...new Set(wallets)];
  } catch {
    return [];
  }
}
