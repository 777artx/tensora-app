import Link from "next/link";
import type { ReactNode } from "react";
import {
  AGENT_SPLIT,
  PRICE_BOARD,
  PROVIDER_MIX,
  SHOWCASE,
  compact,
  usdCompact,
} from "@/lib/lab/dashboard-showcase";

export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`lab-dark flex min-w-0 flex-col rounded-[var(--lab-radius-card)] border border-[var(--dark-border)] bg-[var(--dark)] px-5 py-4 text-[var(--dark-fg)] ${className}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="m-0 text-[12px] font-semibold tracking-tight">{title}</h3>
        {action ? (
          <Link href={action.href} className="text-[11px] text-[var(--dark-muted)] hover:text-white">
            {action.label} →
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function Bar({ pct, tone = "orange" }: { pct: number; tone?: "orange" | "muted" }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className={`h-full rounded-full ${tone === "orange" ? "bg-white" : "bg-white/30"}`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

export function PriceBoard({ className = "" }: { className?: string }) {
  return (
    <Panel title="Live prices vs retail" action={{ href: "/lab/market", label: "Market" }} className={className}>
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-[12px]">
          <thead>
            <tr className="text-left text-[10px] font-medium uppercase tracking-wide text-[var(--dark-muted-2)]">
              <th className="px-1 pb-2 font-medium">Item</th>
              <th className="px-1 pb-2 text-right font-medium">Retail</th>
              <th className="px-1 pb-2 text-right font-medium">Olora</th>
              <th className="px-1 pb-2 text-right font-medium">Save</th>
              <th className="px-1 pb-2 text-right font-medium">Available</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {PRICE_BOARD.filter((r) => r.kind === "model").map((r) => {
              const save = ((r.retail - r.tensora) / r.retail) * 100;
              return (
                <tr key={r.item} className="border-t border-white/[0.05]">
                  <td className="px-1 py-2 font-sans">
                    <span className="font-medium">{r.item}</span>{" "}
                    <span className="text-[10px] text-[var(--dark-muted-2)]">{r.unit}</span>
                  </td>
                  <td className="px-1 py-2 text-right text-[var(--dark-muted-2)] line-through decoration-white/20">
                    ${r.retail.toFixed(2)}
                  </td>
                  <td className="px-1 py-2 text-right font-semibold">${r.tensora.toFixed(2)}</td>
                  <td className="px-1 py-2 text-right text-[var(--positive)]">−{save.toFixed(1)}%</td>
                  <td className="px-1 py-2 text-right text-[var(--dark-muted)]">{r.stock}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-[var(--dark-muted)]">{label}</div>
      <div className="mt-1 font-mono text-[17px] font-semibold leading-none tabular-nums">{value}</div>
      {note ? <div className="mt-1 truncate text-[10px] text-[var(--dark-muted-2)]">{note}</div> : null}
    </div>
  );
}

export function MarketDepth() {
  return (
    <Panel title="Available now" action={{ href: "/lab/market", label: "Order book" }}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Stat label="Inference liquidity" value={usdCompact(SHOWCASE.inferenceInventoryUsd)} note="Credits listed below face" />
        <Stat label="Active API keys" value={String(SHOWCASE.activeKeys)} note="Spent credit in 30 days" />
        <Stat label="Models" value={SHOWCASE.modelsListed} note="Frontier + flagship" />
        <Stat label="Labs" value={String(SHOWCASE.providers)} note="Routed via OpenRouter" />
        <Stat label="Fees to holders" value={`${SHOWCASE.feesToPoolPct}%`} note="Daily allowance pool" />
        <Stat label="Success rate" value={`${SHOWCASE.successRate}%`} note={`${SHOWCASE.avgLatencySec}s median latency`} />
      </div>
    </Panel>
  );
}

export function ProviderMix() {
  return (
    <Panel title="Usage by lab" action={{ href: "/lab/keys", label: "API key" }}>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {PROVIDER_MIX.map((p) => (
          <li key={p.label}>
            <div className="mb-1 flex items-baseline justify-between text-[12px]">
              <span>
                <span className="font-medium">{p.label}</span>{" "}
                <span className="text-[10px] text-[var(--dark-muted-2)]">{p.note}</span>
              </span>
              <span className="font-mono tabular-nums text-[var(--dark-muted)]">{p.pct}%</span>
            </div>
            <Bar pct={p.pct} tone={p.label === "Other" ? "muted" : "orange"} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function AgentActivity() {
  const avg = SHOWCASE.agentSpendUsd / SHOWCASE.agentJobs30d;
  return (
    <Panel title="Agent activity" action={{ href: "/lab/activity", label: "Activity" }}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Stat label="Active agents" value={String(SHOWCASE.activeAgents)} note="Paid call in last 30 days" />
        <Stat label="Jobs this month" value={compact(SHOWCASE.agentJobs30d, 1)} />
        <Stat label="Agent spend" value={usdCompact(SHOWCASE.agentSpendUsd)} note="USDC, 30 days" />
        <Stat label="Avg job cost" value={`$${avg.toFixed(2)}`} />
      </div>
      <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full" role="img" aria-label="Agent spend split">
        {AGENT_SPLIT.map((s, i) => (
          <div
            key={s.label}
            className={i === 0 ? "bg-white" : i === 1 ? "bg-white/55" : "bg-white/25"}
            style={{ width: `${s.pct}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-[var(--dark-muted-2)]">
        {AGENT_SPLIT.map((s) => (
          <span key={s.label}>
            {s.label} <span className="font-mono tabular-nums text-[var(--dark-muted)]">{s.pct}%</span>
          </span>
        ))}
      </div>
    </Panel>
  );
}
