"use client";

import Link from "next/link";
import { LabChrome } from "@/components/lab/lab-chrome";
import { HeroLine } from "@/components/olora/hero-line";
import { AllowancePanel } from "@/components/olora/allowance-panel";
import { LabMark } from "@/components/olora/lab-mark";
import { useEffect, useState } from "react";
import { useMarketSnap } from "@/components/olora/market-snapshot";
import { LiveDot } from "@/components/olora/primitives";
import { SavingsDemo } from "@/components/olora/savings-demo";
import { curatedModels } from "@/lib/olora/models";
import { loadBillingHistory } from "@/lib/lab/credits";
import { effectiveCreditCost, marketDiscount, pct, savingsFromHistory, usd } from "@/lib/olora/pricing";

const ACTIONS = [
  { title: "Buy", body: "Credits below their $1.00 usage value.", href: "/lab/market", cta: "Buy credits" },
  { title: "Use", body: "One API key for every model below.", href: "/lab/keys", cta: "Get a key" },
  { title: "Sell", body: "List what you won't use. Others buy it.", href: "/lab/market", cta: "List credits" },
] as const;

function rate(n: number) {
  return `$${n.toFixed(2)}`;
}

/** Overview: the thesis, the live price as an object, then holding and models. */
export default function HomePage() {
  const snap = useMarketSnap();
  const [saved, setSaved] = useState(0);
  useEffect(() => {
    const read = () => setSaved(savingsFromHistory(loadBillingHistory()));
    read();
    window.addEventListener("tensora-credits-change", read);
    return () => window.removeEventListener("tensora-credits-change", read);
  }, []);
  const b = snap.book;
  const cost = effectiveCreditCost(b?.bestAsk, snap.feeBps);
  const off = marketDiscount(b?.bestAsk, snap.feeBps);
  const models = curatedModels();

  const strip: [string, string][] = [
    ["Best ask", b?.bestAsk != null ? b.bestAsk.toFixed(4) : "—"],
    ["Best bid", b?.bestBid != null ? b.bestBid.toFixed(4) : "—"],
    ["Discount", snap.loaded ? pct(off, 1) : "—"],
    ["24h volume", usd(snap.volume24h, { min: 0, max: 0 })],
  ];

  return (
    <LabChrome active="home" title="Overview" bare>
      <div className="mx-auto w-full max-w-[1200px] px-5 md:px-8">
        {/* Hero: copy, then the line-art full-bleed, then the live strip. */}
        <section className="pt-8 lg:pt-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:items-end lg:gap-16">
            <div className="min-w-0">
              <p className="ol-rise m-0 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--silver)]">
                Credits / USDC · live
              </p>
              <h1 className="ol-rise ol-rise-1 m-0 mt-6 text-[clamp(32px,4.6vw,56px)] font-medium leading-[1.02] tracking-[-0.04em] text-[var(--ink)]">
                Buy $1 of AI credits
                <span className="block">for less than $1.</span>
                <span className="mt-2 block text-[var(--silver)]">Use them or trade them.</span>
              </h1>
              <p className="ol-rise ol-rise-2 m-0 mt-6 max-w-[34rem] text-[16px] leading-[1.55] text-[var(--gray)]">
                Olora is a live marketplace for discounted AI credits. Spend them on the world&rsquo;s leading AI models through one API, or sell what you don&rsquo;t use.
              </p>
              {saved > 0 ? (
                <p className="ol-rise ol-rise-3 m-0 mt-6 text-[16px] text-[var(--ink)]">
                  You&rsquo;ve saved {usd(saved)} with Olora
                </p>
              ) : null}
              <div className="ol-rise ol-rise-3 mt-8 flex flex-wrap items-center gap-3">
                <Link href="/lab/market" className="inline-flex h-11 items-center gap-3 rounded-[10px] bg-[var(--brand)] pl-5 pr-4 text-[14px] font-medium text-[var(--brand-ice)] hover:bg-[var(--brand-hover)]">
                  Buy credits
                  {off > 0 ? <span className="font-mono text-[12px] text-[var(--brand-ice)]/70">−{pct(off, 1)}</span> : null}
                </Link>
                <Link href="/lab/keys" className="inline-flex h-11 items-center px-3 text-[14px] font-medium text-[var(--ink)] underline-offset-4 hover:underline">
                  Get an API key →
                </Link>
              </div>
            </div>

            <dl className="ol-rise ol-rise-3 m-0 grid grid-cols-3 border-t border-[var(--hairline)]">
              {ACTIONS.map((a, i) => (
                <div key={a.title} className={`pt-4 ${i ? "border-l border-[var(--hairline)] pl-4" : "pr-4"}`}>
                  <dt className="flex items-baseline justify-between gap-2">
                    <span className="text-[15px] font-medium text-[var(--ink)]">{a.title}</span>
                    <span className="font-mono text-[10px] text-[var(--silver)]">0{i + 1}</span>
                  </dt>
                  <dd className="m-0 mt-1.5 text-[13px] leading-snug text-[var(--gray)]">{a.body}</dd>
                  <dd className="m-0 mt-2">
                    <Link href={a.href} className="text-[12px] font-medium text-[var(--ink)] underline-offset-4 hover:underline">
                      {a.cta} →
                    </Link>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Line-art. Bleeds left (cables run off-canvas) and fades at both edges. */}
          <div className="ol-rise ol-rise-2 relative mt-12 lg:mt-14">
            {/* Cables run off-canvas to the left (no scroll from leftward overflow); knobs sit past the right edge. */}
            <div className="ml-auto w-[88%] pr-[6%] md:w-[80%]">
              <HeroLine />
            </div>
          </div>

          {/* Live strip */}
          <div className="mt-6 flex flex-wrap items-stretch border-y border-[var(--hairline)]">
            <div className="flex items-center gap-2 py-3 pr-6">
              <LiveDot on={!!b} />
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--silver)]">$1.00 of credit costs</span>
              <span className="font-mono text-[13px] tabular-nums text-[var(--ink)]">{snap.loaded ? cost.toFixed(4) : "—"}</span>
            </div>
            <dl className="m-0 flex flex-1 flex-wrap">
              {strip.map(([k, v]) => (
                <div key={k} className="flex items-baseline gap-2 border-l border-[var(--hairline)] px-5 py-3">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--silver)]">{k}</dt>
                  <dd className="m-0 font-mono text-[13px] tabular-nums text-[var(--ink)]">{v}</dd>
                </div>
              ))}
            </dl>
            <Link
              href="/lab/market"
              className="flex items-center gap-2 border-l border-[var(--hairline)] py-3 pl-5 text-[13px] font-medium text-[var(--ink)] underline-offset-4 hover:underline"
            >
              Open the full order book →
            </Link>
          </div>
        </section>

        <div className="h-12" />

        {/* Holder allowance */}
        <section className="grid gap-10 pb-16 lg:grid-cols-[minmax(0,1fr)_560px] lg:gap-16">
          <div className="max-w-[460px]">
            <p className="ol-label m-0">Hold</p>
            <h2 className="m-0 mt-3 text-[28px] font-medium tracking-[-0.025em] text-[var(--ink)]">
              Hold the token. Get AI credit every day.
            </h2>
            <p className="m-0 mt-3 text-[15px] leading-relaxed text-[var(--gray)]">
              Part of every market fee buys AI credit for $OLORA holders, paid continuously by how much you hold.
              Spend it on any model below, or sell it into the order book for USDC in one click.
            </p>
          </div>
          <div className="min-w-0">
            <AllowancePanel snap={snap} />
          </div>
        </section>

        {/* The pitch, played out */}
        <section className="pb-16">
          <h2 className="m-0 mb-5 text-[28px] font-medium tracking-[-0.025em] text-[var(--ink)]">
            One API key. Same models. Less spend.
          </h2>
          <SavingsDemo snap={snap} />
        </section>

        {/* Models, in one black box */}
        <section className="pb-20">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="ol-label m-0">Use</p>
              <h2 className="m-0 mt-3 text-[28px] font-medium tracking-[-0.025em] text-[var(--ink)]">14 frontier models, one key</h2>
            </div>
            <Link href="/lab/keys" className="text-[14px] font-medium text-[var(--ink)] underline-offset-4 hover:underline">
              One API for all of them →
            </Link>
          </div>

          <div className="ol-panel overflow-hidden">
            <header className="ol-panel-head">
              <span className="ol-label text-[var(--graphite)]">Per 1M tokens · in / out · on Olora today</span>
              <span className="font-mono text-[11px] text-white/45">× {snap.loaded ? cost.toFixed(4) : "—"}</span>
            </header>
            <ul className="m-0 grid list-none p-0 md:grid-cols-2">
              {models.map((m, i) => (
                <li
                  key={m.id}
                  className={`flex items-center gap-3 border-t border-white/[0.06] px-4 py-2.5 ${
                    i % 2 === 1 ? "md:border-l" : ""
                  } ${i < 2 ? "md:border-t-0" : ""} ${i === 0 ? "border-t-0" : ""}`}
                >
                  <LabMark provider={m.provider} size={28} tone="dark" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] text-[#f5f5f2]">{m.name}</div>
                    <div className="truncate text-[11px] text-white/40">
                      {m.providerName} · {m.bestFor}
                    </div>
                  </div>
                  <div className="shrink-0 text-right font-mono tabular-nums">
                    <div className="text-[12px] text-white/45">
                      {rate(m.inputPerM)} / {rate(m.outputPerM)}
                    </div>
                    <div className="text-[13px] text-[#f5f5f2]">
                      {snap.loaded ? `${rate(m.inputPerM * cost)} / ${rate(m.outputPerM * cost)}` : "—"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="m-0 border-t border-white/[0.06] px-4 py-3 text-[11px] text-white/40">
              Grey is each lab&rsquo;s list rate. White is what it costs paying with credit bought at today&rsquo;s best ask, fee included. Routed via OpenRouter.
            </p>
          </div>
        </section>

        <p className="m-0 mt-10 text-center text-[13px] text-[var(--muted)]">
          New to Olora?{" "}
          <Link href="/lab/faq" className="text-[var(--ink)] underline-offset-2 hover:underline">
            Read the FAQ
          </Link>
        </p>
      </div>
    </LabChrome>
  );
}
