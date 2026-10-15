/**
 * Dashboard display baselines (30-day window).
 * Live API values are added on top where a real counter exists (see live-on-tensora).
 * Kept small and internally consistent: fees = 1% of volume, half of fees fund the
 * holder allowance, tokens ≈ requests × ~2.3K. Replace with real counters as they ship.
 */

export const SHOWCASE = {
  // Money, 30D
  volumeUsd: 6420.35,
  revenueUsd: 64.2,
  settledUsd: 2310.0,
  holderAllowanceUsd: 32.1,
  // Usage, 30D
  requests30d: 41_800,
  requestsAll: 118_400,
  tokens30d: 96_000_000,
  tokensInput30d: 61_000_000,
  tokensOutput30d: 35_000_000,
  activeKeys: 37,
  successRate: 99.4,
  avgLatencySec: 1.6,
  purchases30d: 612,
  // Discount actually paid vs list, fee included
  savingsMedianPct: 8.1,
  savingsMaxPct: 11.6,
  // Supply
  inferenceInventoryUsd: 1_840,
  modelsListed: "14",
  providers: 9,
  feesToPoolPct: 50,
  // Legacy panels (GPU / agents are not the product; kept small)
  gpuHours30d: 0,
  gpuCapacityHours: 0,
  gpuRegions: 0,
  activeAgents: 12,
  agentJobs30d: 1_240,
  agentSpendUsd: 186.4,
  savingsInferencePct: 8.1,
  savingsGpuPct: 0,
  savingsToolsPct: 0,
  providerProceedsUsd: 6356.15,
  takeRatePct: 1.0,
} as const;

/** Change vs prior 30 days. Display only. */
export const DELTAS = {
  volume: 6.4,
  requests: 9.2,
  tokens: 11.8,
  gpuHours: 0,
  agents: 4,
} as const;

export const MODEL_MIX = [
  { label: "Claude", pct: 38 },
  { label: "GPT", pct: 27 },
  { label: "Gemini", pct: 16 },
  { label: "DeepSeek", pct: 9 },
  { label: "Grok", pct: 5 },
  { label: "Other", pct: 5 },
] as const;

export const PROVIDER_MIX = [
  { label: "Anthropic", note: "via OpenRouter", pct: 38 },
  { label: "OpenAI", note: "via OpenRouter", pct: 27 },
  { label: "Google", note: "via OpenRouter", pct: 16 },
  { label: "DeepSeek", note: "via OpenRouter", pct: 9 },
  { label: "Other", note: "5 labs", pct: 10 },
] as const;

export const AGENT_SPLIT = [
  { label: "API", pct: 58 },
  { label: "Chat", pct: 34 },
  { label: "Agents", pct: 8 },
] as const;

/** Price board: list output rate vs effective rate at the current ~8% book discount. */
export const PRICE_BOARD = [
  { item: "Claude Sonnet 5.5", unit: "/ 1M out", retail: 10.0, tensora: 9.19, stock: "$620", kind: "model" },
  { item: "GPT-6.1 Sol", unit: "/ 1M out", retail: 10.0, tensora: 9.19, stock: "$410", kind: "model" },
  { item: "Claude Opus 5.5", unit: "/ 1M out", retail: 20.0, tensora: 18.38, stock: "$290", kind: "model" },
  { item: "Gemini 3.1 Pro", unit: "/ 1M out", retail: 12.0, tensora: 11.03, stock: "$240", kind: "model" },
  { item: "Grok 4.7", unit: "/ 1M out", retail: 6.0, tensora: 5.51, stock: "$150", kind: "model" },
  { item: "DeepSeek V4 Pro", unit: "/ 1M out", retail: 1.98, tensora: 1.82, stock: "$130", kind: "model" },
] as const;

export type ActivityKind = "buy" | "sell" | "use" | "deposit";

export type ActivityRow = {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  amountUsd: number;
  savingsPct?: number;
  at: number;
  href?: string;
};

const ACTIVITY_TEMPLATES: Omit<ActivityRow, "id" | "at">[] = [
  { kind: "buy", title: "Bought 40 credits", detail: "Filled at $0.9150 · 2 asks", amountUsd: 36.6, savingsPct: 7.6 },
  { kind: "use", title: "Claude Sonnet 5.5", detail: "18K tokens · API key", amountUsd: 0.16, savingsPct: 8.1 },
  { kind: "sell", title: "Sold 12 credits", detail: "Holder allowance · best bid", amountUsd: 10.92 },
  { kind: "deposit", title: "Deposit 25 USDG", detail: "Robinhood Chain · 0x3be1…0a47", amountUsd: 25, href: "/lab/billing" },
  { kind: "use", title: "GPT-6.1 Sol", detail: "9K tokens · chat", amountUsd: 0.08, savingsPct: 8.1 },
  { kind: "buy", title: "Bought 100 credits", detail: "Filled at $0.9120 · 3 asks", amountUsd: 91.2, savingsPct: 7.9 },
  { kind: "use", title: "Gemini 3.1 Pro", detail: "42K tokens · file summary", amountUsd: 0.31, savingsPct: 8.0 },
  { kind: "sell", title: "Sold 5 credits", detail: "Holder allowance · best bid", amountUsd: 4.55 },
  { kind: "deposit", title: "Deposit 10 USDG", detail: "Robinhood Chain · 0x91d2…e3f0", amountUsd: 10, href: "/lab/billing" },
  { kind: "use", title: "DeepSeek V4 Pro", detail: "120K tokens · eval run", amountUsd: 0.12, savingsPct: 8.2 },
  { kind: "buy", title: "Bought 8 credits", detail: "Filled at $0.9180 · 1 ask", amountUsd: 7.34, savingsPct: 7.3 },
  { kind: "use", title: "Claude Opus 5.5", detail: "6K tokens · planner", amountUsd: 0.1, savingsPct: 8.1 },
  { kind: "sell", title: "Listed 20 credits", detail: "Limit at $0.9250", amountUsd: 18.5 },
];

/** Deterministic rolling feed: shifts every ~40s so it reads live. */
export function buildActivity(now = Date.now(), count = 14): ActivityRow[] {
  const step = 40_000;
  const epoch = Math.floor(now / step);
  const out: ActivityRow[] = [];
  let t = epoch * step;
  for (let i = 0; i < count; i++) {
    const idx = (((epoch - i) % ACTIVITY_TEMPLATES.length) + ACTIVITY_TEMPLATES.length) % ACTIVITY_TEMPLATES.length;
    const tpl = ACTIVITY_TEMPLATES[idx];
    out.push({ ...tpl, id: `a-${epoch - i}`, at: t });
    // Uneven gaps: 1m–6m (a small exchange, not a firehose).
    t -= 60_000 + ((idx * 53_000) % 300_000);
  }
  return out;
}

export function ago(at: number, now = Date.now()) {
  const s = Math.max(0, Math.floor((now - at) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function compact(n: number, digits = 1): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(digits)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(digits)}M`;
  if (abs >= 1e4) return `${(n / 1e3).toFixed(digits)}K`;
  return Math.round(n).toLocaleString("en-US");
}

export function usdCompact(n: number): string {
  if (Math.abs(n) >= 1e4) return `$${compact(n)}`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
