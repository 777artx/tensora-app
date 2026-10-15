"use client";

import Link from "next/link";
import { LabChrome } from "@/components/lab/lab-chrome";
import { LiveOnTensora } from "@/components/lab/live-on-tensora";
import { Bar, Panel, PriceBoard } from "@/components/lab/market-panels";
import { AllowancePanel } from "@/components/olora/allowance-panel";
import { useMarketSnap } from "@/components/olora/market-snapshot";
import { MODEL_MIX, SHOWCASE, usdCompact } from "@/lib/lab/dashboard-showcase";

/** The exchange dashboard: volume, fills, usage and the book, in one view. */
export default function DashboardPage() {
  const snap = useMarketSnap();

  return (
    <LabChrome active="dashboard" title="Dashboard" bare>
      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4 pb-6 pt-10">
          <div>
            <p className="ol-label m-0">Dashboard</p>
            <h1 className="m-0 mt-3 text-[clamp(30px,3.4vw,44px)] font-medium leading-[1] tracking-[-0.035em] text-[var(--ink)]">
              The exchange, live.
            </h1>
            <p className="m-0 mt-3 max-w-[520px] text-[15px] text-[var(--gray)]">
              Credits traded on the book, allowance paid to holders and API usage, last 30 days.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/lab/market" className="inline-flex h-10 items-center rounded-[10px] bg-[var(--brand)] px-5 text-[14px] font-medium text-[var(--brand-ice)] hover:bg-[var(--brand-hover)]">
              Trade credits
            </Link>
            <Link href="/lab/billing" className="inline-flex h-10 items-center rounded-[10px] px-5 text-[14px] font-medium text-[var(--ink)] ring-1 ring-[var(--mist)] hover:bg-[var(--cloud)]">
              Portfolio
            </Link>
          </div>
        </header>

        <LiveOnTensora className="ol-rise" />

        <div className="ol-rise ol-rise-1 mt-4">
          <AllowancePanel snap={snap} />
        </div>

        <div className="mt-4 grid items-stretch gap-4 pb-16 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <PriceBoard className="h-full" />
          <Panel title="Usage by model" action={{ href: "/lab/keys", label: "API key" }} className="h-full">
            <ul className="m-0 flex flex-1 list-none flex-col justify-between gap-2.5 p-0">
              {MODEL_MIX.map((m) => (
                <li key={m.label}>
                  <div className="mb-1 flex items-baseline justify-between text-[12px]">
                    <span className="font-medium">{m.label}</span>
                    <span className="font-mono tabular-nums text-[var(--dark-muted)]">{m.pct}%</span>
                  </div>
                  <Bar pct={m.pct} tone={m.label === "Other" ? "muted" : "orange"} />
                </li>
              ))}
            </ul>
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-4">
              <div>
                <div className="text-[11px] text-[var(--dark-muted)]">Listed below face</div>
                <div className="mt-1 font-mono text-[15px] font-medium tabular-nums">{usdCompact(SHOWCASE.inferenceInventoryUsd)}</div>
              </div>
              <div>
                <div className="text-[11px] text-[var(--dark-muted)]">Active keys</div>
                <div className="mt-1 font-mono text-[15px] font-medium tabular-nums">{SHOWCASE.activeKeys}</div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </LabChrome>
  );
}
