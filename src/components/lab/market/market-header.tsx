"use client";

import type { BookSnapshot } from "@/components/lab/credit-order-book";
import { LiveDot } from "@/components/olora/primitives";

/** Instrument strip: the pair, its price, and the four numbers a trader checks. */
export function MarketHeader({
  book,
  volume24h,
  feeBps,
  feeTierLabel,
}: {
  book: BookSnapshot | null;
  volume24h: number;
  feeBps: number;
  feeTierLabel: string | null;
}) {
  const discount = book?.bestAsk != null ? (1 - book.bestAsk) * 100 : null;
  const spreadPct = book?.spread != null && book.mid ? (book.spread / book.mid) * 100 : null;
  const mid = book?.mid != null ? book.mid.toFixed(4) : null;
  const stats = [
    { label: "Best ask", value: book?.bestAsk?.toFixed(4) ?? "—", note: discount != null ? `${discount.toFixed(1)}% below list` : "No offers", tone: "ol-ask" },
    { label: "Best bid", value: book?.bestBid?.toFixed(4) ?? "—", note: "Standing bid", tone: "ol-bid" },
    { label: "Spread", value: book?.spread?.toFixed(4) ?? "—", note: spreadPct != null ? `${spreadPct.toFixed(2)}%` : "", tone: "" },
    { label: "24h volume", value: `$${volume24h.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, note: "USDC settled", tone: "" },
    { label: "Taker fee", value: `${(feeBps / 100).toFixed(2)}%`, note: feeTierLabel ?? "Makers pay 0", tone: "" },
  ];

  return (
    <div className="ol-panel grid grid-cols-1 lg:grid-cols-[auto_minmax(0,1fr)]">
      <div className="flex items-center gap-5 border-b border-white/[0.06] px-5 py-4 lg:border-b-0 lg:border-r">
        <div>
          <div className="flex items-center gap-2">
            <LiveDot on={!!book} />
            <span className="ol-label text-[var(--graphite)]">Credits / USDC</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="ol-num text-[30px] leading-none text-[var(--ink)]">
              {mid ? (
                <>
                  {mid.slice(0, -2)}
                  <span className="text-[var(--silver)]">{mid.slice(-2)}</span>
                </>
              ) : (
                "—"
              )}
            </span>
            <span className="ol-label">Mid</span>
          </div>
        </div>
      </div>
      <dl className="m-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s, i) => (
          <div key={s.label} className={`min-w-0 px-5 py-4 ${i > 0 ? "lg:border-l lg:border-white/[0.06]" : ""}`}>
            <dt className="ol-label">{s.label}</dt>
            <dd className={`m-0 mt-2 truncate ol-num text-[17px] leading-none ${s.tone || "text-[var(--ink)]"}`}>{s.value}</dd>
            <div className="mt-1.5 truncate text-[11px] text-[var(--silver)]">{s.note}</div>
          </div>
        ))}
      </dl>
    </div>
  );
}
