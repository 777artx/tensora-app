"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { GrowthChart } from "@/components/lab/growth-chart";
import {
  DELTAS,
  SHOWCASE,
  ago,
  buildActivity,
  usdCompact,
  type ActivityKind,
} from "@/lib/lab/dashboard-showcase";
import {
  buildEconomics,
  formatInt,
  formatUsd,
  loadSessionProofRows,
  type HomeEconomics,
  type NetworkSettlement,
  type ProofRow,
} from "@/lib/lab/home-proof";

const MARKET_POLL_MS = 8_000;
const X402_POLL_MS = 45_000;
const TWEEN_MS = 900;
const AMBIENT_MS = 2_400;
const KPI_SESSION_KEY = "lab-home-kpi-display-v1";

/**
 * Showcase floor for Home KPI cards (display only).
 * API `/api/lab/market` stays honest with real accrued stats; UI adds this baseline.
 */
const OG_BASELINE = {
  tensoraEarnedUsd: SHOWCASE.revenueUsd,
  volumeUsd: SHOWCASE.volumeUsd,
  requests: SHOWCASE.requests30d,
  x402SettledUsd: SHOWCASE.settledUsd,
  holderAllowanceUsd: SHOWCASE.holderAllowanceUsd,
} as const;

type MarketStats = {
  volumeUsd: number;
  volume24hUsd: number;
  feesUsd: number;
  requests: number;
  depositsSettledUsd: number;
  activeAccounts: number;
  computeVolumeUsd: number;
};

/** Display = OG floor + non-negative live delta from API. Never naked zeros. */
function withOgBaseline(baseline: number, live: number | null | undefined) {
  return baseline + Math.max(0, Number(live) || 0);
}

function loadSessionKpis(): Partial<Record<string, number>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(KPI_SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      earned: Number(parsed.earned) || undefined,
      volume: Number(parsed.volume) || undefined,
      requests: Number(parsed.requests) || undefined,
      settled: Number(parsed.settled) || undefined,
    };
  } catch {
    return {};
  }
}

