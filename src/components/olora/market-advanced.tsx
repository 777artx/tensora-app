"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BookSnapshot } from "@/components/lab/credit-order-book";
import { SIM_ENABLED, applyQuote, applyTrade, seedBook, waitForQuote, waitForTrade } from "@/components/lab/market/live-book";
import { MarketHeader } from "@/components/lab/market/market-header";
import { MarketSide } from "@/components/lab/market/market-side";
import { OrderLadder } from "@/components/lab/market/order-ladder";
import { TradeTicket } from "@/components/lab/market/trade-ticket";
import { useLabAuth } from "@/lib/lab/auth";
import { labAuthHeaders } from "@/lib/lab/lab-fetch";
import { pushActivity } from "@/lib/lab/projects";

type MyOrder = {
  id: string;
  side: "buy" | "sell";
  price: number;
  sizeUsd: number;
  originalUsd: number;
  createdAt: string;
};

type MarketConfig = {
  feeBps: number;
  minPrice: number;
  maxPrice: number;
  minOrderUsd: number;
  maxOrderUsd: number;
  houseBidPoolUsd: number;
};

type MarketResponse = {
  book: BookSnapshot;
  volume24hUsd: number;
  config: MarketConfig;
  myOrders: MyOrder[];
  balances: { credits: number; usdc: number } | null;
  yourFeeBps?: number;
  feeTierLabel?: string | null;
};

type PlaceResult = {
  filledUsd: number;
  avgPrice: number | null;
  notionalUsd: number;
  feeUsd: number;
  restingOrder: { id: string; side: "buy" | "sell"; price: number; sizeUsd: number } | null;
  credits: number;
  usdc: number;
};

function fmt(n: number | null | undefined, digits = 2) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

