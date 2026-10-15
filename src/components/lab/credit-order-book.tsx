"use client";

import { useEffect, useMemo, useState } from "react";

export type BookLevel = {
  id: string;
  price: number;
  discountBps: number;
  sizeUsd: number;
  totalUsd: number;
  bandId: string;
  side: "ask" | "bid";
};

export type BookTape = {
  id: string;
  at: string;
  price: number;
  sizeUsd: number;
  side: "buy" | "sell";
  /** Taker wallet, when the trade came from a linked wallet. */
  wallet?: string;
};

export type BookSnapshot = {
  pair: string;
  asks: BookLevel[];
  bids: BookLevel[];
  mid: number | null;
  spread: number | null;
  bestAsk: number | null;
  bestBid: number | null;
  depthAsk: number;
  depthBid: number;
  tape: BookTape[];
  updatedAt: string;
};

function fmtPrice(n: number) {
  return n.toFixed(4);
}

function fmtSize(n: number) {
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toFixed(n >= 100 ? 0 : 2);
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "now";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

type Props = {
  book: BookSnapshot | null;
  selectedBandId?: string;
  onSelectBand?: (bandId: string, price: number) => void;
  compact?: boolean;
};

export function CreditOrderBook({ book, selectedBandId, onSelectBand, compact }: Props) {
  const [tick, setTick] = useState(0);
  const [flashId, setFlashId] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!book?.updatedAt) return;
    const best = book.asks[0]?.id || book.bids[0]?.id;
    if (!best) return;
    setFlashId(best);
    const t = window.setTimeout(() => setFlashId(null), 600);
    return () => window.clearTimeout(t);
  }, [book?.updatedAt, book?.asks, book?.bids]);

  const maxAsk = useMemo(
    () => Math.max(1, ...(book?.asks.map((l) => l.sizeUsd) || [1])),
    [book?.asks]
  );
  const maxBid = useMemo(
    () => Math.max(1, ...(book?.bids.map((l) => l.sizeUsd) || [1])),
    [book?.bids]
  );

  if (!book) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-[12px] text-[var(--dark-muted)]">
        Loading order book…
      </div>
    );
  }

  const askLimit = compact ? 8 : 14;
  const bidLimit = compact ? 8 : 14;
  const askRows = [...book.asks].reverse().slice(-askLimit);
  const bidRows = book.bids.slice(0, bidLimit);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/35 font-mono text-[12px]">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/50" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80">
            {book.pair}
          </span>
        </div>
        <div className="text-[10px] tabular-nums text-white/40">
          Mid {book.mid != null ? fmtPrice(book.mid) : "—"}
          {book.spread != null ? ` · spr ${fmtPrice(book.spread)}` : ""}
          <span className="ml-2" suppressHydrationWarning>
            {tick >= 0 ? new Date(book.updatedAt).toLocaleTimeString() : ""}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1fr_1fr] gap-0 border-b border-white/[0.06] px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-white/30">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>

      <div className="px-1 py-1">
        {askRows.map((l) => {
          const pct = Math.min(100, (l.sizeUsd / maxAsk) * 100);
          const active = selectedBandId === l.bandId;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onSelectBand?.(l.bandId, l.price)}
              className={`relative grid w-full grid-cols-[1fr_1fr_1fr] items-center gap-0 rounded-sm px-2 py-[3px] text-left transition-colors ${
                active ? "bg-white/10" : "hover:bg-white/[0.035]"
              } ${flashId === l.id ? "bg-rose-500/10" : ""}`}
            >
              <span
                className="pointer-events-none absolute inset-y-0 right-0 bg-rose-500/15"
                style={{ width: `${pct}%` }}
              />
              <span className="relative z-[1] tabular-nums text-rose-300/95">
                {fmtPrice(l.price)}
              </span>
              <span className="relative z-[1] text-right tabular-nums text-white/70">
                {fmtSize(l.sizeUsd)}
              </span>
              <span className="relative z-[1] text-right tabular-nums text-white/35">
                {fmtSize(l.totalUsd)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mx-2 my-1 flex items-center justify-between rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
        <div>
          <div className="text-[9px] uppercase tracking-[0.1em] text-white/35">Last / mid</div>
          <div className="text-[15px] font-semibold tabular-nums text-white">
            {book.mid != null ? fmtPrice(book.mid) : "—"}
            <span className="ml-1.5 text-[10px] font-normal text-white/40">USDC</span>
          </div>
        </div>
        <div className="text-right text-[10px] leading-relaxed text-white/40">
          <div className="tabular-nums">
            ask {book.bestAsk != null ? fmtPrice(book.bestAsk) : "—"}
          </div>
          <div className="tabular-nums">
            bid {book.bestBid != null ? fmtPrice(book.bestBid) : "—"}
          </div>
        </div>
      </div>

      <div className="px-1 py-1">
        {bidRows.map((l) => {
          const pct = Math.min(100, (l.sizeUsd / maxBid) * 100);
          const active = selectedBandId === l.bandId;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onSelectBand?.(l.bandId, l.price)}
              className={`relative grid w-full grid-cols-[1fr_1fr_1fr] items-center gap-0 rounded-sm px-2 py-[3px] text-left transition-colors ${
                active ? "bg-white/10" : "hover:bg-white/[0.035]"
              } ${flashId === l.id ? "bg-emerald-500/10" : ""}`}
            >
              <span
                className="pointer-events-none absolute inset-y-0 right-0 bg-emerald-500/15"
                style={{ width: `${pct}%` }}
              />
              <span className="relative z-[1] tabular-nums text-emerald-300/95">
                {fmtPrice(l.price)}
              </span>
              <span className="relative z-[1] text-right tabular-nums text-white/70">
                {fmtSize(l.sizeUsd)}
              </span>
              <span className="relative z-[1] text-right tabular-nums text-white/35">
                {fmtSize(l.totalUsd)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-white/[0.07] px-3 py-2 text-[10px] text-white/35">
        <span>Ask depth ${fmtSize(book.depthAsk)}</span>
        <span>Bid depth ${fmtSize(book.depthBid)}</span>
      </div>

      {!compact && book.tape.length > 0 ? (
        <div className="border-t border-white/[0.07]">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-white/30">
            Recent fills
          </div>
          <ul className="m-0 max-h-28 list-none space-y-0 overflow-y-auto p-0 px-1 pb-2">
            {book.tape.map((t) => (
              <li
                key={t.id}
                className="grid grid-cols-[1fr_1fr_auto] gap-2 px-2 py-1 text-[11px]"
              >
                <span
                  className={`tabular-nums ${
                    t.side === "buy" ? "text-emerald-300/90" : "text-rose-300/90"
                  }`}
                >
                  {fmtPrice(t.price)}
                </span>
                <span className="text-right tabular-nums text-white/65">{fmtSize(t.sizeUsd)}</span>
                <span className="text-white/30">{timeAgo(t.at)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
