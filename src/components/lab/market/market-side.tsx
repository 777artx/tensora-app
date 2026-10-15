"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { BookSnapshot } from "@/components/lab/credit-order-book";
import { DepthChart } from "@/components/lab/market/depth-chart";
import { sampleAddress, tapeKind } from "@/components/lab/market/live-book";

/** Rows shown in the public fills feed. */
const TAPE_MAX = 20;

/**
 * A fill is a ledger trade — matching two accounts never broadcasts a tx, so a
 * fill has no transaction of its own. The counterparty wallet is the only
 * on-chain footprint, so a fill links to that wallet's explorer page.
 */
const BASESCAN = "https://basescan.org";

function ago(iso: string, now: number) {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

function shortAddress(address: string) {
  const hex = address.startsWith("0x") ? address.slice(2) : address;
  return `0x${hex.slice(0, 4)}…${hex.slice(-4)}`;
}

function addressFor(id: string, wallet?: string) {
  if (wallet) return wallet;
  if (!id.startsWith("live-")) return "";
  const n = Number(id.slice(5));
  return Number.isFinite(n) ? sampleAddress(n) : "";
}

export function MarketSide({
  book,
  orders,
  orderCount = 0,
}: {
  book: BookSnapshot | null;
  orders: ReactNode;
  orderCount?: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [tab, setTab] = useState<"fills" | "orders">("fills");

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const raw = book?.tape ?? [];
  // Real ledger trades always come first, at the top. Local dev simulations stay
  // inline with them so the preview flow reads naturally, but carry no live mark.
  // Opening prints only fill the space real trades leave — they never push one out.
  const real = raw.filter((t) => tapeKind(t.id) === "real").slice(0, TAPE_MAX);
  const sim = raw.filter((t) => tapeKind(t.id) === "sim").slice(0, TAPE_MAX - real.length);
  const floor = raw
    .filter((t) => tapeKind(t.id) === "floor")
    .slice(0, Math.max(0, TAPE_MAX - real.length - sim.length));
  const tape = [...real, ...sim, ...floor].slice(0, TAPE_MAX);
  const realIds = new Set(real.map((t) => t.id));
  const liveCount = real.length;

  // Slide in the newest fill only when it arrives after first paint.
  const firstTop = useRef<string | null | undefined>(undefined);
  if (firstTop.current === undefined && book) firstTop.current = tape[0]?.id ?? null;
  const freshId = tape[0] && tape[0].id !== firstTop.current ? tape[0].id : null;
  const bidShare = book ? book.depthBid / Math.max(book.depthAsk + book.depthBid, 1) : 0.5;

  return (
    <div className="flex h-auto min-h-0 flex-col lg:h-full">
      <div className="shrink-0 px-4 pb-3 pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="ol-label">Depth</span>
          <span className="ol-num text-[11px] text-[var(--silver)]">
            ${Math.round(book?.depthBid ?? 0).toLocaleString()} bid · ${Math.round(book?.depthAsk ?? 0).toLocaleString()} ask
          </span>
        </div>
        <div className="mt-2.5 h-[88px]">
          <DepthChart book={book} />
        </div>
        <div className="mt-3 flex h-[2px] overflow-hidden rounded-full bg-white/[0.12]">
          <div className="bg-white/70" style={{ width: `${bidShare * 100}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[10px] text-[var(--silver)]">
          <span>Bids {(bidShare * 100).toFixed(0)}%</span>
          <span>Asks {((1 - bidShare) * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col border-t border-white/[0.06]">
        <div className="flex shrink-0 items-center gap-4 border-b border-white/[0.06] px-4 pt-3 text-[12px]" role="tablist">
          {(
            [
              {
                id: "fills",
                label: (
                  <span className="inline-flex items-baseline gap-1.5">
                    Recent fills
                    {liveCount > 0 ? <span className="ol-num text-[10px] text-[var(--silver)]">{liveCount} live</span> : null}
                  </span>
                ),
              },
              { id: "orders", label: orderCount ? `My orders · ${orderCount}` : "My orders" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 pb-2 font-medium transition-colors ${
                tab === t.id ? "border-white/70 text-[var(--ink)]" : "border-transparent text-[var(--silver)] hover:text-[var(--graphite)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "fills" ? (
          <ul className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-0 py-1.5">
            {tape.map((t) => {
              const isReal = realIds.has(t.id);
              const address = isReal ? addressFor(t.id, t.wallet) : "";
              const href = address ? `${BASESCAN}/address/${address}` : "";
              const cells = (
                <>
                  <span className={t.side === "buy" ? "ol-bid" : "ol-ask"}>{t.price.toFixed(4)}</span>
                  <span className="text-right text-[var(--graphite)]">{t.sizeUsd.toFixed(2)}</span>
                  <span className="text-right text-[var(--silver)]" suppressHydrationWarning>
                    {ago(t.at, now)}
                  </span>
                  <span className="truncate text-right text-[11px] tracking-[-0.02em] text-[var(--silver)] group-hover:text-[var(--ink)]">
                    {address ? shortAddress(address) : isReal ? "live" : ""}
                  </span>
                </>
              );
              const rowClass =
                "grid grid-cols-[4.5rem_3rem_2.25rem_minmax(0,1fr)] items-baseline gap-2 px-4 py-[4px] font-mono text-[12px] tabular-nums";
              return (
                <li key={t.id} className={t.id === freshId ? "ol-tape-in" : ""}>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      title={`${address} on BaseScan`}
                      className={`group ${rowClass} transition-colors hover:bg-white/[0.04]`}
                    >
                      {cells}
                    </a>
                  ) : (
                    <div className={rowClass}>{cells}</div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{orders}</div>
        )}
      </div>
    </div>
  );
}
