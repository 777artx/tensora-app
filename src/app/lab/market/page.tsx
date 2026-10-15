"use client";

import { useState } from "react";
import { LabChrome } from "@/components/lab/lab-chrome";
import { MarketAdvanced } from "@/components/olora/market-advanced";
import { SimpleTrade } from "@/components/olora/simple-trade";
import { Segmented } from "@/components/olora/primitives";
import { useMarketQuote } from "@/lib/olora/hooks";
import { pct, usd } from "@/lib/olora/pricing";

type View = "book" | "simple";

/** The book is the page. Simple buy/sell is one switch away. */
export default function MarketPage() {
  const quote = useMarketQuote();
  const [view, setView] = useState<View>("book");
  const [rev, setRev] = useState(0);

  const askLine = !quote.loaded
    ? "Loading the book…"
    : quote.bestAsk == null
      ? "No credits are on offer."
      : quote.discount > 0
        ? `$1 of credit is ${usd(quote.creditCost)} · ${pct(quote.discount, 1)} off, fee included`
        : `$1 of credit is ${usd(quote.creditCost)}, fee included`;

  return (
    <LabChrome active="market" title="Market">
      <div className="mx-auto w-full max-w-[1440px] px-5 pt-5 md:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <h1 className="m-0 text-[22px] font-medium tracking-[-0.02em] text-[var(--ink)]">Market <span className="ml-2 align-middle text-[13px] font-normal tracking-normal text-[var(--silver)]">{askLine}</span></h1>
          <Segmented
            label="Market view"
            value={view}
            onChange={setView}
            options={[
              { value: "book", label: "Order book" },
              { value: "simple", label: "Buy & sell" },
            ]}
          />
        </div>

        {view === "book" ? (
          <MarketAdvanced key={rev} />
        ) : (
          <div className="mx-auto max-w-[440px] pb-16">
            <SimpleTrade quote={quote} onDone={() => setRev((r) => r + 1)} />
            <p className="m-0 mt-4 text-[13px] leading-relaxed text-[var(--silver)]">
              A credit is worth $1 of model usage. You buy at the best price on the book, and you can sell unused credits back the same way.
            </p>
          </div>
        )}
      </div>
    </LabChrome>
  );
}
