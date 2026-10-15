"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLabAuth } from "@/lib/lab/auth";
import { labAuthHeaders } from "@/lib/lab/lab-fetch";
import { refreshCreditsFromServer } from "@/lib/lab/credits";
import { pushActivity } from "@/lib/lab/projects";
import { Button, Notice, Segmented } from "@/components/olora/primitives";
import { pct, usd } from "@/lib/olora/pricing";
import type { MarketQuote } from "@/lib/olora/hooks";

type Mode = "buy" | "sell";
const AMOUNTS = [25, 50, 100, 250];

/**
 * The consumer trade: pick an amount, see what you get and what you pay, confirm.
 * Uses market orders on the real order book (/api/lab/market).
 */
export function SimpleTrade({ quote, onDone }: { quote: MarketQuote; onDone: () => void }) {
  const { authenticated, requireAuth, getAccessToken } = useLabAuth();
  const tokenRef = useRef(getAccessToken);
  tokenRef.current = getAccessToken;
  const [mode, setMode] = useState<Mode>("buy");
  const [amount, setAmount] = useState(50);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [bal, setBal] = useState<{ credits: number; usdc: number } | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    void refreshCreditsFromServer(() => tokenRef.current()).then((s) => s && setBal({ credits: s.credits, usdc: s.usdc }));
  }, [authenticated]);

  const size = custom ? Math.max(0, Number(custom) || 0) : amount;
  const fee = quote.feeBps / 10000;
  const buy = mode === "buy";
  const price = buy ? quote.bestAsk : quote.bestBid;

  const figures = useMemo(() => {
    if (price == null || size <= 0) return null;
    const notional = size * price;
    return buy
      ? { primary: notional * (1 + fee), saved: size - notional * (1 + fee) }
      : { primary: notional * (1 - fee), saved: 0 };
  }, [price, size, fee, buy]);

  async function submit() {
    if (!requireAuth("/lab/market")) return;
    if (!figures) {
      setMsg({ text: buy ? "No credits are on offer right now. Check back soon." : "No buyers right now. Try the order book to list at your own price.", tone: "error" });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const headers = await labAuthHeaders(() => tokenRef.current());
      const res = await fetch("/api/lab/market", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "place", side: mode, type: "market", sizeUsd: size }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        result?: { filledUsd: number; notionalUsd: number; feeUsd: number; credits: number; usdc: number };
      } | null;
      if (!res.ok || !data?.ok || !data.result) {
        const err = data?.error || "That didn't go through. Please try again.";
        setMsg({ text: /need \$|deposit|you have/i.test(err) ? "You don't have enough funds for this. Add funds in Billing first." : err, tone: "error" });
        return;
      }
      const r = data.result;
      setBal({ credits: r.credits, usdc: r.usdc });
      if (r.filledUsd <= 0) {
        setMsg({ text: buy ? "No credits are on offer right now. Nothing was charged." : "No buyers right now. Nothing was sold.", tone: "error" });
        return;
      }
      const text = buy
        ? `Done. You received ${usd(r.filledUsd)} in credits for ${usd(r.notionalUsd + r.feeUsd)}.`
        : `Done. You sold ${usd(r.filledUsd)} in credits for ${usd(r.notionalUsd - r.feeUsd)}.`;
      setMsg({ text, tone: "success" });
      pushActivity({ kind: "market", title: buy ? "Bought credits" : "Sold credits", detail: text, status: "ok" });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ol-panel p-6 md:p-8">
      <Segmented
        label="Buy or sell"
        value={mode}
        onChange={(v) => {
          setMode(v);
          setMsg(null);
        }}
        options={[
          { value: "buy", label: "Buy credits" },
          { value: "sell", label: "Sell credits" },
        ]}
      />

      <fieldset className="m-0 mt-8 border-0 p-0">
        <legend className="mb-3 text-[14px] text-[var(--muted)]">
          {buy ? "How many credits do you want?" : "How many credits do you want to sell?"}
        </legend>
        <div className="grid grid-cols-4 gap-2">
          {AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={!custom && amount === a}
              onClick={() => {
                setAmount(a);
                setCustom("");
              }}
              className={`h-12 rounded-[10px] font-mono text-[15px] tabular-nums transition-colors ${
                !custom && amount === a ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-white/[0.03] text-[var(--ink)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] hover:bg-white/[0.05]"
              }`}
            >
              ${a}
            </button>
          ))}
        </div>
        <label className="mt-3 flex h-12 items-center gap-2 rounded-[10px] bg-black/60 px-4 ring-1 ring-white/[0.07] focus-within:ring-white/25">
          <span className="text-[15px] text-[var(--silver)]">$</span>
          <input
            inputMode="decimal"
            placeholder="Other amount"
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))}
            className="min-w-0 flex-1 bg-transparent text-[15px] tabular-nums text-[var(--ink)] outline-none placeholder:text-[var(--silver)]"
            aria-label="Other amount in dollars of credit"
          />
        </label>
      </fieldset>

      <dl className="m-0 mt-8 space-y-3 border-t border-white/[0.06] pt-6 text-[15px]">
        <div className="flex justify-between">
          <dt className="text-[var(--muted)]">{buy ? "Credits you get" : "Credits you sell"}</dt>
          <dd className="m-0 tabular-nums text-[var(--ink)]">{usd(size)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[var(--muted)]">{buy ? "You pay" : "You receive"}</dt>
          <dd className="m-0 font-semibold tabular-nums text-[var(--ink)]">{figures ? usd(figures.primary) : "—"}</dd>
        </div>
        {buy && figures && figures.saved > 0 ? (
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">You save</dt>
            <dd className="m-0 font-medium tabular-nums text-[var(--positive)]">
              {usd(figures.saved)} ({pct(figures.saved / size, 1)})
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="m-0 mt-3 text-[12px] leading-relaxed text-[var(--silver)]">
        Includes the {pct(fee, 1)} Olora fee. {buy ? "Bought at the best available price." : "Sold to the best available offer."}
        {size > quote.askDepthUsd && buy && quote.askDepthUsd > 0 ? " Large orders may fill at more than one price." : ""}
      </p>

      {msg ? (
        <div className="mt-5">
          <Notice tone={msg.tone}>
            {msg.text}{" "}
            {msg.tone === "error" && /Billing/.test(msg.text) ? (
              <Link href="/lab/billing" className="font-medium underline underline-offset-2">Add funds</Link>
            ) : null}
          </Notice>
        </div>
      ) : null}

      <Button size="lg" className="mt-6 w-full" disabled={busy || (authenticated && !figures)} onClick={() => void submit()}>
        {busy ? "Confirming…" : !authenticated ? "Sign in to continue" : buy ? `Buy ${usd(size)} in credits` : `Sell ${usd(size)} in credits`}
      </Button>

      {authenticated && bal ? (
        <p className="m-0 mt-4 text-center text-[13px] tabular-nums text-[var(--muted)]">
          Credits {usd(bal.credits)} · Cash {usd(bal.usdc)}
        </p>
      ) : null}
    </div>
  );
}
