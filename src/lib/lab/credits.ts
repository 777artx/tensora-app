/** Client credit helpers — sync with server ledger via /api/lab/credits. */

import { labAuthHeaders, readCachedAccessToken } from "@/lib/lab/lab-fetch";

const CREDITS_KEY = "gd-credits";
const USDC_KEY = "gd-credits-usdc";
const USDG_KEY = "gd-credits-usdg";
const HISTORY_KEY = "gd-billing-history";

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export type DepositMethod = "usdc" | "usdg" | "crypto" | "tensora";

export type DepositConfig = {
  chain: string;
  chainId: number;
  treasury: string | null;
  usdc: string;
  usdg?: string;
  tensoraToken: string | null;
  methods: readonly string[];
  note: string;
  rails?: {
    usdc?: {
      chain: string;
      chainId: number;
      label: string;
      token: string;
      tokenSymbol: string;
      explorer: string;
      explorerAddress: string | null;
    };
    usdg?: {
      chain: string;
      chainId: number;
      label: string;
      token: string;
      tokenSymbol: string;
      explorer: string;
      explorerAddress: string | null;
    };
  };
};

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

function mirrorLocal(snap: {
  credits: number;
  usdc: number;
  usdg: number;
  history?: BillingHistoryRow[];
}) {
  if (!canUseStorage()) return;
  localStorage.setItem(CREDITS_KEY, String(snap.credits));
  localStorage.setItem(USDC_KEY, String(snap.usdc));
  localStorage.setItem(USDG_KEY, String(snap.usdg));
  if (snap.history) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(snap.history));
  }
  window.dispatchEvent(new Event("tensora-credits-change"));
}

export function getCredits(): number {
  if (!canUseStorage()) return 0;
  const n = Number(localStorage.getItem(CREDITS_KEY) || "0");
  return Number.isFinite(n) ? n : 0;
}

export function getUsdcBalance(): number {
  if (!canUseStorage()) return 0;
  const n = Number(localStorage.getItem(USDC_KEY) || "0");
  return Number.isFinite(n) ? n : 0;
}

export function getUsdgBalance(): number {
  if (!canUseStorage()) return 0;
  const n = Number(localStorage.getItem(USDG_KEY) || "0");
  return Number.isFinite(n) ? n : 0;
}

export function setCredits(n: number) {
  if (!canUseStorage()) return;
  localStorage.setItem(CREDITS_KEY, String(Math.max(0, n)));
  window.dispatchEvent(new Event("tensora-credits-change"));
}

export function loadBillingHistory(): BillingHistoryRow[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BillingHistoryRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function refreshCreditsFromServer(
  getAccessToken?: () => Promise<string | null>
): Promise<{
  credits: number;
  usdc: number;
  usdg: number;
  history: BillingHistoryRow[];
  deposit?: DepositConfig;
} | null> {
  try {
    // Skip unauthenticated polls in live mode — they only produce 401 noise.
    let token: string | null = null;
    if (getAccessToken) {
      try {
        token = await getAccessToken();
      } catch {
        token = null;
      }
    }
    if (!token) token = readCachedAccessToken();
    if (!token && (process.env.NEXT_PUBLIC_APP_MODE || "").trim().toLowerCase() === "live") {
      return null;
    }

    const headers = await labAuthHeaders(getAccessToken);
    const res = await fetch("/api/lab/credits", { headers });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      credits: number;
      usdc: number;
      usdg: number;
      history: BillingHistoryRow[];
      deposit?: DepositConfig;
    };
    mirrorLocal(data);
    return data;
  } catch {
    return null;
  }
}

/** Claim an on-chain deposit by tx hash (Base USDC or Robinhood USDG). */
export async function depositFunds(
  method: DepositMethod,
  txHash: string,
  getAccessToken?: () => Promise<string | null>
) {
  const headers = await labAuthHeaders(getAccessToken);
  const res = await fetch("/api/lab/credits", {
    method: "POST",
    headers,
    body: JSON.stringify({ method, txHash }),
  });
  const data = (await res.json()) as {
    error?: string;
    credits?: number;
    usdc?: number;
    usdg?: number;
    history?: BillingHistoryRow[];
    verified?: {
      amountUsd: number;
      token: string;
      chain?: string;
      explorerUrl?: string;
    };
  };
  if (!res.ok) {
    throw new Error(data.error || "Deposit claim failed");
  }
  if (typeof data.credits === "number") {
    mirrorLocal({
      credits: data.credits,
      usdc: data.usdc ?? 0,
      usdg: data.usdg ?? 0,
      history: data.history,
    });
  }
  return data;
}

export function monthSpendTotals(history: BillingHistoryRow[]) {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const totals = { model: 0, compute: 0, tools: 0, other: 0 };
  for (const row of history) {
    const d = new Date(row.date);
    if (d < start) continue;
    const amt = parseAmount(row.amount);
    if (amt >= 0) continue;
    const spend = Math.abs(amt);
    const k = (row.kind || "").toLowerCase();
    if (k.includes("model") || k.includes("infer") || k.includes("chat") || k.includes("marketplace"))
      totals.model += spend;
    else if (k.includes("gpu") || k.includes("compute")) totals.compute += spend;
    else if (k.includes("tool") || k.includes("mcp")) totals.tools += spend;
    else totals.other += spend;
  }
  return totals;
}

function parseAmount(s: string): number {
  const n = Number(String(s).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
