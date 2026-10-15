"use client";

import type { BookSnapshot } from "@/components/lab/credit-order-book";

/** Cumulative depth chart from the live book. Bids green (left), asks red (right). */
export function DepthChart({ book }: { book: BookSnapshot | null }) {
  const w = 320;
  const h = 120;
  if (!book || (!book.asks.length && !book.bids.length)) {
    return <div className="h-full min-h-[96px] rounded-lg bg-white/[0.02]" />;
  }

  const bids = [...book.bids].sort((a, b) => b.price - a.price);
  const asks = [...book.asks].sort((a, b) => a.price - b.price);
  const lo = Math.min(...bids.map((l) => l.price), ...asks.map((l) => l.price));
  const hi = Math.max(...bids.map((l) => l.price), ...asks.map((l) => l.price));
  const maxDepth = Math.max(book.depthAsk, book.depthBid, 1);
  const x = (p: number) => ((p - lo) / Math.max(hi - lo, 1e-6)) * w;
  const y = (d: number) => h - (d / maxDepth) * (h - 8);

  let cum = 0;
  const bidPts = bids.map((l) => {
    cum += l.sizeUsd;
    return [x(l.price), y(cum)] as const;
  });
  cum = 0;
  const askPts = asks.map((l) => {
    cum += l.sizeUsd;
    return [x(l.price), y(cum)] as const;
  });

  const step = (pts: readonly (readonly [number, number])[], startX: number) => {
    let d = `M${startX} ${h}`;
    let prevY = h;
    for (const [px, py] of pts) {
      d += ` L${px.toFixed(1)} ${prevY.toFixed(1)} L${px.toFixed(1)} ${py.toFixed(1)}`;
      prevY = py;
    }
    return d;
  };

  const bidLine = step(bidPts, bidPts[0]?.[0] ?? 0);
  const askLine = step(askPts, askPts[0]?.[0] ?? w);
  const bidArea = `${bidLine} L0 ${bidPts.at(-1)?.[1] ?? h} L0 ${h} Z`;
  const askArea = `${askLine} L${w} ${askPts.at(-1)?.[1] ?? h} L${w} ${h} Z`;
  const midX = book.mid != null ? x(book.mid) : w / 2;

  return (
    <div className="relative h-full min-h-[96px]">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="depth-bid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ecb81" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#0ecb81" stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="depth-ask" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f6465d" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#f6465d" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <path d={bidArea} fill="url(#depth-bid)" />
        <path d={askArea} fill="url(#depth-ask)" />
        <path d={`${bidLine} L0 ${bidPts.at(-1)?.[1] ?? h}`} fill="none" stroke="#0ecb81" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
        <path d={`${askLine} L${w} ${askPts.at(-1)?.[1] ?? h}`} fill="none" stroke="#f6465d" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
        <line x1={midX} x2={midX} y1={0} y2={h} stroke="rgba(255,255,255,0.18)" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between font-mono text-[10px] text-[var(--silver)]">
        <span>{lo.toFixed(2)}</span>
        <span className="text-white/50">{book.mid?.toFixed(3)}</span>
        <span>{hi.toFixed(2)}</span>
      </div>
    </div>
  );
}
