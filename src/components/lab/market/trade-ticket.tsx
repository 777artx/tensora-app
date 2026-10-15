"use client";

import Link from "next/link";
import type { BookSnapshot } from "@/components/lab/credit-order-book";

type Side = "buy" | "sell";
type Kind = "limit" | "market";

export type TicketProps = {
  side: Side;
  setSide: (s: Side) => void;
  type: Kind;
  setType: (t: Kind) => void;
  price: string;
  setPrice: (v: string) => void;
  size: string;
  setSize: (v: string) => void;
  book: BookSnapshot | null;
  feeBps: number;
  preview: { label: string; value: number; fee: number } | null;
  sizeNum: number;
  busy: boolean;
  authenticated: boolean;
  balances: { credits: number; usdc: number } | null;
  msg: { text: string; tone: "ok" | "err" } | null;
  minPrice?: number;
  maxPrice?: number;
  onBest: () => void;
  onSubmit: () => void;
};

const SIZES = [25, 50, 100, 500];
const input =
  "block w-full rounded-[10px] bg-black/60 px-3 py-2.5 font-mono text-[15px] tabular-nums text-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(255,255,255,0.07)] outline-none transition-shadow placeholder:text-white/25 focus:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]";

export function TradeTicket(p: TicketProps) {
  const buy = p.side === "buy";
  const saved = buy && p.preview ? Math.max(0, p.sizeNum - p.preview.value) : 0;

  return (
    <div className="flex h-auto min-h-0 flex-col p-4 [scrollbar-width:none] lg:h-full lg:overflow-y-auto">
      <div role="tablist" aria-label="Buy or sell" className="grid w-full grid-cols-2 gap-1 rounded-[11px] bg-white/[0.05] p-1 ring-1 ring-inset ring-white/[0.06]">
        {(["buy", "sell"] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={p.side === s}
            onClick={() => p.setSide(s)}
            className={`flex h-9 items-center justify-center rounded-[8px] text-[13px] font-medium transition-[background-color,color] duration-150 ${
              p.side === s ? "bg-[#f5f5f2] text-[#0a0a0a]" : "text-white/50 hover:bg-white/[0.04] hover:text-white"
            }`}
          >
            {s === "buy" ? "Buy credits" : "Sell credits"}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-5 border-b border-white/[0.06] px-1 text-[12px]">
        {(["limit", "market"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => p.setType(t)}
            className={`-mb-px border-b-2 pb-2 font-medium capitalize transition-colors ${
              p.type === t ? "border-white/70 text-white" : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {p.type === "limit" ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-white/50">
            <label htmlFor="ticket-price">Limit price</label>
            <button type="button" onClick={p.onBest} className="font-mono text-[11px] text-[var(--graphite)] hover:text-white">
              Use best {buy ? "ask" : "bid"}
            </button>
          </div>
          <div className="relative mt-1.5">
            <input
              id="ticket-price"
              type="number"
              min={p.minPrice ?? 0.8}
              max={p.maxPrice ?? 1}
              step={0.0025}
              value={p.price}
              onChange={(e) => p.setPrice(e.target.value)}
              className={input}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-white/35">USDC</span>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[12px] text-white/55">
          Fills now at best {buy ? "ask" : "bid"}{" "}
          <span className="font-mono text-white">
            {(buy ? p.book?.bestAsk : p.book?.bestBid)?.toFixed(4) ?? "—"}
          </span>
        </div>
      )}

      <label className="mt-3 block">
        <span className="text-[11px] text-white/50">Size · credit face value</span>
        <div className="relative mt-1.5">
          <input
            type="number"
            min={1}
            step={1}
            value={p.size}
            onChange={(e) => p.setSize(e.target.value)}
            className={input}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-white/35">USD</span>
        </div>
      </label>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {SIZES.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => p.setSize(String(n))}
            className={`rounded-md py-1.5 font-mono text-[11px] transition-colors ${
              p.sizeNum === n ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-white/[0.03] text-white/50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] hover:text-white"
            }`}
          >
            ${n}
          </button>
        ))}
      </div>

      <dl className="mt-3 space-y-1.5 text-[12px]">
        <div className="flex justify-between text-white/45">
          <dt>Taker fee ({(p.feeBps / 100).toFixed(1)}%)</dt>
          <dd className="m-0 font-mono tabular-nums">${(p.preview?.fee ?? 0).toFixed(2)}</dd>
        </div>
        <div className="flex justify-between text-white">
          <dt>{p.preview?.label ?? (buy ? "Est. cost" : "Est. proceeds")}</dt>
          <dd className="m-0 font-mono text-[14px] font-semibold tabular-nums">${(p.preview?.value ?? 0).toFixed(2)}</dd>
        </div>
        {buy && saved > 0 ? (
          <div className="flex justify-between ol-up">
            <dt>Below face value</dt>
            <dd className="m-0 font-mono tabular-nums">${saved.toFixed(2)}</dd>
          </div>
        ) : null}
      </dl>

      <button
        type="button"
        onClick={p.onSubmit}
        disabled={p.busy || p.sizeNum <= 0}
        className={`mt-3 w-full shrink-0 rounded-[10px] py-2.5 text-[13px] font-medium transition-[filter,opacity] hover:brightness-110 disabled:opacity-50 ${
          buy ? "bg-[var(--brand)] text-[var(--brand-ice)]" : "bg-transparent text-[var(--ink)] ring-1 ring-[var(--mist)]"
        }`}
      >
        {p.busy
          ? "Working…"
          : !p.authenticated
            ? "Sign in to trade"
            : `${buy ? "Buy" : "Sell"} $${p.sizeNum.toFixed(2)} credits`}
      </button>

      {p.msg ? (
        <p className={`m-0 mt-3 text-[12px] ${p.msg.tone === "ok" ? "ol-up" : "ol-down"}`}>
          {p.msg.text}{" "}
          {p.msg.tone === "err" && /deposit|billing|need \$/i.test(p.msg.text) ? (
            <Link href="/lab/billing" className="underline underline-offset-2">
              Open Billing →
            </Link>
          ) : null}
        </p>
      ) : null}

      <p className="m-0 mt-auto pt-3 text-[11px] leading-relaxed text-white/35">
        {p.balances
          ? `Balance $${p.balances.usdc.toFixed(2)} USDC · $${p.balances.credits.toFixed(2)} credits. `
          : "Sign in to see balances. "}
        Limit orders escrow funds until filled or cancelled.
      </p>
    </div>
  );
}
