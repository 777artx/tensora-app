"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MarketSnap } from "@/components/olora/market-snapshot";
import { LiveDot } from "@/components/olora/primitives";
import { useLabAuth } from "@/lib/lab/auth";
import { labAuthHeaders } from "@/lib/lab/lab-fetch";
import { pct, usd } from "@/lib/olora/pricing";

type Allowance = {
  live: boolean;
  holderFloor: number;
  dailyPoolUsd: number;
  eligibleHolders: number;
  myAccruedUsd: number;
  myClaimedUsd: number;
  myBalanceTokens: number;
  myShare: number;
  myDailyUsd: number;
  myWallets: string[];
};

const MIN_SELL_USD = 1;

function amt(n: number) {
  return usd(n, { min: 2, max: n > 0 && n < 1 ? 4 : 2 });
}

/**
 * Holder allowance: what your $OLORA earns per day in AI credit, and the two
 * things you can do with it. Sell = claim + market sell into the best bid.
 */
export function AllowancePanel({ snap }: { snap: MarketSnap }) {
  const { getAccessToken, authenticated, requireAuth } = useLabAuth();
  const tokenRef = useRef(getAccessToken);
  tokenRef.current = getAccessToken;
  const [a, setA] = useState<Allowance | null>(null);
  const [busy, setBusy] = useState<"sell" | "claim" | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const headers = await labAuthHeaders(() => tokenRef.current());
      const res = await fetch("/api/lab/earn", { headers });
      if (res.ok) setA((await res.json()) as Allowance);
    } catch {
      /* keep last */
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(t);
  }, [load, authenticated]);

  const bid = snap.book?.bestBid ?? null;
  const fee = snap.feeBps / 10000;
  const accrued = a?.myAccruedUsd ?? 0;
  const proceeds = bid != null ? accrued * bid * (1 - fee) : null;
  const holds = (a?.myBalanceTokens ?? 0) >= (a?.holderFloor ?? Infinity);

  async function post(url: string, body?: unknown) {
    const headers = await labAuthHeaders(() => tokenRef.current());
    const res = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; claimedUsd?: number } | null;
    return { ok: res.ok && !!data?.ok, data };
  }

  async function claim(thenSell: boolean) {
    if (!requireAuth("/lab/home")) return;
    setBusy(thenSell ? "sell" : "claim");
    setMsg(null);
    try {
      const c = await post("/api/lab/earn");
      if (!c.ok) {
        setMsg({ text: c.data?.error || "Nothing to claim yet.", ok: false });
        return;
      }
      const claimed = c.data?.claimedUsd ?? 0;
      if (!thenSell) {
        setMsg({ text: `${amt(claimed)} of credit added to your balance.`, ok: true });
        return;
      }
      if (claimed < MIN_SELL_USD) {
        setMsg({ text: `${amt(claimed)} claimed as credit. Sells start at $${MIN_SELL_USD}; it will keep accruing.`, ok: true });
        return;
      }
      const s = await post("/api/lab/market", { action: "place", side: "sell", type: "market", sizeUsd: Math.floor(claimed * 100) / 100 });
      setMsg(
        s.ok
          ? { text: `Sold ${amt(claimed)} of credit into the book. USDC is in your Portfolio.`, ok: true }
          : { text: `Claimed ${amt(claimed)} as credit, but the sell didn't fill: ${s.data?.error || "no bids"}.`, ok: false },
      );
    } finally {
      setBusy(null);
      void load();
    }
  }

  const status = !authenticated
    ? "Sign in with the wallet that holds $OLORA."
    : !a?.myWallets.length
      ? "No wallet linked. Sign in with your holder wallet."
      : !holds
        ? `Hold at least ${(a?.holderFloor ?? 10000).toLocaleString()} $OLORA to qualify.`
        : `${(a?.myBalanceTokens ?? 0).toLocaleString()} $OLORA · ${pct(a?.myShare ?? 0, 3)} of eligible supply`;

  return (
    <section className="ol-panel overflow-hidden">
      <header className="ol-panel-head">
        <span className="flex items-center gap-2">
          <LiveDot on={!!a?.live} />
          <span className="ol-label text-[var(--graphite)]">Holder allowance</span>
        </span>
        <span className="ol-label">{a ? (a.live ? "Accruing" : "Starts at launch") : "Connecting"}</span>
      </header>

      <div className="grid gap-px bg-[var(--hairline)] sm:grid-cols-3">
        {[
          ["Your allowance / day", a ? amt(a.myDailyUsd) : "—"],
          ["Ready to use or sell", a ? amt(accrued) : "—"],
          ["Sells now for", proceeds != null && a ? `${amt(proceeds)} USDC` : "—"],
        ].map(([k, v]) => (
          <div key={k} className="bg-[#0a0a0a] px-5 py-4">
            <div className="ol-label">{k}</div>
            <div className="ol-num mt-2 text-[20px] text-[var(--ink)]">{v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--hairline)] px-5 py-4">
        <p className="m-0 text-[12px] text-[var(--silver)]">{status}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void claim(true)}
            disabled={busy != null || (authenticated && accrued <= 0)}
            className="inline-flex h-9 items-center rounded-[10px] bg-[var(--brand)] px-4 text-[13px] font-medium text-[var(--brand-ice)] hover:bg-[var(--brand-hover)] disabled:opacity-40"
          >
            {busy === "sell" ? "Selling…" : bid != null ? `Sell at ${bid.toFixed(4)}` : "Sell"}
          </button>
          <button
            type="button"
            onClick={() => void claim(false)}
            disabled={busy != null || (authenticated && accrued <= 0)}
            className="inline-flex h-9 items-center rounded-[10px] px-4 text-[13px] font-medium text-[var(--ink)] ring-1 ring-[var(--mist)] hover:bg-[var(--cloud)] disabled:opacity-40"
          >
            {busy === "claim" ? "Claiming…" : "Use as credit"}
          </button>
        </div>
      </div>
      {msg ? (
        <p className={`m-0 border-t border-[var(--hairline)] px-5 py-3 text-[12px] ${msg.ok ? "ol-up" : "ol-down"}`}>
          {msg.text}{" "}
          {msg.ok ? <Link href="/lab/keys" className="underline underline-offset-2">Get an API key →</Link> : null}
        </p>
      ) : null}

      <dl className="m-0 grid grid-cols-3 border-t border-[var(--hairline)]">
        {[
          ["Pool released / 24h", a ? usd(a.dailyPoolUsd) : "—"],
          ["Holders earning", a ? a.eligibleHolders.toLocaleString() : "—"],
          ["Claimed to date", a ? usd(a.myClaimedUsd) : "—"],
        ].map(([k, v], i) => (
          <div key={k} className={`px-5 py-3 ${i ? "border-l border-[var(--hairline)]" : ""}`}>
            <dt className="ol-label">{k}</dt>
            <dd className="m-0 mt-1 ol-num text-[13px] text-[var(--ink)]">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