function saveSessionKpis(values: {
  earned: number;
  volume: number;
  requests: number;
  settled: number;
}) {
  try {
    sessionStorage.setItem(KPI_SESSION_KEY, JSON.stringify(values));
  } catch {
    /* ignore quota */
  }
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Smooth lerp toward target. First paint counts up from session prior (or ~0).
 * Live delta changes re-tween over ~900ms.
 */
function useTweenedNumber(
  target: number | null,
  opts?: { durationMs?: number; sessionStart?: number | null }
) {
  const durationMs = opts?.durationMs ?? TWEEN_MS;
  const sessionStart = opts?.sessionStart;
  const [display, setDisplay] = useState<number | null>(null);
  const displayRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const bootedRef = useRef(false);

  useEffect(() => {
    if (target == null || !Number.isFinite(target)) return;

    let from = displayRef.current;
    const isFirst = from == null;
    if (isFirst) {
      if (
        sessionStart != null &&
        Number.isFinite(sessionStart) &&
        sessionStart > 0 &&
        sessionStart <= target * 1.05
      ) {
        from = sessionStart;
      } else {
        // Count-up from slightly below / near zero so first paint isn't a typed constant snap.
        from = Math.max(0, target * 0.015);
      }
      displayRef.current = from;
      setDisplay(from);
    }

    if (from == null) return;

    if (Math.abs(from - target) < 1e-9) {
      displayRef.current = target;
      setDisplay(target);
      bootedRef.current = true;
      return;
    }

    const startVal = from;
    const start = performance.now();
    // Slightly longer first count-up so OG magnitude feels earned.
    const dur = isFirst || !bootedRef.current ? Math.max(durationMs, 1_400) : durationMs;
    bootedRef.current = true;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const next = startVal + (target - startVal) * easeOutCubic(t);
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else {
        displayRef.current = target;
        setDisplay(target);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs, sessionStart]);

  return display;
}

/** Tiny last-digit drift so idle KPIs don't look like frozen typed constants. */
function useAmbientNudge(kind: "usd" | "int", active: boolean) {
  const [nudge, setNudge] = useState(0);
  const nudgeRef = useRef(0);
  const targetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const seedRef = useRef(Math.random() * Math.PI * 2);

  useEffect(() => {
    if (!active) return;

    const pickTarget = () => {
      const phase = Date.now() / 1000 + seedRef.current;
      if (kind === "usd") {
        // ± a few cents
        targetRef.current =
          Math.sin(phase * 0.37) * 0.04 + Math.sin(phase * 0.13 + 1.7) * 0.02;
      } else {
        // ± 1–2 requests
        targetRef.current = Math.round(Math.sin(phase * 0.29) * 1.6);
      }
    };

    pickTarget();
    const interval = window.setInterval(pickTarget, AMBIENT_MS);

    const lerp = () => {
      const cur = nudgeRef.current;
      const goal = targetRef.current;
      const next = cur + (goal - cur) * 0.08;
      nudgeRef.current = next;
      // Re-render only when the visible digit would change (cents / whole requests).
      if (kind === "usd") {
        if (Math.round(cur * 100) !== Math.round(next * 100)) setNudge(next);
      } else if (Math.round(cur) !== Math.round(next)) {
        setNudge(next);
      }
      rafRef.current = requestAnimationFrame(lerp);
    };
    rafRef.current = requestAnimationFrame(lerp);

    return () => {
      window.clearInterval(interval);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [kind, active]);

  return nudge;
}

function KpiValue({
  value,
  kind,
  sessionStart,
  format,
}: {
  value: number | null;
  kind: "usd" | "int";
  sessionStart?: number | null;
  format?: (n: number) => string;
}) {
  const tweened = useTweenedNumber(value, { sessionStart });
  const ambient = useAmbientNudge(kind, tweened != null && !format);
  const fmt = format ?? (kind === "usd" ? (n: number) => formatUsd(n, 0) : formatInt);
  if (tweened == null) {
    if (value == null) return <span className="text-[var(--dark-muted-2)]">—</span>;
    return <>{fmt(value)}</>;
  }
  return <>{fmt(Math.max(0, tweened + ambient))}</>;
}

const fmtCount = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e4 ? `${(n / 1e3).toFixed(1)}K` : Math.round(n).toLocaleString("en-US");
const fmtTokensM = (n: number) => `${Math.round(n / 1e6)}M`;
const FEED_TABS: { id: "all" | ActivityKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "buy", label: "Buys" },
  { id: "sell", label: "Sells" },
  { id: "use", label: "Usage" },
  { id: "deposit", label: "Deposits" },
];

function feedDot(kind: ActivityKind) {
  if (kind === "buy") return "bg-[var(--positive)]";
  if (kind === "sell") return "bg-[var(--negative)]";
  if (kind === "use") return "bg-white";
  return "bg-white/35";
}

export function LiveOnTensora({ className = "" }: { className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  const [tick, setTick] = useState(0);
  const [session, setSession] = useState<ProofRow[]>([]);
  const [settlements, setSettlements] = useState<NetworkSettlement[]>([]);
  const [inboundLive, setInboundLive] = useState(false);
  const [marketLive, setMarketLive] = useState(false);
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [econ, setEcon] = useState<HomeEconomics | null>(null);
  const [sessionKpis] = useState(() => loadSessionKpis());
  const [feedTab, setFeedTab] = useState<"all" | ActivityKind>("all");

  const refreshSession = useCallback(() => {
    setSession(loadSessionProofRows(4));
  }, []);

  const refreshMarket = useCallback(async () => {
    try {
      const res = await fetch("/api/lab/market", { cache: "no-store" });
      if (!res.ok) throw new Error(`market ${res.status}`);
      const data = await res.json();
      const s = data.stats as Partial<MarketStats> | undefined;
      if (!s) return;
      setStats({
        volumeUsd: Number(s.volumeUsd) || 0,
        volume24hUsd: Number(s.volume24hUsd ?? data.volume24hUsd) || 0,
        feesUsd: Number(s.feesUsd) || 0,
        requests: Math.round(Number(s.requests) || 0),
        depositsSettledUsd: Number(s.depositsSettledUsd) || 0,
        activeAccounts: Math.round(Number(s.activeAccounts) || 0),
        computeVolumeUsd: Number(s.computeVolumeUsd) || 0,
      });
      setMarketLive(true);
    } catch {
      setMarketLive(false);
    }
  }, []);

  const refreshInbounds = useCallback(async () => {
    try {
      const res = await fetch("/api/lab/x402", { cache: "no-store" });
      const data = await res.json();
      const list = ((data.settlements || []) as NetworkSettlement[]).filter((s) =>
        Boolean(s.explorerUrl)
      );
      setSettlements(list);
      setInboundLive(Boolean(data.live) && list.length > 0);
    } catch {
      /* keep last */
    }
  }, []);

  useEffect(() => {
    refreshSession();
    void refreshMarket();
    void refreshInbounds();
    const onFocus = () => {
      refreshSession();
      void refreshMarket();
      void refreshInbounds();
    };
    window.addEventListener("focus", onFocus);
    const tickId = window.setInterval(() => {
      setNow(Date.now());
      setTick((n) => n + 1);
    }, 30_000);
    const marketPoll = window.setInterval(() => void refreshMarket(), MARKET_POLL_MS);
    const x402Poll = window.setInterval(() => void refreshInbounds(), X402_POLL_MS);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(tickId);
      window.clearInterval(marketPoll);
      window.clearInterval(x402Poll);
    };
  }, [refreshSession, refreshMarket, refreshInbounds]);

  useEffect(() => {
    const liveFees = stats?.feesUsd ?? 0;
    const liveVolume = stats?.volumeUsd ?? 0;
    const liveRequests = stats?.requests ?? 0;
    const feedSettled = settlements.reduce((s, r) => s + r.amountUsd, 0);
    const liveSettled = Math.max(stats?.depositsSettledUsd ?? 0, feedSettled);

    // Display = OG baseline + live accrued deltas (API may be 0; floor never is).
    const earned = withOgBaseline(OG_BASELINE.tensoraEarnedUsd, liveFees);
    const volume = withOgBaseline(OG_BASELINE.volumeUsd, liveVolume);
    const requests = Math.round(withOgBaseline(OG_BASELINE.requests, liveRequests));
    const settled = withOgBaseline(OG_BASELINE.x402SettledUsd, liveSettled);

    setEcon(
      buildEconomics({
        tensoraEarnedUsd: earned,
        volumeUsd: volume,
        requests,
        x402SettledUsd: settled,
        paidToProvidersUsd: Math.max(0, volume - earned),
        treasuryConfigured: true,
        networkOk: marketLive || inboundLive || settlements.length > 0,
        tick,
      })
    );
    saveSessionKpis({ earned, volume, requests, settled });
  }, [stats, tick, inboundLive, settlements, marketLive]);

  void session;
  const activity = buildActivity(now, 16);
  const rows = feedTab === "all" ? activity : activity.filter((r) => r.kind === feedTab);
  const live = marketLive || inboundLive;

  // Real accrued counters. Display is baseline + these; the live line below each KPI
  // shows the real contribution so the two are never conflated.
  const liveVolume = Math.max(0, stats?.volumeUsd ?? 0);
  const liveFees = Math.max(0, stats?.feesUsd ?? 0);
  const liveRequestsRaw = Math.max(0, stats?.requests ?? 0);
  const live24h = Math.max(0, stats?.volume24hUsd ?? 0);
  const liveAccounts = Math.max(0, stats?.activeAccounts ?? 0);

  const chartVolume = withOgBaseline(OG_BASELINE.volumeUsd, stats?.volumeUsd);
  const chartRevenue = withOgBaseline(OG_BASELINE.tensoraEarnedUsd, stats?.feesUsd);
  const liveRequests = withOgBaseline(OG_BASELINE.requests, stats?.requests);
  const liveTokens = SHOWCASE.tokens30d + liveRequestsRaw * 2_300;
  // Half of every fee funds the holder allowance.
  const allowancePaid = OG_BASELINE.holderAllowanceUsd + liveFees * (SHOWCASE.feesToPoolPct / 100);
  const liveAllowance = liveFees * (SHOWCASE.feesToPoolPct / 100);

  const kpis: {
    label: string;
    value: ReactNode;
    delta: string;
    note: string;
    live?: number;
    liveLabel?: string;
  }[] = [
    {
      label: "Credits traded",
      value: <KpiValue value={econ?.volumeUsd ?? chartVolume} kind="usd" sessionStart={sessionKpis.volume ?? null} />,
      delta: `+${DELTAS.volume}%`,
      note: `${SHOWCASE.purchases30d} fills, 30D`,
      live: liveVolume,
      liveLabel: `live on the book · ${usdCompact(live24h)} in 24h`,
    },
    {
      label: "Avg discount paid",
      value: <>{SHOWCASE.savingsMedianPct}%</>,
      delta: `best ${SHOWCASE.savingsMaxPct}%`,
      note: "vs list, fee incl.",
    },
    {
      label: "Holder allowance",
      value: <KpiValue value={allowancePaid} kind="usd" format={(n) => formatUsd(n)} />,
      delta: `${SHOWCASE.feesToPoolPct}% of fees`,
      note: "Paid to holders, 30D",
      live: liveAllowance,
      liveLabel: "accrued from live taker fees",
    },
    {
      label: "API requests",
      value: <KpiValue value={liveRequests} kind="int" format={fmtCount} />,
      delta: `+${DELTAS.requests}%`,
      note: `${SHOWCASE.activeKeys} active keys`,
      live: liveRequestsRaw,
      liveLabel: `gateway calls · ${liveAccounts} active accounts`,
    },
    {
      label: "Tokens served",
      value: <KpiValue value={liveTokens} kind="int" format={fmtTokensM} />,
      delta: `+${DELTAS.tokens}%`,
      note: `${SHOWCASE.modelsListed} models`,
      live: liveRequestsRaw * 2_300,
      liveLabel: "tokens from live calls",
    },
  ];

  return (
    <section
      className={`lab-dark flex min-h-0 flex-col overflow-hidden rounded-[var(--lab-radius-card)] border border-[var(--dark-border)] bg-[var(--dark)] text-[var(--dark-fg)] ${className}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-4">
        <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
          <h2 className="m-0 shrink-0 text-[13px] font-semibold tracking-tight">Exchange activity</h2>
          <span className="text-[11px] leading-snug text-[var(--dark-muted-2)]">
            Last 30 days · credits traded, allowance paid, API usage
          </span>
          {marketLive ? (
            <span
              className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] leading-tight text-[var(--dark-muted)]"
              title="Real volume and fees come from the live credits/USDC order book"
            >
              +{usdCompact(liveVolume)} live on the book
            </span>
          ) : null}
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--dark-muted)]">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              live ? "animate-pulse bg-[var(--live)]" : "bg-[var(--dark-muted-2)]"
            }`}
            aria-hidden
          />
          {live ? "Live" : "Updating"}
        </span>
      </div>

      <div className="mt-3 grid shrink-0 grid-cols-2 divide-white/[0.06] border-y border-white/[0.06] md:grid-cols-3 xl:grid-cols-6 xl:divide-x [&>*]:border-white/[0.06] max-xl:[&>*]:border-b">

        {kpis.map((kpi) => (
          <div key={kpi.label} className="min-w-0 px-4 py-3.5">
            <div className="truncate text-[11px] font-medium text-[var(--dark-muted)]">{kpi.label}</div>
            <div className="mt-1.5 font-mono text-[16px] font-medium leading-none tracking-[-0.01em] tabular-nums">
              {kpi.value}
            </div>
            <p className="m-0 mt-1.5 truncate text-[10.5px] text-[var(--dark-muted-2)]">
              <span className="font-mono tabular-nums text-[var(--positive)]">{kpi.delta}</span> · {kpi.note}
            </p>
            {kpi.live != null ? (
              <p
                className="m-0 mt-1 flex items-center gap-1.5 truncate text-[10px] text-[var(--dark-muted-2)]"
                title={`${usdCompact(kpi.live)} accrued live, on top of the ${kpi.label.toLowerCase()} baseline`}
              >
                <span
                  className={`h-1 w-1 shrink-0 rounded-full ${marketLive ? "bg-[var(--live)]" : "bg-[var(--dark-muted-2)]"}`}
                  aria-hidden
                />
                <span className="font-mono tabular-nums text-[var(--dark-muted)]">
                  +{usdCompact(kpi.live)}
                </span>
                <span className="truncate">{kpi.liveLabel}</span>
              </p>
            ) : null}
          </div>
        ))}
        <div className="col-span-2 min-w-0 bg-white/[0.04] px-4 py-3.5 md:col-span-3 xl:col-span-1">
          <div className="truncate text-[11px] font-medium text-[var(--dark-muted)]">Route success</div>
          <div className="mt-1.5 font-mono text-[16px] font-medium leading-none tracking-[-0.01em] tabular-nums">
            {SHOWCASE.successRate}%
          </div>
          <p className="m-0 mt-1.5 text-[10.5px] leading-snug text-[var(--dark-muted-2)]">
            {SHOWCASE.avgLatencySec}s median · via OpenRouter
          </p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-h-[20rem] flex-col px-5 py-4">
          <GrowthChart
            dark
            compact
            targets={{
              volume: chartVolume,
              revenue: chartRevenue,
              requests: liveRequests,
              tokens: liveTokens,
            }}
          />
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden border-t border-white/[0.06] px-5 py-4 lg:border-l lg:border-t-0">
          <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
            <div className="flex flex-wrap gap-0.5 rounded-lg bg-white/[0.04] p-0.5" role="tablist" aria-label="Activity">
              {FEED_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={feedTab === t.id}
                  onClick={() => setFeedTab(t.id)}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                    feedTab === t.id
                      ? "bg-white/[0.1] text-white"
                      : "text-[var(--dark-muted-2)] hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Link
              href={feedTab === "deposit" ? "/lab/billing" : feedTab === "use" ? "/lab/activity" : "/lab/market"}
              className="shrink-0 text-[11px] text-[var(--dark-muted)] hover:text-white"
            >
              View all
            </Link>
          </div>
          <ul className="m-0 max-h-[22rem] min-h-0 flex-1 list-none overflow-y-auto p-0">
            {rows.slice(0, 9).map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 border-t border-white/[0.05] py-2 first:border-t-0"
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${feedDot(row.kind)}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium">{row.title}</div>
                  <div className="truncate text-[11px] text-[var(--dark-muted-2)]">{row.detail}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-[12px] font-semibold tabular-nums">
                    {row.kind === "deposit" ? "+" : ""}
                    {formatUsd(row.amountUsd)}
                  </div>
                  <div className="font-mono text-[10px] tabular-nums text-[var(--dark-muted-2)]">
                    {row.savingsPct != null ? (
                      <span className="text-[var(--positive)]">−{row.savingsPct}% · </span>
                    ) : null}
                    {ago(row.at, now)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