/** Full order book: limit/market orders, depth, tape, open orders. Unchanged trading logic. */
export function MarketAdvanced() {
  const { getAccessToken, authenticated, requireAuth, ready } = useLabAuth();
  const tokenRef = useRef(getAccessToken);
  tokenRef.current = getAccessToken;

  const [book, setBook] = useState<BookSnapshot | null>(null);
  const [volume24h, setVolume24h] = useState(0);
  const [config, setConfig] = useState<MarketConfig | null>(null);
  const [myOrders, setMyOrders] = useState<MyOrder[]>([]);
  const [balances, setBalances] = useState<{ credits: number; usdc: number } | null>(null);
  const [yourFeeBps, setYourFeeBps] = useState<number | null>(null);
  const [feeTierLabel, setFeeTierLabel] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [type, setType] = useState<"limit" | "market">("limit");
  const [price, setPrice] = useState("0.9500");
  const [size, setSize] = useState("25");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "err" } | null>(null);

  const simStarted = useRef(false);
  const bookRef = useRef<BookSnapshot | null>(null);
  /** USDC notional of local preview fills, added on top of the server's 24h volume. */
  const [simVolume, setSimVolume] = useState(0);
  const countedFills = useRef(new Set<string>());

  useEffect(() => {
    if (!SIM_ENABLED || !book) return;
    let add = 0;
    for (const t of book.tape) {
      if (!t.id.startsWith("live-") || countedFills.current.has(t.id)) continue;
      countedFills.current.add(t.id);
      add += t.price * t.sizeUsd;
    }
    if (add > 0) setSimVolume((v) => Math.round((v + add) * 100) / 100);
  }, [book]);

  const applyState = useCallback((data: MarketResponse) => {
    setBook((current) => (simStarted.current && current ? current : data.book));
    setVolume24h(data.volume24hUsd || 0);
    setConfig(data.config);
    setMyOrders(data.myOrders || []);
    if (data.balances) setBalances(data.balances);
    if (typeof data.yourFeeBps === "number") setYourFeeBps(data.yourFeeBps);
    if (data.feeTierLabel !== undefined) setFeeTierLabel(data.feeTierLabel);
  }, []);

  const load = useCallback(async () => {
    try {
      const headers = await labAuthHeaders(() => tokenRef.current());
      const res = await fetch("/api/lab/market", { headers });
      if (!res.ok) {
        setLoadError(`Market unavailable (${res.status})`);
        return;
      }
      setLoadError(null);
      applyState((await res.json()) as MarketResponse);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load market");
    }
  }, [applyState]);

  useEffect(() => {
    void load();
    const poll = window.setInterval(() => void load(), 6_000);
    return () => window.clearInterval(poll);
  }, [load]);

  useEffect(() => {
    bookRef.current = book;
  }, [book]);

  useEffect(() => {
    if (!SIM_ENABLED) return;
    let tradeTimer = 0;
    let quoteTimer = 0;
    let n = 14;
    let stop = false;
    const armTrade = () => {
      tradeTimer = window.setTimeout(() => {
        if (stop) return;
        n += 1;
        const seq = n;
        setBook((current) => (current ? applyTrade(current, seq) : current));
        armTrade();
      }, waitForTrade());
    };
    const armQuote = () => {
      quoteTimer = window.setTimeout(() => {
        if (stop) return;
        setBook((current) => (current ? applyQuote(current) : current));
        armQuote();
      }, waitForQuote());
    };
    const watch = window.setInterval(() => {
      if (stop || simStarted.current) return;
      const current = bookRef.current;
      if (!current || (current.bestAsk == null && current.bestBid == null)) return;
      simStarted.current = true;
      setBook(seedBook(current));
      window.clearInterval(watch);
      armTrade();
      armQuote();
    }, 400);
    return () => {
      stop = true;
      simStarted.current = false;
      window.clearInterval(watch);
      window.clearTimeout(tradeTimer);
      window.clearTimeout(quoteTimer);
    };
  }, []);

  useEffect(() => {
    if (ready && authenticated) void load();
  }, [ready, authenticated, load]);

  const feeBps = yourFeeBps ?? config?.feeBps ?? 100;
  const sizeNum = Math.max(0, Number(size) || 0);
  const priceNum = Math.max(0, Number(price) || 0);

  const preview = useMemo(() => {
    if (sizeNum <= 0) return null;
    const px =
      type === "market" ? (side === "buy" ? book?.bestAsk ?? 1 : book?.bestBid ?? 0.9) : priceNum;
    if (!px) return null;
    const notional = Math.round(sizeNum * px * 100) / 100;
    const fee = Math.round(notional * (feeBps / 10000) * 100) / 100;
    if (side === "buy") {
      return {
        label: "Est. cost (incl. fee)",
        value: Math.round((notional + fee) * 100) / 100,
        fee,
      };
    }
    return {
      label: "Est. proceeds (after fee)",
      value: Math.round((notional - fee) * 100) / 100,
      fee,
    };
  }, [sizeNum, priceNum, type, side, book?.bestAsk, book?.bestBid, feeBps]);

  async function submit() {
    if (!requireAuth("/lab/market")) return;
    setBusy(true);
    setMsg(null);
    try {
      const headers = await labAuthHeaders(() => tokenRef.current());
      const res = await fetch("/api/lab/market", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "place",
          side,
          type,
          sizeUsd: sizeNum,
          ...(type === "limit" ? { price: priceNum } : {}),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | ({ ok?: boolean; error?: string; result?: PlaceResult } & Partial<MarketResponse>)
        | null;
      if (!res.ok || !data?.ok) {
        setMsg({ text: data?.error || "Order failed", tone: "err" });
        return;
      }
      const r = data.result!;
      const parts: string[] = [];
      if (r.filledUsd > 0) {
        parts.push(`Filled $${fmt(r.filledUsd)} @ ${fmt(r.avgPrice, 4)} (fee $${fmt(r.feeUsd)})`);
      }
      if (r.restingOrder) {
        parts.push(`$${fmt(r.restingOrder.sizeUsd)} resting @ ${fmt(r.restingOrder.price, 4)}`);
      }
      if (!parts.length) parts.push("Order accepted");
      setMsg({ text: parts.join(" · "), tone: "ok" });
      pushActivity({
        kind: "market",
        title: `${side === "buy" ? "Buy" : "Sell"} ${type}: $${fmt(sizeNum)} credits`,
        detail: parts.join(" · "),
        amount:
          side === "buy"
            ? `−$${fmt(r.notionalUsd + r.feeUsd)} → +$${fmt(r.filledUsd)}`
            : `−$${fmt(r.filledUsd)} → +$${fmt(r.notionalUsd - r.feeUsd)}`,
        resource: "Credit market",
        provider: "Market",
        status: "ok",
      });
      setBalances({ credits: r.credits, usdc: r.usdc });
      applyState(data as MarketResponse);
    } finally {
      setBusy(false);
    }
  }

  async function cancel(orderId: string) {
    setBusy(true);
    try {
      const headers = await labAuthHeaders(() => tokenRef.current());
      const res = await fetch("/api/lab/market", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "cancel", orderId }),
      });
      const data = (await res.json().catch(() => null)) as
        | ({ ok?: boolean; error?: string; credits?: number; usdc?: number } & Partial<MarketResponse>)
        | null;
      if (!res.ok || !data?.ok) {
        setMsg({ text: data?.error || "Cancel failed", tone: "err" });
        return;
      }
      setMsg({ text: "Order cancelled — escrow refunded.", tone: "ok" });
      if (typeof data.credits === "number" && typeof data.usdc === "number") {
        setBalances({ credits: data.credits, usdc: data.usdc });
      }
      applyState(data as MarketResponse);
    } finally {
      setBusy(false);
    }
  }

  const setBest = () => {
    const px = side === "buy" ? book?.bestAsk : book?.bestBid;
    if (px != null) setPrice(px.toFixed(4));
  };

  const ordersList = !authenticated ? (
    <p className="m-0 text-[12px] text-white/45">Sign in to see your orders.</p>
  ) : myOrders.length === 0 ? (
    <p className="m-0 text-[12px] leading-relaxed text-white/45">
      No resting orders. Place a limit order and it sits on the book until it fills or you cancel it.
    </p>
  ) : (
    <ul className="m-0 list-none space-y-1.5 p-0">
      {myOrders.map((o) => (
        <li
          key={o.id}
          className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2.5 py-2 font-mono text-[11px] tabular-nums"
        >
          <span className={o.side === "buy" ? "ol-bid" : "ol-ask"}>
            {o.side.toUpperCase()}
          </span>
          <span className="text-white">{o.price.toFixed(4)}</span>
          <span className="min-w-0 flex-1 truncate text-right text-white/55">
            ${fmt(o.sizeUsd)} / ${fmt(o.originalUsd)}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void cancel(o.id)}
            className="shrink-0 rounded-md px-1.5 py-0.5 font-sans text-[11px] text-white/50 hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <div className="flex w-full flex-col gap-4">
        {loadError ? (
          <div className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-[12px] text-[var(--negative)]">
            {loadError}{" "}
            <button type="button" className="underline" onClick={() => void load()}>
              Retry
            </button>
          </div>
        ) : null}

        <div className="shrink-0">
          <MarketHeader
            book={book}
            volume24h={volume24h + simVolume}
            feeBps={feeBps}
            feeTierLabel={feeTierLabel}
          />
        </div>

        <div className="ol-panel lab-dark min-h-0 overflow-hidden text-[var(--dark-fg)] lg:h-[620px]">
          <div className="grid min-h-0 grid-cols-1 lg:h-full lg:grid-cols-[300px_minmax(0,1fr)_minmax(240px,280px)] xl:grid-cols-[330px_minmax(0,1fr)_300px]">
            <div className="min-h-0 border-b border-white/[0.06] lg:border-b-0 lg:border-r">
              <TradeTicket
                side={side}
                setSide={setSide}
                type={type}
                setType={setType}
                price={price}
                setPrice={setPrice}
                size={size}
                setSize={setSize}
                book={book}
                feeBps={feeBps}
                preview={preview}
                sizeNum={sizeNum}
                busy={busy}
                authenticated={authenticated}
                balances={balances}
                msg={msg}
                minPrice={config?.minPrice}
                maxPrice={config?.maxPrice}
                onBest={setBest}
                onSubmit={() => void submit()}
              />
            </div>
            <div className="min-h-[440px] border-b border-white/[0.06] pb-4 lg:min-h-0 lg:border-b-0">
              <OrderLadder
                book={book}
                onPick={(px) => {
                  setType("limit");
                  setPrice(px.toFixed(4));
                }}
              />
            </div>
            <div className="min-h-0 lg:border-l lg:border-white/[0.06]">
              <MarketSide book={book} orders={ordersList} orderCount={authenticated ? myOrders.length : 0} />
            </div>
          </div>
        </div>

        <ol className="lab-howto m-0 grid shrink-0 list-none grid-cols-1 gap-3 px-1 py-2 text-[12px] leading-relaxed text-[var(--silver)] sm:grid-cols-2 sm:gap-x-8 xl:grid-cols-4">
          <li>$1.00 of credits spends like $1.00 on any model. Prices are dollars per $1 of credit.</li>
          <li>Offers include Olora-issued inventory plus customer listings. Olora keeps a standing bid so you can always sell.</li>
          <li>Limit orders hold funds until filled and refund in full on cancel. Takers pay the fee; makers pay nothing.</li>
          <li>
            Add funds from your{" "}<Link href="/lab/billing" className="text-[var(--foreground)] underline-offset-2 hover:underline">Portfolio</Link>
            .
          </li>
        </ol>
      </div>
    </>
  );
}
