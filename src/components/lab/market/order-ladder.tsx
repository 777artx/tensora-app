"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BookLevel, BookSnapshot } from "@/components/lab/credit-order-book";

const ROWS = 10;

function Row({ l, max, side, onPick }: { l: BookLevel; max: number; side: "ask" | "bid"; onPick?: (p: number) => void }) {
  const pct = Math.min(100, (l.sizeUsd / max) * 100);
  const ask = side === "ask";
  const prev = useRef(l.sizeUsd);
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    if (prev.current !== l.sizeUsd) {
      prev.current = l.sizeUsd;
      setFlash((f) => f + 1);
    }
  }, [l.sizeUsd]);
  return (
    <button
      key={flash}
      type="button"
      onClick={() => onPick?.(l.price)}
      className={`group relative grid w-full shrink-0 grid-cols-3 items-center px-4 py-[4px] text-left font-mono text-[12px] tabular-nums transition-colors hover:bg-white/[0.04] ${
        flash ? (ask ? "ol-flash-ask" : "ol-flash-bid") : ""
      }`}
    >
      <span
        className={`pointer-events-none absolute inset-y-[2px] right-0 rounded-l-sm ${ask ? "ol-bar-ask" : "ol-bar-bid"}`}
        style={{ width: `${pct}%` }}
      />
      <span className={`relative ${ask ? "ol-ask" : "ol-bid"}`}>{l.price.toFixed(4)}</span>
      <span className="relative text-right text-[var(--graphite)]">{l.sizeUsd.toFixed(2)}</span>
      <span className="relative text-right text-[var(--silver)] group-hover:text-[var(--graphite)]">{l.totalUsd.toFixed(2)}</span>
    </button>
  );
}

export function OrderLadder({ book, onPick }: { book: BookSnapshot | null; onPick?: (price: number) => void }) {
  const asks = useMemo(() => (book ? book.asks.slice(0, ROWS).reverse() : []), [book]);
  const bids = useMemo(() => (book ? book.bids.slice(0, ROWS) : []), [book]);
  const max = useMemo(() => Math.max(1, ...asks.map((l) => l.sizeUsd), ...bids.map((l) => l.sizeUsd)), [asks, bids]);
  const spreadPct = book?.spread != null && book.mid ? (book.spread / book.mid) * 100 : null;

  return (
    <div className="flex h-[520px] min-h-0 flex-col lg:h-full">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            
            <span className="lab-live-dot relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
          </span>
          <span className="ol-label text-[var(--graphite)]">Order book</span>
          <span className="font-mono text-[11px] text-white/40">CREDITS / USDC</span>
        </div>
        <span className="hidden text-[11px] text-[var(--silver)] sm:inline">Click a price to use it</span>
      </div>
      <div className="grid grid-cols-3 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--silver)]">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>

      {!book ? (
        <div className="flex flex-1 items-center justify-center text-[12px] text-white/40">Loading order book…</div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden">
            {asks.map((l) => (
              <Row key={l.id} l={l} max={max} side="ask" onPick={onPick} />
            ))}
          </div>
          <div className="my-1 flex items-center justify-between border-y border-white/[0.07] bg-white/[0.03] px-4 py-2.5">
            <div className="flex items-baseline gap-2">
              <span className="ol-num text-[20px] text-[var(--ink)]">{book.mid?.toFixed(4) ?? "—"}</span>
              <span className="text-[11px] text-white/40">mid</span>
            </div>
            <span className="ol-num text-[11px] text-[var(--silver)]">
              spread {book.spread?.toFixed(4) ?? "—"}
              {spreadPct != null ? ` · ${spreadPct.toFixed(2)}%` : ""}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {bids.map((l) => (
              <Row key={l.id} l={l} max={max} side="bid" onPick={onPick} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
