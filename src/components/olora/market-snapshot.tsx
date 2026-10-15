"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { BookLevel, BookSnapshot } from "@/components/lab/credit-order-book";
import { LiveDot } from "@/components/olora/primitives";
import { useLabAuth } from "@/lib/lab/auth";
import { labAuthHeaders } from "@/lib/lab/lab-fetch";
import { effectiveCreditCost, marketDiscount, pct, usd } from "@/lib/olora/pricing";

export type MarketSnap = { book: BookSnapshot | null; feeBps: number; volume24h: number; loaded: boolean };

/** Polls the real order book. One source for the Overview. */
export function useMarketSnap(pollMs = 8_000): MarketSnap {
  const { getAccessToken } = useLabAuth();
  const tokenRef = useRef(getAccessToken);
  tokenRef.current = getAccessToken;
  const [s, setS] = useState<MarketSnap>({ book: null, feeBps: 100, volume24h: 0, loaded: false });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const headers = await labAuthHeaders(() => tokenRef.current());
        const res = await fetch("/api/lab/market", { headers });
        if (!res.ok) throw new Error();
        const d = (await res.json()) as { book: BookSnapshot; yourFeeBps?: number; config?: { feeBps: number }; volume24hUsd?: number };
        if (alive) setS({ book: d.book, feeBps: d.yourFeeBps ?? d.config?.feeBps ?? 100, volume24h: d.volume24hUsd ?? 0, loaded: true });
      } catch {
        if (alive) setS((p) => ({ ...p, loaded: true }));
      }
    };
    void load();
    const t = window.setInterval(() => void load(), pollMs);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [pollMs]);
  return s;
}

function Px({ n, className = "" }: { n: number | null | undefined; className?: string }) {
  if (n == null) return <span className={`ol-num ${className}`}>—</span>;
  const s = n.toFixed(4);
  return (
    <span className={`ol-num ${className}`}>
      {s.slice(0, -2)}
      <span className="opacity-45">{s.slice(-2)}</span>
    </span>
  );
}

function Ladder({ rows, side, max }: { rows: BookLevel[]; side: "ask" | "bid"; max: number }) {
  return (
    <ul className="m-0 list-none p-0">
      {rows.map((l) => (
        <li key={l.id} className="relative grid grid-cols-2 px-5 py-[3px] font-mono text-[12px] tabular-nums">
          <span
            aria-hidden
            className={`absolute inset-y-[2px] right-0 ${side === "ask" ? "ol-bar-ask" : "ol-bar-bid"}`}
            style={{ width: `${Math.min(100, (l.sizeUsd / max) * 100)}%` }}
          />
          <span className={`relative ${side === "ask" ? "ol-ask" : "ol-bid"}`}>{l.price.toFixed(4)}</span>
          <span className="relative text-right text-[var(--graphite)]">${l.sizeUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The black box on the Overview: the live price of $1 of AI credit, and the top of
 * the real book. Every number comes from /api/lab/market.
 */
export function MarketSnapshot({ snap }: { snap: MarketSnap }) {
  const b = snap.book;
  const cost = effectiveCreditCost(b?.bestAsk, snap.feeBps);
  const off = marketDiscount(b?.bestAsk, snap.feeBps);
  const asks = b ? b.asks.slice(0, 5).reverse() : [];
  const bids = b ? b.bids.slice(0, 5) : [];
  const max = Math.max(1, ...asks.map((l) => l.sizeUsd), ...bids.map((l) => l.sizeUsd));

  return (
    <section className="ol-panel overflow-hidden">
      <header className="ol-panel-head">
        <span className="flex items-center gap-2">
          <LiveDot on={!!b} />
          <span className="ol-label text-[var(--graphite)]">Credits / USDC</span>
        </span>
        <span className="ol-label">{b ? "Live order book" : snap.loaded ? "Unavailable" : "Connecting"}</span>
      </header>

      <div className="px-5 pb-5 pt-5">
        <div className="ol-label">$1.00 of AI credit costs</div>
        <div className="mt-3 flex items-baseline gap-3">
          <Px n={snap.loaded ? cost : null} className="text-[48px] leading-none text-[var(--ink)]" />
          {off > 0 ? <span className="ol-num text-[14px] text-white/55">−{pct(off, 1)}</span> : null}
        </div>
        <p className="m-0 mt-2 text-[12px] text-[var(--silver)]">Best offer, fee included. Spends like $1.00 on any supported model.</p>
      </div>

      <div className="border-t border-[var(--hairline)] py-2">
        <div className="grid grid-cols-2 px-5 pb-1 pt-1">
          <span className="ol-label">Price</span>
          <span className="ol-label text-right">Size</span>
        </div>
        {b ? (
          <>
            <Ladder rows={asks} side="ask" max={max} />
            <div className="my-1 flex items-center justify-between border-y border-[var(--hairline)] px-5 py-2">
              <Px n={b.mid} className="text-[15px] text-[var(--ink)]" />
              <span className="ol-num text-[11px] text-[var(--silver)]">spread {b.spread?.toFixed(4) ?? "—"}</span>
            </div>
            <Ladder rows={bids} side="bid" max={max} />
          </>
        ) : (
          <div className="px-5 py-10 text-center text-[12px] text-[var(--silver)]">{snap.loaded ? "The order book is unavailable right now." : "Loading the book…"}</div>
        )}
      </div>

      <dl className="m-0 grid grid-cols-3 border-t border-[var(--hairline)]">
        {[
          ["Ask depth", b ? usd(b.depthAsk, { min: 0, max: 0 }) : "—"],
          ["Bid depth", b ? usd(b.depthBid, { min: 0, max: 0 }) : "—"],
          ["24h volume", usd(snap.volume24h, { min: 0, max: 0 })],
        ].map(([k, v], i) => (
          <div key={k} className={`px-5 py-3.5 ${i ? "border-l border-[var(--hairline)]" : ""}`}>
            <dt className="ol-label">{k}</dt>
            <dd className="m-0 mt-1.5 ol-num text-[14px] text-[var(--ink)]">{v}</dd>
          </div>
        ))}
      </dl>

      <Link
        href="/lab/market"
        className="flex h-12 items-center justify-between border-t border-[var(--hairline)] px-5 text-[13px] text-[var(--graphite)] transition-colors hover:bg-[var(--cloud)] hover:text-[var(--ink)]"
      >
        Open the full order book
        <span aria-hidden>→</span>
      </Link>
    </section>
  );
}
